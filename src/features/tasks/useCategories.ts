import { useCallback, useEffect, useState } from 'react'
import { fetchCategories } from '../../lib/api/categories'
import { getErrorMessage } from '../../lib/errors'
import type { Category } from '../../types/database'

export function useCategories(userId: string | undefined) {
  const [categories, setCategories] = useState<Category[]>([])
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

    fetchCategories(userId)
      .then((data) => {
        if (!active) return
        setCategories(data)
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

  return { categories, setCategories, loading, error, refresh }
}
