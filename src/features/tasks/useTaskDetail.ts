import { useCallback, useEffect, useState } from 'react'
import {
  fetchTask,
  fetchTaskEvents,
  type TaskWithRelations,
} from '../../lib/api/tasks'
import { cacheKeys, readCache, writeCache } from '../../lib/offline/cache'
import { getLocalTasks, isLocalId } from '../../lib/offline/local'
import { useOnlineStatus } from '../../lib/offline/network'
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
      let nextTask: TaskWithRelations | null = null
      let nextEvents: TaskEvent[] = []
      let isFromCache = false
      let cachedTime: string | null = null

      if (online) {
        try {
          const [fetchedTask, fetchedEvents] = await Promise.all([
            fetchTask(taskId!),
            fetchTaskEvents(taskId!),
          ])
          nextTask = fetchedTask
          nextEvents = fetchedEvents
          isFromCache = false

          // Merge with local pending changes if this task has a local version
          const localTasks = await getLocalTasks(userId!)
          const localTask = localTasks.find((t) => t.id === taskId)
          if (localTask && isLocalId(localTask.id)) {
            nextTask = localTask as TaskWithRelations
            setHasPendingChanges(true)
          } else {
            setHasPendingChanges(false)
          }

          void writeCache(userId!, cacheKey, {
            task: nextTask,
            events: nextEvents,
          })
        } catch {
          const cached = await readCache<CachedTaskDetail>(userId!, cacheKey)
          const localTasks = await getLocalTasks(userId!)
          const localTask = localTasks.find((t) => t.id === taskId)

          if (cached) {
            nextTask = cached.data.task
            nextEvents = cached.data.events
            isFromCache = true
            cachedTime = cached.cachedAt
          }
          if (localTask && isLocalId(localTask.id)) {
            nextTask = localTask as TaskWithRelations
            setHasPendingChanges(true)
          } else {
            setHasPendingChanges(false)
          }
        }
      } else {
        const cached = await readCache<CachedTaskDetail>(userId!, cacheKey)
        const localTasks = await getLocalTasks(userId!)
        const localTask = localTasks.find((t) => t.id === taskId)

        if (localTask && isLocalId(localTask.id)) {
          nextTask = localTask as TaskWithRelations
          setHasPendingChanges(true)
        } else if (cached) {
          nextTask = cached.data.task
          nextEvents = cached.data.events
          isFromCache = true
          cachedTime = cached.cachedAt
          setHasPendingChanges(false)
        } else {
          setHasPendingChanges(false)
        }
      }

      if (!active) return
      setTask(nextTask)
      setEvents(nextEvents)
      setFromCache(isFromCache)
      setCachedAt(cachedTime)
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
