import type { TaskStatus } from '../../types/database'
import { statusClasses } from '../../lib/format'
import { useI18n } from '../i18n/context'

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useI18n()

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  )
}
