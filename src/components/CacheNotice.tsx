import { WifiOff } from 'lucide-react'
import { useI18n } from '../features/i18n/context'
import { formatDateTime } from '../lib/format'

export function CacheNotice({ cachedAt }: { cachedAt: string | null }) {
  const { t } = useI18n()

  if (!cachedAt) return null

  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      {t('offline.cachedAt', { time: formatDateTime(cachedAt) })}
    </div>
  )
}
