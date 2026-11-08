import { useCallback, useEffect, useState } from 'react'
import { fetchTasks, type TaskWithRelations } from '../../lib/api/tasks'
import { cacheKeys, readCache, writeCache } from '../../lib/offline/cache'
import { getAllLocalTasks, getPendingTaskIds } from '../../lib/offline/local'
import { mergeTaskLists } from '../../lib/offline/merge'
import { useOnlineStatus } from '../../lib/offline/network'
import { useSyncCompleteRefresh } from '../../lib/offline/syncEvents'

export function useTasks(userId: string | undefined) {
  const online = useOnlineStatus()
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  useSyncCompleteRefresh(refresh)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    async function load() {
      const localTasks = await getAllLocalTasks(userId!)
      const pendingIds = await getPendingTaskIds(userId!)

      let base: TaskWithRelations[] = []
      let isFromCache = false
      let cachedTime: string | null = null

      if (online) {
        try {
          base = await fetchTasks(userId!)
          void writeCache(userId!, cacheKeys.tasks, base)
        } catch {
          const cached = await readCache<TaskWithRelations[]>(
            userId!,
            cacheKeys.tasks,
          )
          base = cached?.data ?? []
          isFromCache = true
          cachedTime = cached?.cachedAt ?? null
        }
      } else {
        const cached = await readCache<TaskWithRelations[]>(
          userId!,
          cacheKeys.tasks,
        )
        base = cached?.data ?? []
        isFromCache = true
        cachedTime = cached?.cachedAt ?? null
      }

      // Offline the cache is always older than the local table, so every
      // local row wins. Online only pending edits should override the server.
      const { tasks: displayTasks, pendingCount } = mergeTaskLists(
        base,
        localTasks,
        pendingIds,
        { overrideAll: !online || isFromCache },
      )

      if (!active) return
      setTasks(displayTasks)
      setFromCache(isFromCache)
      setCachedAt(cachedTime)
      setHasPendingChanges(pendingCount > 0)
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [userId, version, online])

  return {
    tasks,
    setTasks,
    loading,
    error,
    refresh,
    fromCache,
    cachedAt,
    hasPendingChanges,
  }
}
