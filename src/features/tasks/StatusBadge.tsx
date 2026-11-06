import type { TaskStatus } from '../../types/database'
import { statusClasses, statusLabel, statusLabelTh } from '../../lib/format'

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[status]}`}
      title={statusLabel[status]}
    >
      {statusLabelTh[status]}
    </span>
  )
}
