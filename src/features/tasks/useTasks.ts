import { useCallback, useEffect, useState } from 'react'
import { fetchTasks, type TaskWithRelations } from '../../lib/api/tasks'
import { getErrorMessage } from '../../lib/errors'

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

    fetchTasks(userId)
      .then((data) => {
        if (!active) return
        setTasks(data)
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
  }, [userId, version])

  return { tasks, setTasks, loading, error, refresh }
}
