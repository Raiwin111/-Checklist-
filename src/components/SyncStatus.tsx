import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../features/auth/auth-context'
import { syncManager, type SyncStatus as SyncState } from '../lib/offline/sync'
import { getPendingSyncCount } from '../lib/offline/local'
import { useQueueChangeRefresh } from '../lib/offline/syncEvents'
import { useI18n } from '../features/i18n/context'

export function SyncStatus() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [status, setStatus] = useState<SyncState>({ kind: 'idle' })
  const [pendingCount, setPendingCount] = useState(0)
  const [tick, setTick] = useState(0)

  const bump = useCallback(() => setTick((value) => value + 1), [])
  useQueueChangeRefresh(bump)

  const handleStatusChange = useCallback((next: SyncState) => {
    setStatus(next)
    setTick((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!user) return
    const unsub = syncManager.onStatusChange(handleStatusChange)
    return unsub
  }, [user, handleStatusChange])

  useEffect(() => {
    if (!user) return
    let active = true
    getPendingSyncCount(user.id).then((count) => {
      if (active) setPendingCount(count)
    })
    return () => {
      active = false
    }
  }, [user, tick])

  const hasConflict = status.kind === 'conflict'
  const isSyncing = status.kind === 'syncing'
  const hasError = status.kind === 'error'

  const label = hasConflict
    ? t('offline.conflictDetected')
    : hasError
      ? t('offline.syncError')
      : isSyncing
        ? t('offline.syncing')
        : pendingCount > 0
          ? t('offline.pendingSync', { count: pendingCount })
          : t('offline.synced')

  const display = hasConflict
    ? t('offline.conflictShort')
    : hasError
      ? t('offline.syncError')
      : isSyncing
        ? t('offline.syncing')
        : pendingCount > 0
          ? t('offline.pendingShort', { count: pendingCount })
          : t('offline.synced')

  const tone = hasConflict || hasError ? 'text-danger' : 'text-status-done'
  const dotTone = hasConflict || hasError ? 'bg-danger' : 'bg-status-done'

  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] ${tone}`}
      title={label}
    >
      <span
        aria-hidden
        className={`inline-block h-[5px] w-[5px] ${
          isSyncing || pendingCount > 0 ? 'animate-pulse' : ''
        } ${dotTone}`}
      />
      <span className="hidden max-w-[12rem] truncate sm:inline">{display}</span>
    </span>
  )
}
