import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { useCategories } from '../features/tasks/useCategories'
import { TaskForm, type TaskFormValues } from '../features/tasks/TaskForm'
import { createTask } from '../lib/api/tasks'
import { createLocalTask } from '../lib/offline/local'
import { isOnline } from '../lib/offline/network'
import { uploadTaskImage } from '../lib/api/images'
import { logTaskEvent } from '../lib/api/events'
import { useI18n } from '../features/i18n/context'
import { errorBox, pageLead, pageTitle } from '../lib/ui'

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

  async function handleSubmit(values: TaskFormValues) {
    if (!user) return
    setSubmitting(true)

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
        const skippedImages = values.newImages.length
        navigate(`/tasks/${task.id}`, {
          replace: true,
          state:
            skippedImages > 0
              ? {
                  warning: t('offline.imagesSkipped', {
                    count: skippedImages,
                  }),
                }
              : undefined,
        })
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
    <div className="mx-auto max-w-2xl space-y-7">
      <header className="border-b border-rule pb-6">
        <h1 className={pageTitle}>{t('add.title')}</h1>
        <p className={pageLead}>{t('add.subtitle')}</p>
      </header>

      {categoriesError ? (
        <p className={errorBox}>
          {t('add.categoryError', { message: categoriesError })}
        </p>
      ) : null}

      {categoriesLoading ? (
        <p className="flex items-center gap-2 text-[12px] text-dim">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('add.loadingCategories')}
        </p>
      ) : (
        <TaskForm
          categories={categories}
          submitLabel={t('add.save')}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
