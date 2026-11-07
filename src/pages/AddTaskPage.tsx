import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth-context'
import { useCategories } from '../features/tasks/useCategories'
import { TaskForm, type TaskFormValues } from '../features/tasks/TaskForm'
import { createTask } from '../lib/api/tasks'
import { createLocalTask } from '../lib/offline/local'
import { isOnline } from '../lib/offline/network'
import { uploadTaskImage } from '../lib/api/images'
import { logTaskEvent } from '../lib/api/events'
import { useI18n } from '../features/i18n/context'
import { tr } from '../lib/messages'

export function AddTaskPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategories(user?.id)
  const [submitting, setSubmitting] = useState(false)
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null)

  async function handleSubmit(values: TaskFormValues) {
    if (!user) return
    setSubmitting(true)
    setOfflineNotice(null)

    try {
      const task = isOnline()
        ? await createTask(user.id, {
            title: values.title,
            description: values.description,
            categoryId: values.categoryId || null,
            status: values.status,
            progress: values.progress,
          })
        : await createLocalTask(user.id, {
            title: values.title,
            description: values.description,
            categoryId: values.categoryId || null,
            status: values.status,
            progress: values.progress,
          })

      if (!isOnline()) {
        setOfflineNotice(
          tr('offline.createdOffline', {
            title: task.title,
          }),
        )
        navigate('/tasks', { replace: true })
        return
      }

      const failedImages: string[] = []
      let uploadedCount = 0

      for (const file of values.newImages) {
        try {
          await uploadTaskImage(user.id, task.id, file)
          uploadedCount += 1
        } catch (imageError) {
          console.error('Failed to upload image', imageError)
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

      navigate(`/tasks/${task.id}`, {
        replace: true,
        state:
          failedImages.length > 0
            ? {
                warning: t('form.uploadFailed', {
                  names: failedImages.join(', '),
                }),
              }
            : undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('add.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('add.subtitle')}
        </p>
      </div>

      {offlineNotice ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {offlineNotice}
        </div>
      ) : null}

      {categoriesError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {t('add.categoryError', { message: categoriesError })}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {categoriesLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            {t('add.loadingCategories')}
          </div>
        ) : (
          <TaskForm
            categories={categories}
            submitLabel={t('add.save')}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
