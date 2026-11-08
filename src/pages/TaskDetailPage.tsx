import { useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  Clock3,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { useTaskDetail } from '../features/tasks/useTaskDetail'
import { useCategories } from '../features/tasks/useCategories'
import { TaskForm, type TaskFormValues } from '../features/tasks/TaskForm'
import { StatusBadge } from '../features/tasks/StatusBadge'
import { ProgressBar } from '../features/tasks/ProgressBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CacheNotice } from '../components/CacheNotice'
import {
  updateTask,
  softDeleteTask,
} from '../lib/api/tasks'
import { deleteTaskImage, uploadTaskImage } from '../lib/api/images'
import { deleteTaskEvent, logTaskEvent } from '../lib/api/events'
import { formatDateTime, formatRelative } from '../lib/format'
import { getErrorMessage } from '../lib/errors'
import { describeEvent } from '../features/tasks/eventDetails'
import { useI18n } from '../features/i18n/context'
import { updateLocalTask, deleteLocalTask } from '../lib/offline/local'
import { isOnline } from '../lib/offline/network'
import { tr } from '../lib/messages'
import type { TaskEvent } from '../types/database'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const { task, events, loading, error, refresh, fromCache, cachedAt } =
    useTaskDetail(id, user?.id)
  const { categories } = useCategories(user?.id)

  const [editing, setEditing] = useState(
    () => new URLSearchParams(location.search).get('edit') === '1',
  )
  const [submitting, setSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [eventToDelete, setEventToDelete] = useState<TaskEvent | null>(null)
  const [deletingEvent, setDeletingEvent] = useState(false)

  const warning = (location.state as { warning?: string } | null)?.warning

  async function handleUpdate(values: TaskFormValues) {
    if (!user || !task) return

    setSubmitting(true)
    setActionError(null)

    try {
      if (isOnline()) {
        await updateTask(
          task.id,
          user.id,
          {
            title: values.title,
            description: values.description,
            categoryId: values.categoryId || null,
            status: values.status,
            progress: values.progress,
          },
          task,
        )

        const removedImages = task.images.filter((image) =>
          values.removedImageIds.includes(image.id),
        )
        await Promise.allSettled(
          removedImages.map((image) => deleteTaskImage(image)),
        )
        if (removedImages.length > 0) {
          await logTaskEvent({
            taskId: task.id,
            userId: user.id,
            eventType: 'image_removed',
            payload: { count: removedImages.length },
          })
        }

        let uploadedCount = 0
        const failedImages: string[] = []

        for (const file of values.newImages) {
          try {
            await uploadTaskImage(user.id, task.id, file)
            uploadedCount += 1
          } catch (uploadError) {
            console.error('Failed to upload image', uploadError)
            failedImages.push(file.name)
          }
        }

        if (uploadedCount > 0) {
          await logTaskEvent({
            taskId: task.id,
            userId: user.id,
            eventType: 'image_added',
            payload: { count: uploadedCount },
          })
        }

        if (failedImages.length > 0) {
          setActionError(
            t('form.uploadFailed', { names: failedImages.join(', ') }),
          )
        }

        setEditing(false)
        refresh()
      } else {
        await updateLocalTask(
          user.id,
          task.id,
          {
            title: values.title,
            description: values.description,
            categoryId: values.categoryId || null,
            status: values.status,
            progress: values.progress,
          },
          task,
        )
        setEditing(false)
        setActionError(
          values.newImages.length > 0 || values.removedImageIds.length > 0
            ? t('offline.imagesSkipped', {
                count:
                  values.newImages.length + values.removedImageIds.length,
              })
            : tr('offline.updatedOffline'),
        )
        refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!user || !task) return

    setDeleting(true)
    setActionError(null)

    try {
      if (isOnline()) {
        await Promise.allSettled(
          task.images.map((image) => deleteTaskImage(image)),
        )
        await softDeleteTask(task.id, user.id)
      } else {
        await deleteLocalTask(user.id, task.id, task)
        setActionError(tr('offline.deletedOffline'))
      }
      navigate('/tasks', { replace: true })
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError))
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  async function handleDeleteEvent() {
    if (!eventToDelete) return

    setDeletingEvent(true)
    setActionError(null)

    try {
      await deleteTaskEvent(eventToDelete.id)
      setEventToDelete(null)
      refresh()
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError))
      setEventToDelete(null)
    } finally {
      setDeletingEvent(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
        <Link className="text-sm font-medium text-indigo-600" to="/tasks">
          {t('detail.backToTasks')}
        </Link>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-lg font-semibold">{t('detail.notFound')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('detail.notFoundHint')}
        </p>
        <Link
          className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
          to="/tasks"
        >
          {t('detail.backToTasks')}
        </Link>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <button
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-indigo-600 dark:text-slate-400"
            onClick={() => setEditing(false)}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('detail.backToDetail')}
          </button>
          <h1 className="mt-1 text-2xl font-bold">{t('detail.editTitle')}</h1>
        </div>

        {actionError ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            {actionError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <TaskForm
            key={task.id}
            categories={categories}
            existingImages={task.images}
            initial={{
              title: task.title,
              description: task.description,
              categoryId: task.category_id,
              status: task.status,
              progress: task.progress,
            }}
            submitLabel={t('detail.saveChanges')}
            submitting={submitting}
            onCancel={() => setEditing(false)}
            onSubmit={handleUpdate}
          />
        </div>
      </div>
    )
  }

  const eventDetail = (event: TaskEvent) => describeEvent(event, t)
  const categoryName = task.category
    ? locale === 'th'
      ? task.category.name_th
      : task.category.name_en
    : null

  return (
    <div className="space-y-5">
      {fromCache ? <CacheNotice cachedAt={cachedAt} /> : null}

      {warning ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {warning}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {actionError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-indigo-600 dark:text-slate-400"
            to="/tasks"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('detail.backToTasks')}
          </Link>
          <h1 className="mt-2 text-2xl font-bold break-words">{task.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            {task.category ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: task.category.color }}
                />
                {categoryName}
              </span>
            ) : null}
            <span className="text-xs text-slate-400">
              {t('detail.updatedRelative', {
                time: formatRelative(
                  task.client_updated_at ?? task.updated_at,
                ),
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            onClick={() => setEditing(true)}
            type="button"
          >
            <Pencil className="h-4 w-4" />
            {t('common.edit')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            onClick={() => setDeleteOpen(true)}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold">{t('detail.details')}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {task.description || t('detail.noDescription')}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-sm">
              <h2 className="font-semibold">{t('detail.progress')}</h2>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {task.progress}%
              </span>
            </div>
            <ProgressBar className="mt-3" value={task.progress} />
          </section>

          {task.images.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {t('detail.imagesCount', { count: task.images.length })}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {task.images.map((image) => (
                  <a
                    key={image.id}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                    href={image.signedUrl ?? '#'}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {image.signedUrl ? (
                      <img
                        alt={image.file_name}
                        className="h-36 w-full object-cover transition duration-300 group-hover:scale-105"
                        src={image.signedUrl}
                      />
                    ) : (
                      <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                        {t('common.noPreview')}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              {t('detail.timeline')}
            </h2>

            {events.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                {t('detail.noActivity')}
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {events.map((event) => {
                  const detail = eventDetail(event)
                  return (
                    <li key={event.id} className="flex gap-3">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {t(`event.${event.event_type}`)}
                          </p>
                          {detail ? (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {detail}
                            </p>
                          ) : null}
                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatDateTime(event.created_at)}
                          </p>
                        </div>
                        <button
                          aria-label={t('detail.deleteEventAria')}
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          onClick={() => setEventToDelete(event)}
                          title={t('detail.deleteEventAria')}
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold">{t('detail.info')}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">
                  {t('detail.category')}
                </dt>
                <dd className="mt-0.5">
                  {categoryName ?? t('common.noCategory')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">{t('detail.status')}</dt>
                <dd className="mt-0.5">
                  <StatusBadge status={task.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">
                  {t('detail.createdAt')}
                </dt>
                <dd className="mt-0.5">{formatDateTime(task.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">
                  {t('detail.updatedAt')}
                </dt>
                <dd className="mt-0.5">
                  {formatDateTime(task.client_updated_at ?? task.updated_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">
                  {t('detail.imageCount')}
                </dt>
                <dd className="mt-0.5">
                  {t('detail.imageUnit', { count: task.images.length })}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        busy={deletingEvent}
        danger
        confirmLabel={t('detail.deleteEvent')}
        description={t('detail.deleteEventDescription')}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => void handleDeleteEvent()}
        open={eventToDelete !== null}
        title={t('detail.deleteEventTitle')}
      />

      <ConfirmDialog
        busy={deleting}
        danger
        confirmLabel={t('tasks.deleteConfirm')}
        description={t('detail.deleteDescription', { title: task.title })}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        open={deleteOpen}
        title={t('detail.deleteTitle')}
      />
    </div>
  )
}
