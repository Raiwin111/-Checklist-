import Dexie, { type EntityTable } from 'dexie'

type CacheRow = {
  key: string
  data: unknown
  cachedAt: string
}

class OfflineDatabase extends Dexie {
  snapshots!: EntityTable<CacheRow, 'key'>

  constructor(userId: string) {
    super(`ptrs-offline-${userId}`)
    this.version(1).stores({ snapshots: 'key' })
  }
}

const databases = new Map<string, OfflineDatabase>()

function getDatabase(userId: string): OfflineDatabase {
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
    await getDatabase(userId).snapshots.put({
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
    const row = await getDatabase(userId).snapshots.get(key)
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
