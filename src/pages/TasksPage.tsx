import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, PlusCircle, Search } from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { useTasks } from '../features/tasks/useTasks'
import { useCategories } from '../features/tasks/useCategories'
import { TaskCard } from '../features/tasks/TaskCard'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CacheNotice } from '../components/CacheNotice'
import {
  softDeleteTask,
  type TaskWithRelations,
} from '../lib/api/tasks'
import { deleteTaskImage } from '../lib/api/images'
import { getErrorMessage } from '../lib/errors'
import { useI18n } from '../features/i18n/context'
import type { TaskStatus } from '../types/database'

const selectClass =
  'rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950'

const STATUS_OPTIONS: TaskStatus[] = [
  'not_started',
  'in_progress',
  'completed',
  'on_hold',
]

export function TasksPage() {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const { tasks, loading, error, refresh, fromCache, cachedAt } = useTasks(
    user?.id,
  )
  const { categories } = useCategories(user?.id)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TaskWithRelations | null>(
    null,
  )
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description ?? '').toLowerCase().includes(query)
      const matchesCategory =
        !categoryFilter || task.category_id === categoryFilter
      const matchesStatus = !statusFilter || task.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [tasks, search, categoryFilter, statusFilter])

  async function handleDelete() {
    if (!deleteTarget || !user) return

    setDeleting(true)
    setActionError(null)

    try {
      await Promise.allSettled(
        deleteTarget.images.map((image) => deleteTaskImage(image)),
      )
      await softDeleteTask(deleteTarget.id, user.id)
      setDeleteTarget(null)
      refresh()
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      {fromCache ? <CacheNotice cachedAt={cachedAt} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('tasks.title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('tasks.subtitle')}
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          to="/tasks/new"
        >
          <PlusCircle className="h-4 w-4" />
          {t('nav.addTask')}
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {actionError}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            placeholder={t('tasks.searchPlaceholder')}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className={selectClass}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="">{t('tasks.allCategories')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {locale === 'th' ? category.name_th : category.name_en}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">{t('tasks.allStatuses')}</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <ListChecks className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-base font-semibold">
            {tasks.length === 0 ? t('tasks.empty') : t('tasks.emptyFiltered')}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {tasks.length === 0
              ? t('tasks.emptyHint')
              : t('tasks.emptyFilteredHint')}
          </p>
          {tasks.length === 0 ? (
            <Link
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              to="/tasks/new"
            >
              <PlusCircle className="h-4 w-4" />
              {t('tasks.addNew')}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        busy={deleting}
        danger
        description={
          deleteTarget
            ? t('tasks.deleteDescription', { title: deleteTarget.title })
            : ''
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        open={deleteTarget !== null}
        title={t('tasks.deleteTitle')}
        confirmLabel={t('tasks.deleteConfirm')}
      />
    </div>
  )
}
