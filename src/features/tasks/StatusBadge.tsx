import type { CSSProperties } from 'react'
import type { TaskStatus } from '../../types/database'
import { statusTextClass } from '../../lib/format'
import { useI18n } from '../i18n/context'

const glyphStyle: Record<TaskStatus, CSSProperties> = {
  in_progress: {
    background: 'var(--status-live)',
    boxShadow: '0 2px 0 var(--status-live)',
  },
  on_hold: {
    background:
      'repeating-linear-gradient(90deg, var(--status-hold) 0 3px, transparent 3px 6px)',
  },
  completed: {
    background: 'var(--status-done)',
    opacity: 0.62,
  },
  not_started: {
    background:
      'repeating-linear-gradient(90deg, var(--status-todo) 0 1px, transparent 1px 4px)',
  },
}

export function StatusBadge({
  status,
  className = '',
}: {
  status: TaskStatus
  className?: string
}) {
  const { t } = useI18n()

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.14em] ${statusTextClass[status]} ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-[2px] w-5"
        style={glyphStyle[status]}
      />
      {t(`status.${status}`)}
    </span>
  )
}
