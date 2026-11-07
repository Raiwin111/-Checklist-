import { getOfflineDatabase, type SyncQueueItem } from './cache'
import { normalizeStatusProgress } from '../../features/tasks/statusProgress'
import type { Task, TaskStatus } from '../../types/database'

export type LocalTaskInput = {
  title: string
  description?: string | null
  categoryId?: string | null
  status?: TaskStatus
  progress?: number
}

const LOCAL_ID_PREFIX = 'local-'

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX)
}

export async function createLocalTask(
  userId: string,
  input: LocalTaskInput,
): Promise<Task> {
  const db = getOfflineDatabase(userId)
  const normalized = normalizeStatusProgress({
    status: input.status ?? 'not_started',
    progress: input.progress ?? 0,
  })

  const now = new Date().toISOString()
  const localId = `${LOCAL_ID_PREFIX}${crypto.randomUUID()}`

  const newTask: Task = {
    id: localId,
    user_id: userId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category_id: input.categoryId ?? null,
    status: normalized.status,
    progress: normalized.progress,
    created_at: now,
    updated_at: now,
    server_updated_at: now,
    client_updated_at: now,
    revision: 1,
    deleted_at: null,
    last_device_id: null,
  }

  const queueItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    operation: 'create',
    userId,
    taskId: localId,
    payload: {
      title: newTask.title,
      description: newTask.description,
      categoryId: newTask.category_id,
      status: newTask.status,
      progress: newTask.progress,
    },
    createdAt: now,
    attempts: 0,
  }

  await db.transaction('rw', db.localTasks, db.syncQueue, async () => {
    await db.localTasks.put(newTask)
    await db.syncQueue.put(queueItem)
  })

  return newTask
}

export async function updateLocalTask(
  userId: string,
  taskId: string,
  input: Partial<LocalTaskInput>,
): Promise<Task | null> {
  const db = getOfflineDatabase(userId)
  const existing = await db.localTasks.get(taskId)
  if (!existing) return null

  const normalized = normalizeStatusProgress({
    status: input.status ?? existing.status,
    progress: input.progress ?? existing.progress,
  })

  const now = new Date().toISOString()
  const updated: Task = {
    ...existing,
    title: input.title !== undefined ? input.title.trim() : existing.title,
    description:
      input.description !== undefined
        ? input.description?.trim() || null
        : existing.description,
    category_id:
      input.categoryId !== undefined ? input.categoryId : existing.category_id,
    status: normalized.status,
    progress: normalized.progress,
    updated_at: now,
    client_updated_at: now,
    revision: existing.revision + 1,
  }

  const existingCreate = await db.syncQueue
    .where('taskId')
    .equals(taskId)
    .filter((item) => item.operation === 'create')
    .first()
  const existingUpdate = await db.syncQueue
    .where('taskId')
    .equals(taskId)
    .filter((item) => item.operation === 'update')
    .first()

  const queueItem: SyncQueueItem = {
    id: existingCreate?.id ?? existingUpdate?.id ?? crypto.randomUUID(),
    operation: existingCreate ? 'create' : 'update',
    userId,
    taskId,
    payload: existingCreate || existingUpdate
      ? {
          ...(((existingCreate ?? existingUpdate)?.payload as object) ?? {}),
          ...input,
        }
      : input,
    createdAt: existingCreate?.createdAt ?? existingUpdate?.createdAt ?? now,
    attempts: 0,
  }

  await db.transaction('rw', db.localTasks, db.syncQueue, async () => {
    await db.localTasks.put(updated)
    if (existingUpdate && !existingCreate) {
      await db.syncQueue.delete(existingUpdate.id)
    }
    await db.syncQueue.put(queueItem)
  })

  return updated
}

export async function deleteLocalTask(
  userId: string,
  taskId: string,
): Promise<void> {
  const db = getOfflineDatabase(userId)
  const existing = await db.localTasks.get(taskId)
  if (!existing) return

  const now = new Date().toISOString()
  const deleted: Task = {
    ...existing,
    deleted_at: now,
    client_updated_at: now,
    revision: existing.revision + 1,
  }

  const pendingCreate = await db.syncQueue
    .where('taskId')
    .equals(taskId)
    .filter((item) => item.operation === 'create')
    .first()
  const pendingUpdates = await db.syncQueue
    .where('taskId')
    .equals(taskId)
    .filter((item) => item.operation === 'update')
    .toArray()

  const queueItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    operation: 'delete',
    userId,
    taskId,
    payload: {},
    createdAt: now,
    attempts: 0,
  }

  await db.transaction('rw', db.localTasks, db.syncQueue, async () => {
    await db.localTasks.put(deleted)
    if (pendingCreate) {
      await db.syncQueue.delete(pendingCreate.id)
      await db.syncQueue.bulkDelete(pendingUpdates.map((item) => item.id))
      return
    }
    await db.syncQueue.bulkDelete(pendingUpdates.map((item) => item.id))
    await db.syncQueue.put(queueItem)
  })
}

export async function getLocalTasks(userId: string): Promise<Task[]> {
  const db = getOfflineDatabase(userId)
  const tasks = await db.localTasks.toArray()
  return tasks.filter((t) => !t.deleted_at)
}

export async function getPendingSyncCount(userId: string): Promise<number> {
  const db = getOfflineDatabase(userId)
  return db.syncQueue.count()
}
