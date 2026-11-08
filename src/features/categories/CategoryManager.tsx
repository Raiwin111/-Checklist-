import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Briefcase,
  FolderKanban,
  Loader2,
  Microscope,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { Category } from '../../types/database'
import {
  countTasksInCategory,
  createCategory,
  deleteCategory,
  reassignTasks,
  updateCategory,
} from '../../lib/api/categories'
import { getErrorMessage } from '../../lib/errors'
import { Modal } from '../../components/Modal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useCategories } from '../tasks/useCategories'
import { useI18n } from '../i18n/context'
import type { TranslationKey } from '../i18n/dictionary'
import {
  btnPrimary,
  btnSecondary,
  errorBox,
  fieldLine,
  label,
} from '../../lib/ui'

const ICON_OPTIONS: Array<{
  value: string
  labelKey: TranslationKey
  Icon: typeof FolderKanban
}> = [
  { value: 'folder', labelKey: 'icon.folder', Icon: FolderKanban },
  { value: 'book-open', labelKey: 'icon.book', Icon: BookOpen },
  { value: 'microscope', labelKey: 'icon.research', Icon: Microscope },
  { value: 'briefcase', labelKey: 'icon.work', Icon: Briefcase },
  { value: 'palette', labelKey: 'icon.creative', Icon: Palette },
]

const COLOR_OPTIONS = [
  '#f4c542',
  '#8fbf6a',
  '#5fb8d6',
  '#d06a4e',
  '#c9a227',
  '#7f9d5a',
  '#4f8fa8',
  '#a8823f',
]

type CategoryFormValues = {
  nameTh: string
  nameEn: string
  color: string
  icon: string
}

function categoryIcon(icon: string) {
  return ICON_OPTIONS.find((option) => option.value === icon)?.Icon ?? FolderKanban
}

function CategoryFormModal({
  open,
  initial,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  initial: Category | null
  submitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: CategoryFormValues) => void
}) {
  const { t } = useI18n()
  const [nameTh, setNameTh] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [icon, setIcon] = useState('folder')

  useEffect(() => {
    if (!open) return
    setNameTh(initial?.name_th ?? '')
    setNameEn(initial?.name_en ?? '')
    setColor(initial?.color ?? COLOR_OPTIONS[0])
    setIcon(initial?.icon ?? 'folder')
  }, [open, initial])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        initial ? t('categories.editTitle') : t('categories.createTitle')
      }
      footer={
        <>
          <button className={btnSecondary} onClick={onClose} type="button">
            {t('common.cancel')}
          </button>
          <button
            className={btnPrimary}
            disabled={submitting}
            form="category-form"
            type="submit"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {initial ? t('categories.save') : t('categories.addSubmit')}
          </button>
        </>
      }
    >
      <form
        id="category-form"
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({
            nameTh: nameTh.trim(),
            nameEn: nameEn.trim(),
            color,
            icon,
          })
        }}
      >
        {error ? <p className={errorBox}>{error}</p> : null}

        <div>
          <label className={label} htmlFor="category-name-th">
            {t('categories.nameTh')}
          </label>
          <input
            id="category-name-th"
            className={fieldLine}
            placeholder={t('categories.nameThPlaceholder')}
            required
            value={nameTh}
            onChange={(event) => setNameTh(event.target.value)}
          />
        </div>

        <div>
          <label className={label} htmlFor="category-name-en">
            {t('categories.nameEn')}
          </label>
          <input
            id="category-name-en"
            className={fieldLine}
            placeholder={t('categories.nameEnPlaceholder')}
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
          />
        </div>

        <div>
          <p className={label}>{t('categories.color')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option}
                aria-label={`${t('categories.color')} ${option}`}
                aria-pressed={color === option}
                className={[
                  'h-10 w-10 border transition',
                  color === option ? 'border-ink' : 'border-transparent',
                ].join(' ')}
                onClick={() => setColor(option)}
                style={{ backgroundColor: option }}
                type="button"
              />
            ))}
            <input
              aria-label={t('categories.color')}
              className="h-10 w-12 cursor-pointer border border-rule bg-transparent"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </div>
        </div>

        <div>
          <p className={label}>{t('categories.icon')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option.value}
                aria-pressed={icon === option.value}
                className={[
                  'inline-flex min-h-11 items-center gap-2 border px-3 text-[10px] font-medium uppercase tracking-[0.1em] transition',
                  icon === option.value
                    ? 'border-signal bg-signal/10 text-ink'
                    : 'border-rule text-muted hover:border-muted hover:text-ink',
                ].join(' ')}
                onClick={() => setIcon(option.value)}
                type="button"
              >
                <option.Icon className="h-4 w-4" />
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}

