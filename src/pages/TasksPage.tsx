import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, Plus, Search } from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { useTasks } from '../features/tasks/useTasks'
import { useCategories } from '../features/tasks/useCategories'
import { TaskCard } from '../features/tasks/TaskCard'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CacheNotice } from '../components/CacheNotice'
import { softDeleteTask, type TaskWithRelations } from '../lib/api/tasks'
import { deleteTaskImage } from '../lib/api/images'
import { getErrorMessage } from '../lib/errors'
import { deleteLocalTask } from '../lib/offline/local'
import { isOnline } from '../lib/offline/network'
import { tr } from '../lib/messages'
import { useI18n } from '../features/i18n/context'
import type { TaskStatus } from '../types/database'
import {
  btnPrimary,
  errorBox,
  fieldLine,
  pageLead,
  pageTitle,
} from '../lib/ui'

const STATUS_OPTIONS: TaskStatus[] = [
  'not_started',
  'in_progress',
  'completed',
  'on_hold',
]

const filterField =
  'min-h-11 w-full border-0 border-b border-rule bg-transparent px-0 py-2 text-[12px] text-ink outline-none transition-colors focus:border-signal'

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
      if (isOnline()) {
        await Promise.allSettled(
          deleteTarget.images.map((image) => deleteTaskImage(image)),
        )
        await softDeleteTask(deleteTarget.id, user.id)
      } else {
        await deleteLocalTask(user.id, deleteTarget.id, deleteTarget)
        setActionError(tr('offline.deletedOffline'))
      }
      setDeleteTarget(null)
      refresh()
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {fromCache ? <CacheNotice cachedAt={cachedAt} /> : null}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className={pageTitle}>{t('tasks.title')}</h1>
          <p className={pageLead}>{t('tasks.subtitle')}</p>
        </div>
        <Link className={`${btnPrimary} hidden sm:inline-flex`} to="/tasks/new">
          <Plus className="h-4 w-4" />
          {t('tasks.add')}
        </Link>
      </header>

      {error ? <p className={errorBox}>{error}</p> : null}
      {actionError ? <p className={errorBox}>{actionError}</p> : null}

      <section aria-label={t('tasks.filters')}>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_170px] sm:gap-4">
          <div>
            <label className="sr-only" htmlFor="task-search">
              {t('tasks.searchPlaceholder')}
            </label>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
              />
              <input
                id="task-search"
                className={`${fieldLine} pl-6`}
                placeholder={t('tasks.searchPlaceholder')}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="sr-only" htmlFor="category-filter">
              {t('tasks.allCategories')}
            </label>
            <select
              id="category-filter"
              className={filterField}
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
          </div>

          <div>
            <label className="sr-only" htmlFor="status-filter">
              {t('tasks.allStatuses')}
            </label>
            <select
              id="status-filter"
              className={filterField}
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
        </div>

        <p className="mt-4 text-[9px] uppercase tracking-[0.16em] text-dim">
          {t('tasks.count', { count: filteredTasks.length })}
        </p>
      </section>

      {loading ? (
        <div className="space-y-3 border-t border-rule pt-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-rule-soft py-4"
            >
              <div className="h-3 flex-1 animate-pulse bg-plate-2" />
              <div className="h-[2px] w-32 animate-pulse bg-plate-2" />
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="border-y border-rule py-16 text-center">
          <div
            aria-hidden
            className="mx-auto flex h-10 w-10 items-center justify-center border border-rule text-dim"
          >
            <ListChecks className="h-4 w-4" />
          </div>
          <h2 className="mt-4 text-[15px] font-medium">
            {tasks.length === 0 ? t('tasks.empty') : t('tasks.emptyFiltered')}
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            {tasks.length === 0
              ? t('tasks.emptyHint')
              : t('tasks.emptyFilteredHint')}
          </p>
          {tasks.length === 0 ? (
            <Link className={`${btnPrimary} mt-5`} to="/tasks/new">
              <Plus className="h-4 w-4" />
              {t('tasks.addNew')}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="lg:border-l lg:border-rule lg:pl-4">
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
        confirmLabel={t('tasks.deleteConfirm')}
        description={
          deleteTarget
            ? t('tasks.deleteDescription', { title: deleteTarget.title })
            : ''
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        open={deleteTarget !== null}
        title={t('tasks.deleteTitle')}
      />
    </div>
  )
}
