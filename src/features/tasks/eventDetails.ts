import type { TaskEvent, TaskStatus } from '../../types/database'
import type { TranslationKey } from '../i18n/dictionary'

export type Translate = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string

const STATUSES: TaskStatus[] = [
  'not_started',
  'in_progress',
  'completed',
  'on_hold',
]

const FIELD_KEYS: Record<string, TranslationKey> = {
  title: 'field.title',
  description: 'field.description',
  category: 'field.category',
}

export function statusText(value: unknown, t: Translate): string {
  if (typeof value === 'string' && STATUSES.includes(value as TaskStatus)) {
    return t(`status.${value as TaskStatus}`)
  }
  return String(value ?? '')
}

export function describeEvent(event: TaskEvent, t: Translate): string {
  const payload = event.payload as Record<string, unknown>

  switch (event.event_type) {
    case 'status_changed':
      return `${statusText(payload.from, t)} → ${statusText(payload.to, t)}`
    case 'progress_changed':
      return `${String(payload.from ?? 0)}% → ${String(payload.to ?? 0)}%`
    case 'image_added':
    case 'image_removed':
      return t('event.imageCount', { count: Number(payload.count ?? 1) })
    case 'updated': {
      const fields = Array.isArray(payload.fields)
        ? payload.fields.map((field) => {
            const key = FIELD_KEYS[String(field)]
            return key ? t(key) : String(field)
          })
        : []
      return fields.length > 0
        ? t('event.updatedFields', { fields: fields.join(', ') })
        : ''
    }
    case 'deleted':
      return String(payload.title ?? '')
    default:
      return ''
  }
}
