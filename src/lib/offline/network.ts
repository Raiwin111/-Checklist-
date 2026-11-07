import { useEffect, useState } from 'react'
import { tr } from '../messages'

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/**
 * Read-only offline MVP: reject writes before they reach the network so the
 * user gets a clear message instead of a hang or an opaque fetch error.
 */
export function assertOnline(): void {
  if (!isOnline()) throw new Error(tr('offline.readOnly'))
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(isOnline)

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
    }
    function handleOffline() {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
