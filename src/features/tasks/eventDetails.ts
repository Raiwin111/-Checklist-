import { statusLabelTh } from '../../lib/format'
import type { TaskEvent, TaskStatus } from '../../types/database'

export function statusText(value: unknown): string {
  if (typeof value === 'string' && value in statusLabelTh) {
    return statusLabelTh[value as TaskStatus]
  }
  return String(value ?? '')
}

export function describeEvent(event: TaskEvent): string {
  const payload = event.payload as Record<string, unknown>

  switch (event.event_type) {
    case 'status_changed':
      return `${statusText(payload.from)} → ${statusText(payload.to)}`
    case 'progress_changed':
      return `${String(payload.from ?? 0)}% → ${String(payload.to ?? 0)}%`
    case 'image_added':
    case 'image_removed':
      return `${String(payload.count ?? 1)} รูป`
    case 'updated': {
      const fields = Array.isArray(payload.fields)
        ? payload.fields.map(String).join(', ')
        : ''
      return fields ? `แก้ไข: ${fields}` : ''
    }
    case 'deleted':
      return String(payload.title ?? '')
    default:
      return ''
  }
}
