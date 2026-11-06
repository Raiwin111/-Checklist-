import { useCallback, useEffect, useState } from 'react'
import {
  fetchDashboardData,
  type DashboardData,
} from '../../lib/api/tasks'
import { getErrorMessage } from '../../lib/errors'

export function useDashboard(userId: string | undefined) {
  const [data, setData] = useState<DashboardData | null>(null)
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

    fetchDashboardData(userId)
      .then((nextData) => {
        if (!active) return
        setData(nextData)
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

  return { data, loading, error, refresh }
}
