import { getOfflineDatabase, type SyncQueueItem } from './cache'
import type { Task } from '../../types/database'
import {
  createTask,
  updateTask,
  softDeleteTask,
  fetchTask,
} from '../api/tasks'
import { supabase } from '../supabase'

export type SyncResult =
  | { status: 'idle' }
  | { status: 'running' }
  | {
      status: 'completed'
      processed: number
      results: SyncItemResult[]
    }
  | { status: 'error'; error: string }

export type SyncItemResult =
  | {
      status: 'success'
      taskId: string
      operation: 'create' | 'update' | 'delete'
    }
  | { status: 'skipped'; reason: string }
  | { status: 'conflict'; taskId: string; serverTask: Task }
  | { status: 'error'; taskId?: string; error: string }

export class SyncManager {
  private syncInProgress = false
  private listeners: Array<(status: SyncStatus) => void> = []

  onStatusChange(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private emit(status: SyncStatus) {
    for (const listener of this.listeners) {
      try {
        listener(status)
      } catch {
        // listener errors must not break sync
      }
    }
  }

  async startSync(userId: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { status: 'running' }
    }

    this.syncInProgress = true
    this.emit({ kind: 'syncing' })

    try {
      const db = getOfflineDatabase(userId)
      const queuedItems = await db.syncQueue
        .where('userId')
        .equals(userId)
        .sortBy('createdAt')

      if (queuedItems.length === 0) {
        this.emit({ kind: 'idle' })
        return { status: 'idle' }
      }

      const results: SyncItemResult[] = []

      for (const item of queuedItems) {
        try {
          const result = await this.processSyncQueueItem(userId, item)
          results.push(result)
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : String(error)
          console.error(`Failed to process sync queue item ${item.id}:`, error)
          await db.syncQueue.update(item.id, {
            attempts: (item.attempts ?? 0) + 1,
            lastAttemptAt: new Date().toISOString(),
            error: errMsg,
          })
          results.push({
            status: 'error',
            taskId: item.taskId,
            error: errMsg,
          })
        }
      }

      const hasConflict = results.some((r) => r.status === 'conflict')
      const hasError = results.some((r) => r.status === 'error')

      this.emit({
        kind: hasConflict ? 'conflict' : hasError ? 'error' : 'synced',
      } as SyncStatus)

      return {
        status: 'completed',
        processed: queuedItems.length,
        results,
      }
    } catch (fatalError) {
      const errMsg =
        fatalError instanceof Error ? fatalError.message : String(fatalError)
      this.emit({ kind: 'error', error: errMsg })
      return { status: 'error', error: errMsg }
    } finally {
      this.syncInProgress = false
    }
  }

  private async processSyncQueueItem(
    userId: string,
    item: SyncQueueItem,
  ): Promise<SyncItemResult> {
    switch (item.operation) {
      case 'create':
        return await this.processCreateOperation(userId, item)
      case 'update':
        return await this.processUpdateOperation(userId, item)
      case 'delete':
        return await this.processDeleteOperation(userId, item)
      default:
        throw new Error(`Unknown operation: ${item.operation}`)
    }
  }

  private async processCreateOperation(
    userId: string,
    item: SyncQueueItem,
  ): Promise<SyncItemResult> {
    const payload = item.payload as {
      title: string
      description?: string | null
      categoryId?: string | null
      status?: string
      progress?: number
    }

    const newTask = await createTask(userId, {
      title: payload.title,
      description: payload.description ?? '',
      categoryId: payload.categoryId ?? null,
      status: (payload.status ?? 'not_started') as Task['status'],
      progress: payload.progress ?? 0,
    })

    const db = getOfflineDatabase(userId)
    const localTask = await db.localTasks.get(item.taskId ?? '')
    if (localTask) {
      const replaced: Task = {
        ...localTask,
        id: newTask.id,
        server_updated_at: newTask.server_updated_at,
        revision: newTask.revision,
      }
      await db.localTasks.put(replaced)
    }

    await db.syncQueue.delete(item.id)

    return {
      status: 'success',
      taskId: newTask.id,
      operation: 'create',
    }
  }

  private async processUpdateOperation(
    userId: string,
    item: SyncQueueItem,
  ): Promise<SyncItemResult> {
    if (!item.taskId) {
      throw new Error('Update operation missing taskId')
    }

    const db = getOfflineDatabase(userId)
    const localTask = await db.localTasks.get(item.taskId)

    if (!localTask) {
      await db.syncQueue.delete(item.id)
      return { status: 'skipped', reason: 'task-not-found' }
    }

    // Conflict detection: fetch current server state
    const serverTask = await fetchTask(item.taskId)

    if (
      serverTask &&
      (serverTask.revision ?? 0) > (localTask.revision ?? 0)
    ) {
      // Last-write-wins: server wins. Save local (losing) payload as conflict.
      await this.recordConflict(userId, item.taskId, localTask)

      // Overwrite local with server version (LWW)
      await db.localTasks.put(serverTask)
      await db.syncQueue.delete(item.id)

      return { status: 'conflict', taskId: item.taskId, serverTask }
    }

    const payload = item.payload as {
      title?: string
      description?: string | null
      categoryId?: string | null
      status?: string
      progress?: number
    }

    const updatedTask = await updateTask(
      item.taskId,
      userId,
      {
        title: payload.title,
        description: payload.description,
        categoryId: payload.categoryId,
        status: (payload.status ?? localTask.status) as Task['status'],
        progress: payload.progress,
      } as Parameters<typeof updateTask>[2],
      localTask,
    )

    await db.localTasks.put(updatedTask)
    await db.syncQueue.delete(item.id)

    return {
      status: 'success',
      taskId: updatedTask.id,
      operation: 'update',
    }
  }

  private async processDeleteOperation(
    userId: string,
    item: SyncQueueItem,
  ): Promise<SyncItemResult> {
    if (!item.taskId) {
      throw new Error('Delete operation missing taskId')
    }

    const db = getOfflineDatabase(userId)
    const localTask = await db.localTasks.get(item.taskId)

    const serverTask = await fetchTask(item.taskId)

    if (
      serverTask &&
      (serverTask.deleted_at ?? null) === null &&
      (serverTask.revision ?? 0) > (localTask?.revision ?? 0)
    ) {
      await this.recordConflict(userId, item.taskId, localTask ?? null)
      await db.localTasks.put(serverTask)
      await db.syncQueue.delete(item.id)
      return { status: 'conflict', taskId: item.taskId, serverTask }
    }

    const softDeletedTask = await softDeleteTask(item.taskId, userId)

    if (localTask) {
      await db.localTasks.put(softDeletedTask)
    }
    await db.syncQueue.delete(item.id)

    return {
      status: 'success',
      taskId: softDeletedTask.id,
      operation: 'delete',
    }
  }

  private async recordConflict(
    userId: string,
    taskId: string,
    localTask: Task | null,
  ): Promise<void> {
    const { error } = await supabase.from('sync_conflicts').insert({
      user_id: userId,
      task_id: taskId,
      losing_payload: localTask
        ? {
            id: localTask.id,
            title: localTask.title,
            status: localTask.status,
            progress: localTask.progress,
            client_updated_at: localTask.client_updated_at,
            revision: localTask.revision,
          }
        : null,
      resolved_at: null,
    })

    if (error) {
      console.error('Failed to record sync conflict', error)
    }
  }
}

export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'synced' }
  | { kind: 'conflict' }
  | { kind: 'error'; error: string }

export const syncManager = new SyncManager()
