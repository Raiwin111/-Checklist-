import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { syncManager, type SyncStatus } from '../lib/offline/sync'
import { getPendingSyncCount } from '../lib/offline/local'
import { useI18n } from '../features/i18n/context'

export function SyncStatus() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [status, setStatus] = useState<SyncStatus>({ kind: 'idle' })
  const [pendingCount, setPendingCount] = useState(0)

  const handleStatusChange = useCallback((next: SyncStatus) => {
    setStatus(next)
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
  }, [user])

  const hasConflict = status.kind === 'conflict'
  const isSyncing = status.kind === 'syncing'
  const hasError = status.kind === 'error'

  let base =
    'fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-opacity duration-300'

  if (hasConflict || pendingCount > 0) {
    base += ' bg-amber-50 text-amber-800 border border-amber-200'
  } else if (!hasConflict && pendingCount === 0 && !isSyncing && !hasError) {
    base += ' bg-emerald-50 text-emerald-700 border border-emerald-200'
  } else if (isSyncing) {
    base += ' bg-blue-50 text-blue-700 border border-blue-200'
  } else if (hasError) {
    base += ' bg-red-50 text-red-700 border border-red-200'
  }

  return (
    <div className={base}>
      {isSyncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : hasConflict ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : pendingCount > 0 ? (
        <Loader2 className="h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      <span>
        {hasConflict
          ? t('offline.conflictDetected')
          : isSyncing
            ? t('offline.syncing')
            : pendingCount > 0
              ? t('offline.pendingSync', { count: pendingCount })
              : t('offline.synced')}
      </span>
    </div>
  )
}
