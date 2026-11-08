import { Link } from 'react-router-dom'
import { ImageIcon, Pencil, Trash2 } from 'lucide-react'
import { formatRelative } from '../../lib/format'
import type { TaskWithRelations } from '../../lib/api/tasks'
import { ProgressBar } from './ProgressBar'
import { StatusBadge } from './StatusBadge'
import { useI18n } from '../i18n/context'

export function TaskCard({
  task,
  onDelete,
}: {
  task: TaskWithRelations
  onDelete?: (task: TaskWithRelations) => void
}) {
  const { t, locale } = useI18n()
  const categoryName = task.category
    ? locale === 'th'
      ? task.category.name_th
      : task.category.name_en
    : t('common.noCategory')

  return (
    <article className="relative border-b border-rule-soft">
      <span
        aria-hidden
        className="absolute -left-4 top-1/2 hidden h-px w-3 bg-rule lg:block"
      />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2.5 py-4 lg:grid-cols-[minmax(0,1fr)_96px_140px_108px] lg:items-center lg:gap-5">
        <div className="min-w-0">
          <Link
            className="block truncate text-[15px] font-medium text-ink transition hover:text-signal"
            to={`/tasks/${task.id}`}
          >
            {task.title}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-dim">
            <span className="inline-flex items-center gap-1.5">
              {task.category ? (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5"
                  style={{ backgroundColor: task.category.color }}
                />
              ) : null}
              {categoryName}
            </span>
            <span aria-hidden>·</span>
            <span>
              {formatRelative(task.client_updated_at ?? task.updated_at)}
            </span>
            {task.images.length > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {task.images.length}
                </span>
              </>
            ) : null}
          </p>
          {task.description ? (
            <p className="mt-1 line-clamp-1 text-[12px] text-muted">
              {task.description}
            </p>
          ) : null}
        </div>

        <p className="hidden truncate text-[9px] uppercase tracking-[0.14em] text-muted lg:block">
          {categoryName}
        </p>

        <div className="col-span-2 lg:col-span-1">
          <ProgressBar status={task.status} value={task.progress} />
        </div>

        <div className="flex flex-col items-end gap-1.5 lg:flex-col lg:items-end lg:gap-1.5">
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] tabular-nums text-muted">
              {task.progress}%
            </span>
            <StatusBadge status={task.status} />
          </div>

          {onDelete ? (
            <div className="flex items-center gap-1">
              <Link
                aria-label={t('common.edit')}
                className="inline-flex h-11 w-11 items-center justify-center text-dim transition hover:text-ink lg:h-8 lg:w-8"
                to={`/tasks/${task.id}?edit=1`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
              <button
                aria-label={t('common.delete')}
                className="inline-flex h-11 w-11 items-center justify-center text-dim transition hover:text-danger lg:h-8 lg:w-8"
                onClick={() => onDelete(task)}
                title={t('common.delete')}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
