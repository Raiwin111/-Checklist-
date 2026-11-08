import type { CSSProperties } from 'react'
import type { TaskStatus } from '../../types/database'

const fillStyle: Record<TaskStatus, CSSProperties> = {
  in_progress: {
    background: 'var(--status-live)',
    boxShadow: '0 2px 0 var(--status-live)',
  },
  on_hold: {
    background:
      'repeating-linear-gradient(90deg, var(--status-hold) 0 4px, transparent 4px 8px)',
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

export function ProgressBar({
  value,
  status,
  className = '',
}: {
  value: number
  status?: TaskStatus
  className?: string
}) {
  const safe = Math.min(100, Math.max(0, value))

  return (
    <div
      aria-hidden
      className={`relative h-[2px] w-full bg-rule ${className}`}
    >
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-300"
        style={{
          width: `${safe}%`,
          ...(status ? fillStyle[status] : { background: 'var(--ink)' }),
        }}
      />
    </div>
  )
}
