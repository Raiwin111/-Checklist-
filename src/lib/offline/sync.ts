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

      if (hasConflict) {
        this.emit({ kind: 'conflict' })
      } else if (hasError) {
        const firstError = results.find((r) => r.status === 'error')
        this.emit({
          kind: 'error',
          error:
            firstError?.status === 'error'
              ? firstError.error
              : 'sync-failed',
        })
      } else {
        this.emit({ kind: 'synced' })
      }

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

  /**
   * True when the server moved past the revision this edit was based on,
   * i.e. another device wrote the same task while this one was offline.
   */
  private hasRevisionConflict(
    item: SyncQueueItem,
    serverTask: Task,
    localTask: Task,
  ): boolean {
    const serverRevision = serverTask.revision ?? 0
    const baseRevision = item.baseRevision
    if (baseRevision !== undefined) {
      return serverRevision > baseRevision
    }
    // Legacy queue items created before baseRevision existed.
    return serverRevision > (localTask.revision ?? 0)
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

    // Swap the local placeholder id for the server id, removing the old row
    // so the task cannot appear twice in the list.
    await db.transaction('rw', db.localTasks, db.syncQueue, async () => {
      const localTask = await db.localTasks.get(item.taskId ?? '')
      if (localTask) {
        await db.localTasks.put({
          ...localTask,
          id: newTask.id,
          server_updated_at: newTask.server_updated_at,
          client_updated_at: newTask.client_updated_at,
          revision: newTask.revision,
          deleted_at: newTask.deleted_at,
        })
        if (item.taskId && item.taskId !== newTask.id) {
          await db.localTasks.delete(item.taskId)
        }
      }
      await db.syncQueue.delete(item.id)
    })

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

    const serverTask = await fetchTask(item.taskId)

    if (!serverTask) {
      // Deleted on another device while this edit waited in the queue.
      await db.syncQueue.delete(item.id)
      return { status: 'skipped', reason: 'task-deleted-on-server' }
    }

    if (this.hasRevisionConflict(item, serverTask, localTask)) {
      // Last-write-wins: the server copy wins. Keep the losing local copy as
      // a conflict snapshot so nothing is silently lost.
      await this.recordConflict(userId, item.taskId, localTask)
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
      },
      serverTask,
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

    if (!serverTask) {
      // Already deleted on the server (or never made it there).
      await db.syncQueue.delete(item.id)
      if (localTask) {
        await db.localTasks.put({
          ...localTask,
          deleted_at: localTask.deleted_at ?? new Date().toISOString(),
        })
      }
      return {
        status: 'success',
        taskId: item.taskId,
        operation: 'delete',
      }
    }

    if (this.hasRevisionConflict(item, serverTask, localTask ?? serverTask)) {
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
            description: localTask.description,
            category_id: localTask.category_id,
            status: localTask.status,
            progress: localTask.progress,
            client_updated_at: localTask.client_updated_at,
            revision: localTask.revision,
          }
        : {},
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
