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

export const statusClasses: Record<TaskStatus, string> = {
  not_started: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  in_progress:
    'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  completed:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  on_hold:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}
