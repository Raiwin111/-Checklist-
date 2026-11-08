import { useEffect } from 'react'

const SYNC_COMPLETE_EVENT = 'ptrs:sync-complete'
const QUEUE_CHANGED_EVENT = 'ptrs:queue-changed'

/** Informs mounted data hooks that the offline queue has been flushed. */
export function notifySyncComplete(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SYNC_COMPLETE_EVENT))
}

/** Informs listeners that a local write added or removed queue items. */
export function notifyQueueChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT))
}

function useWindowEvent(event: string, refresh: () => void): void {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = () => refresh()
    window.addEventListener(event, handler)
    return () => window.removeEventListener(event, handler)
  }, [event, refresh])
}

/** Re-runs the given refresh callback whenever a sync finishes. */
export function useSyncCompleteRefresh(refresh: () => void): void {
  useWindowEvent(SYNC_COMPLETE_EVENT, refresh)
}

/** Re-runs the given refresh callback whenever the offline queue changes. */
export function useQueueChangeRefresh(refresh: () => void): void {
  useWindowEvent(QUEUE_CHANGED_EVENT, refresh)
}