export function CategoryManager({ userId }: { userId: string }) {
  const { t, locale } = useI18n()
  const { categories, loading, error, refresh } = useCategories(userId)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [countsLoading, setCountsLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [reassignTo, setReassignTo] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (categories.length === 0) {
      setCounts({})
      return
    }

    let active = true
    setCountsLoading(true)

    Promise.all(
      categories.map(async (category) => {
        const count = await countTasksInCategory(category.id)
        return [category.id, count] as const
      }),
    )
      .then((entries) => {
        if (!active) return
        setCounts(Object.fromEntries(entries))
        setCountsLoading(false)
      })
      .catch((countError: unknown) => {
        if (!active) return
        console.error('Failed to count category tasks', countError)
        setCountsLoading(false)
      })

    return () => {
      active = false
    }
  }, [categories])

  const deleteOptions = useMemo(
    () => categories.filter((category) => category.id !== deleteTarget?.id),
    [categories, deleteTarget],
  )

  function openCreate() {
    setEditing(null)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setFormError(null)
    setFormOpen(true)
  }

  async function handleSubmit(values: CategoryFormValues) {
    if (!values.nameTh) {
      setFormError(t('categories.nameRequired'))
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      if (editing) {
        await updateCategory(editing.id, values)
      } else {
        await createCategory(userId, values)
      }
      setFormOpen(false)
      setEditing(null)
      refresh()
    } catch (submitError) {
      setFormError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  function openDelete(category: Category) {
    setDeleteTarget(category)
    setReassignTo('')
    setActionError(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    setActionError(null)

    try {
      if (reassignTo) {
        await reassignTasks(deleteTarget.id, reassignTo)
      }
      await deleteCategory(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError))
    } finally {
      setDeleting(false)
    }
  }

  const deleteCount = deleteTarget ? (counts[deleteTarget.id] ?? 0) : 0
  const deleteName = deleteTarget
    ? locale === 'th'
      ? deleteTarget.name_th
      : deleteTarget.name_en
    : ''

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`${label} flex items-center gap-2`}>
            <FolderKanban className="h-3.5 w-3.5" />
            {t('categories.title')}
          </h2>
          <p className="mt-1 text-[11px] text-dim">{t('categories.subtitle')}</p>
        </div>
        <button
          className="inline-flex min-h-11 items-center gap-2 border border-rule px-3 text-[9px] font-medium uppercase tracking-[0.12em] text-muted transition hover:border-ink hover:text-ink"
          onClick={openCreate}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('categories.add')}
        </button>
      </div>

      {error ? <p className={`${errorBox} mt-3`}>{error}</p> : null}
      {actionError && !deleteTarget ? (
        <p className={`${errorBox} mt-3`}>{actionError}</p>
      ) : null}

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-[12px] text-dim">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('categories.loading')}
        </p>
      ) : categories.length === 0 ? (
        <p className="mt-4 text-[12px] text-dim">{t('categories.empty')}</p>
      ) : (
        <ul className="mt-3">
          {categories.map((category) => {
            const Icon = categoryIcon(category.icon)
            const name =
              locale === 'th' ? category.name_th : category.name_en
            return (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center text-[#14130e]"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-[13px] font-medium">
                      {name}
                      {category.is_system ? (
                        <span className="border border-rule px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-dim">
                          {t('categories.system')}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[10px] uppercase tracking-[0.1em] text-dim">
                      {countsLoading
                        ? t('categories.counting')
                        : t('categories.taskCount', {
                            count: counts[category.id] ?? 0,
                          })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    aria-label={t('common.edit')}
                    className="inline-flex h-11 w-11 items-center justify-center text-dim transition hover:text-ink"
                    onClick={() => openEdit(category)}
                    title={t('common.edit')}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label={t('common.delete')}
                    className="inline-flex h-11 w-11 items-center justify-center text-dim transition hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={category.is_system}
                    onClick={() => openDelete(category)}
                    title={
                      category.is_system
                        ? t('categories.system')
                        : t('common.delete')
                    }
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <CategoryFormModal
        error={formError}
        initial={editing}
        open={formOpen}
        submitting={submitting}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={(values) => void handleSubmit(values)}
      />

      <ConfirmDialog
        busy={deleting}
        danger
        confirmLabel={t('categories.delete')}
        description={
          deleteTarget
            ? deleteCount > 0
              ? t('categories.deleteDescriptionWithTasks', {
                  name: deleteName,
                  count: deleteCount,
                })
              : t('categories.deleteDescription', { name: deleteName })
            : ''
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        open={deleteTarget !== null}
        title={t('categories.deleteTitle')}
      >
        {deleteCount > 0 ? (
          <div className="mt-3">
            <label className={label} htmlFor="reassign-category">
              {t('categories.reassign')}
            </label>
            <select
              id="reassign-category"
              className={fieldLine}
              value={reassignTo}
              onChange={(event) => setReassignTo(event.target.value)}
            >
              <option value="">{t('common.noCategory')}</option>
              {deleteOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {locale === 'th' ? category.name_th : category.name_en}
                </option>
              ))}
            </select>
            {actionError ? (
              <p className="mt-1 text-[11px] text-danger">{actionError}</p>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
