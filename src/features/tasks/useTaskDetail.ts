import { useCallback, useEffect, useState } from 'react'
import {
  fetchTask,
  fetchTaskEvents,
  type TaskWithRelations,
} from '../../lib/api/tasks'
import { getErrorMessage } from '../../lib/errors'
import { cacheKeys, readCache, writeCache } from '../../lib/offline/cache'
import { useOnlineStatus } from '../../lib/offline/network'
import { tr } from '../../lib/messages'
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

    function applyCache(cached: { data: CachedTaskDetail; cachedAt: string }) {
      setTask(cached.data.task)
      setEvents(cached.data.events)
      setFromCache(true)
      setCachedAt(cached.cachedAt)
    }

    function loadFromCache(fallbackError?: unknown) {
      void readCache<CachedTaskDetail>(userId!, cacheKey).then((cached) => {
        if (!active) return
        if (cached) {
          applyCache(cached)
        } else if (fallbackError) {
          setError(getErrorMessage(fallbackError))
        } else {
          setError(tr('offline.noCache'))
        }
        setLoading(false)
      })
    }

    if (!online) {
      loadFromCache()
      return () => {
        active = false
      }
    }

    Promise.all([fetchTask(taskId), fetchTaskEvents(taskId)])
      .then(([nextTask, nextEvents]) => {
        if (!active) return
        setTask(nextTask)
        setEvents(nextEvents)
        setFromCache(false)
        setCachedAt(null)
        setLoading(false)
        void writeCache(userId, cacheKey, {
          task: nextTask,
          events: nextEvents,
        })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        loadFromCache(loadError)
      })

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
  }
}
