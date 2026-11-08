import { WifiOff } from 'lucide-react'
import { useI18n } from '../features/i18n/context'
import { formatDateTime } from '../lib/format'

export function CacheNotice({ cachedAt }: { cachedAt: string | null }) {
  const { t } = useI18n()

  if (!cachedAt) return null

  return (
    <p className="flex items-start gap-2 border-l border-warning bg-warning/10 px-3 py-2 text-[11px] text-warning">
      <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {t('offline.cachedAt', { time: formatDateTime(cachedAt) })}
    </p>
  )
}
