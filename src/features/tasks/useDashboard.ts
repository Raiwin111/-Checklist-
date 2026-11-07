import { useCallback, useEffect, useState } from 'react'
import {
  fetchDashboardData,
  type DashboardData,
} from '../../lib/api/tasks'
import { getErrorMessage } from '../../lib/errors'
import { cacheKeys, readCache, writeCache } from '../../lib/offline/cache'
import { useOnlineStatus } from '../../lib/offline/network'
import { tr } from '../../lib/messages'

export function useDashboard(userId: string | undefined) {
  const online = useOnlineStatus()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
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

    function loadFromCache(fallbackError?: unknown) {
      void readCache<DashboardData>(userId!, cacheKeys.dashboard).then(
        (cached) => {
          if (!active) return
          if (cached) {
            setData(cached.data)
            setFromCache(true)
            setCachedAt(cached.cachedAt)
          } else if (fallbackError) {
            setError(getErrorMessage(fallbackError))
          } else {
            setError(tr('offline.noCache'))
          }
          setLoading(false)
        },
      )
    }

    if (!online) {
      loadFromCache()
      return () => {
        active = false
      }
    }

    fetchDashboardData(userId)
      .then((nextData) => {
        if (!active) return
        setData(nextData)
        setFromCache(false)
        setCachedAt(null)
        setLoading(false)
        void writeCache(userId, cacheKeys.dashboard, nextData)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        loadFromCache(loadError)
      })

    return () => {
      active = false
    }
  }, [userId, version, online])

  return { data, loading, error, refresh, fromCache, cachedAt }
}
