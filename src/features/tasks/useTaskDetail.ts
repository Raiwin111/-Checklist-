import { useCallback, useEffect, useState } from 'react'
import {
  fetchTask,
  fetchTaskEvents,
  type TaskWithRelations,
} from '../../lib/api/tasks'
import { getErrorMessage } from '../../lib/errors'
import type { TaskEvent } from '../../types/database'

export function useTaskDetail(taskId: string | undefined) {
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [events, setEvents] = useState<TaskEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    if (!taskId) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    Promise.all([fetchTask(taskId), fetchTaskEvents(taskId)])
      .then(([nextTask, nextEvents]) => {
        if (!active) return
        setTask(nextTask)
        setEvents(nextEvents)
        setLoading(false)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setError(getErrorMessage(loadError))
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [taskId, version])

  return { task, events, loading, error, refresh, setTask }
}
