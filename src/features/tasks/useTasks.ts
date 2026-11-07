import { useCallback, useEffect, useState } from 'react'
import { fetchTasks, type TaskWithRelations } from '../../lib/api/tasks'
import { cacheKeys, readCache, writeCache } from '../../lib/offline/cache'
import { getLocalTasks, isLocalId } from '../../lib/offline/local'
import { useOnlineStatus } from '../../lib/offline/network'

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

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    async function load() {
      let displayTasks: TaskWithRelations[] = []
      let isFromCache = false
      let cachedTime: string | null = null

      if (online) {
        try {
          const remote = await fetchTasks(userId!)
          const local = await getLocalTasks(userId!)
          const remoteIds = new Set(remote.map((t) => t.id))
          const pending = local.filter(
            (t) => isLocalId(t.id) && !remoteIds.has(t.id),
          )
          displayTasks = [...remote, ...pending] as TaskWithRelations[]
          isFromCache = false
          void writeCache(userId!, cacheKeys.tasks, remote)
        } catch {
          const cached = await readCache<TaskWithRelations[]>(
            userId!,
            cacheKeys.tasks,
          )
          const local = await getLocalTasks(userId!)
          displayTasks = [
            ...(cached?.data ?? []),
            ...local.filter((t) => isLocalId(t.id)),
          ] as TaskWithRelations[]
          isFromCache = true
          cachedTime = cached?.cachedAt ?? null
        }
      } else {
        const cached = await readCache<TaskWithRelations[]>(
          userId!,
          cacheKeys.tasks,
        )
        const local = await getLocalTasks(userId!)
        displayTasks = [
          ...(cached?.data ?? []),
          ...local.filter((t) => isLocalId(t.id)),
        ] as TaskWithRelations[]
        isFromCache = true
        cachedTime = cached?.cachedAt ?? null
      }

      if (!active) return
      setTasks(displayTasks)
      setFromCache(isFromCache)
      setCachedAt(cachedTime)
      setHasPendingChanges(displayTasks.some((t) => isLocalId(t.id)))
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
