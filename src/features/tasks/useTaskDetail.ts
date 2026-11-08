import { useCallback, useEffect, useState } from 'react'
import {
  fetchTask,
  fetchTaskEvents,
  type TaskWithRelations,
} from '../../lib/api/tasks'
import { cacheKeys, readCache, writeCache } from '../../lib/offline/cache'
import { getLocalTask, getPendingTaskIds } from '../../lib/offline/local'
import { toTaskWithRelations } from '../../lib/offline/merge'
import { useOnlineStatus } from '../../lib/offline/network'
import { useSyncCompleteRefresh } from '../../lib/offline/syncEvents'
import type { TaskEvent } from '../../types/database'

type CachedTaskDetail = {
  task: TaskWithRelations | null
  events: TaskEvent[]
}

export function useTaskDetail(
  taskId: string | undefined,
  userId: string | undefined,
) {
  const online = useOnlineStatus()
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [events, setEvents] = useState<TaskEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  useSyncCompleteRefresh(refresh)

  useEffect(() => {
    if (!taskId || !userId) {
      setLoading(false)
      return
    }

    let active = true
    const cacheKey = cacheKeys.taskDetail(taskId)
    setLoading(true)
    setError(null)

    async function load() {
      const localTask = await getLocalTask(userId!, taskId!)
      const pending = (await getPendingTaskIds(userId!)).has(taskId!)
      const locallyDeleted = Boolean(localTask?.deleted_at) && pending

      let nextTask: TaskWithRelations | null = null
      let nextEvents: TaskEvent[] = []
      let isFromCache = false
      let cachedTime: string | null = null
      let pendingChanges = pending && Boolean(localTask)

      if (online) {
        try {
          const [fetchedTask, fetchedEvents] = await Promise.all([
            fetchTask(taskId!),
            fetchTaskEvents(taskId!),
          ])
          nextEvents = fetchedEvents

          if (locallyDeleted) {
            nextTask = null
          } else if (pending && localTask) {
            nextTask = toTaskWithRelations(localTask, fetchedTask)
          } else {
            nextTask = fetchedTask
          }
        } catch {
          const cached = await readCache<CachedTaskDetail>(userId!, cacheKey)
          if (cached) {
            nextEvents = cached.data.events
            isFromCache = true
            cachedTime = cached.cachedAt
          }
          nextTask = locallyDeleted
            ? null
            : localTask
              ? toTaskWithRelations(localTask, cached?.data.task ?? null)
              : (cached?.data.task ?? null)
        }
      } else {
        const cached = await readCache<CachedTaskDetail>(userId!, cacheKey)
        if (cached) {
          nextEvents = cached.data.events
          isFromCache = true
          cachedTime = cached.cachedAt
        }
        nextTask = locallyDeleted
          ? null
          : localTask
            ? toTaskWithRelations(localTask, cached?.data.task ?? null)
            : (cached?.data.task ?? null)
        pendingChanges = pending
      }

      if (online && !isFromCache && nextTask) {
        void writeCache(userId!, cacheKey, {
          task: nextTask,
          events: nextEvents,
        })
      }

      if (!active) return
      setTask(nextTask)
      setEvents(nextEvents)
      setFromCache(isFromCache)
      setCachedAt(cachedTime)
      setHasPendingChanges(pendingChanges)
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [taskId, userId, version, online])

  return {
    task,
    events,
    loading,
    error,
    refresh,
    setTask,
    fromCache,
    cachedAt,
    hasPendingChanges,
  }
}
