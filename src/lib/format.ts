import type { TaskStatus } from '../types/database'

let dateLocale = 'th-TH'

export function setFormatLocale(locale: 'th' | 'en') {
  dateLocale = locale === 'th' ? 'th-TH' : 'en-US'
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(dateLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const isEnglish = dateLocale === 'en-US'
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60_000)

  if (minutes < 1) return isEnglish ? 'just now' : 'เมื่อสักครู่'
  if (minutes < 60) {
    return isEnglish ? `${minutes} min ago` : `${minutes} นาทีที่แล้ว`
  }

  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return isEnglish ? `${hours} hr ago` : `${hours} ชั่วโมงที่แล้ว`
  }

  const days = Math.round(hours / 24)
  if (days < 7) {
    return isEnglish ? `${days} day(s) ago` : `${days} วันที่แล้ว`
  }

  return formatDateTime(value)
}

export const statusTextClass: Record<TaskStatus, string> = {
  not_started: 'text-status-todo',
  in_progress: 'text-status-live',
  completed: 'text-status-done',
  on_hold: 'text-status-hold',
}

export const statusClasses = statusTextClass
