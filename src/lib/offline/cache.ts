import Dexie, { type EntityTable } from 'dexie'
import type { Task } from '../../types/database'

type CacheRow = {
  key: string
  data: unknown
  cachedAt: string
}

export type SyncQueueItem = {
  id: string
  operation: 'create' | 'update' | 'delete'
  userId: string
  taskId?: string
  payload: unknown
  createdAt: string
  attempts: number
  /**
   * Server revision the edit was based on. If the server revision has moved
   * past this value when the queue is replayed, another device edited first.
   */
  baseRevision?: number
  lastAttemptAt?: string
  error?: string
}

class OfflineDatabase extends Dexie {
  snapshots!: EntityTable<CacheRow, 'key'>
  localTasks!: EntityTable<Task, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>

  constructor(userId: string) {
    super(`ptrs-offline-${userId}`)
    this.version(2).stores({
      snapshots: 'key',
      localTasks: 'id, user_id, status, category_id, server_updated_at',
      syncQueue: 'id, userId, operation, createdAt',
    })
    // v3 adds the taskId index used to coalesce queued edits per task.
    this.version(3).stores({
      snapshots: 'key',
      localTasks: 'id, user_id, status, category_id, server_updated_at',
      syncQueue: 'id, userId, taskId, operation, createdAt',
    })
  }
}

const databases = new Map<string, OfflineDatabase>()

export function getOfflineDatabase(userId: string): OfflineDatabase {
  const existing = databases.get(userId)
  if (existing) return existing

  const database = new OfflineDatabase(userId)
  databases.set(userId, database)
  return database
}

export const cacheKeys = {
  tasks: 'tasks',
  categories: 'categories',
  dashboard: 'dashboard',
  taskDetail: (taskId: string) => `task-detail:${taskId}`,
} as const

export type CachedValue<T> = {
  data: T
  cachedAt: string
}

/** Best-effort write: caching must never break the online flow. */
export async function writeCache<T>(
  userId: string,
  key: string,
  data: T,
): Promise<void> {
  try {
    await getOfflineDatabase(userId).snapshots.put({
      key,
      data,
      cachedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to write offline cache', error)
  }
}

export async function readCache<T>(
  userId: string,
  key: string,
): Promise<CachedValue<T> | null> {
  try {
    const row = await getOfflineDatabase(userId).snapshots.get(key)
    if (!row) return null

    return { data: row.data as T, cachedAt: row.cachedAt }
  } catch (error) {
    console.error('Failed to read offline cache', error)
    return null
  }
}

/** Drops every cached snapshot for a user (sign-out / account deletion). */
export async function deleteUserCache(userId: string): Promise<void> {
  const database = databases.get(userId) ?? new OfflineDatabase(userId)
  databases.delete(userId)

  try {
    await database.delete()
  } catch (error) {
    console.error('Failed to delete offline cache', error)
  }
}
