import { useCallback, useEffect, useState } from 'react'
import { fetchCategories } from '../../lib/api/categories'
import { getErrorMessage } from '../../lib/errors'
import { cacheKeys, readCache, writeCache } from '../../lib/offline/cache'
import { useOnlineStatus } from '../../lib/offline/network'
import { tr } from '../../lib/messages'
import type { Category } from '../../types/database'

export function useCategories(userId: string | undefined) {
  const online = useOnlineStatus()
  const [categories, setCategories] = useState<Category[]>([])
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
      void readCache<Category[]>(userId!, cacheKeys.categories).then(
        (cached) => {
          if (!active) return
          if (cached) {
            setCategories(cached.data)
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

    fetchCategories(userId)
      .then((data) => {
        if (!active) return
        setCategories(data)
        setFromCache(false)
        setCachedAt(null)
        setLoading(false)
        void writeCache(userId, cacheKeys.categories, data)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        loadFromCache(loadError)
      })

    return () => {
      active = false
    }
  }, [userId, version, online])

  return {
    categories,
    setCategories,
    loading,
    error,
    refresh,
    fromCache,
    cachedAt,
  }
}
