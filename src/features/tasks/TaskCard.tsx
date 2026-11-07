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
  onDelete: (task: TaskWithRelations) => void
}) {
  const { t, locale } = useI18n()
  const categoryName = task.category
    ? locale === 'th'
      ? task.category.name_th
      : task.category.name_en
    : null

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {task.category ? (
              <>
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: task.category.color }}
                />
                <span className="truncate">{categoryName}</span>
              </>
            ) : (
              <span>{t('common.noCategory')}</span>
            )}
          </div>

          <Link
            className="mt-1 block truncate text-base font-semibold transition hover:text-indigo-600 dark:hover:text-indigo-400"
            to={`/tasks/${task.id}`}
          >
            {task.title}
          </Link>

          {task.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {task.description}
            </p>
          ) : null}
        </div>

        <StatusBadge status={task.status} />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{t('card.progress')}</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {task.progress}%
          </span>
        </div>
        <ProgressBar value={task.progress} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>{formatRelative(task.client_updated_at ?? task.updated_at)}</span>
          {task.images.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              {task.images.length}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <Link
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-medium text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            to={`/tasks/${task.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t('common.edit')}
          </Link>
          <button
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            onClick={() => onDelete(task)}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('common.delete')}
          </button>
        </div>
      </div>
    </article>
  )
}
