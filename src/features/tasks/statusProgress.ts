import type { TaskStatus } from '../../types/database'

export type StatusProgress = {
  status: TaskStatus
  progress: number
}

/**
 * Approved rules (Architecture v1, section 4):
 *
 * Status -> Completed        => progress 100
 * Status -> Not Started      => progress 0
 * Status -> In Progress      => progress 0 becomes 1; progress 100 becomes Completed
 * Status -> On Hold          => progress unchanged
 * Progress -> 100            => status Completed
 * Progress -> 0              => status Not Started
 * Progress -> 1..99          => status In Progress, unless currently On Hold
 * New task                   => Not Started / 0
 */
export function normalizeStatusProgress(
  next: StatusProgress,
  previous?: StatusProgress,
): StatusProgress {
  if (!previous) {
    if (next.status === 'completed') {
      return { status: 'completed', progress: 100 }
    }
    if (next.status === 'not_started') {
      return { status: 'not_started', progress: 0 }
    }
    if (next.status === 'in_progress' && next.progress === 0) {
      return { status: 'in_progress', progress: 1 }
    }
    if (next.status === 'in_progress' && next.progress === 100) {
      return { status: 'completed', progress: 100 }
    }
    return next
  }

  const statusChanged = next.status !== previous.status
  const progressChanged = next.progress !== previous.progress

  if (statusChanged) {
    switch (next.status) {
      case 'completed':
        return { status: 'completed', progress: 100 }
      case 'not_started':
        return { status: 'not_started', progress: 0 }
      case 'in_progress':
        if (next.progress === 0) {
          return { status: 'in_progress', progress: 1 }
        }
        if (next.progress === 100) {
          return { status: 'completed', progress: 100 }
        }
        return next
      case 'on_hold':
        return next
    }
  }

  if (progressChanged) {
    if (next.progress === 100) {
      return { status: 'completed', progress: 100 }
    }
    if (next.progress === 0) {
      return { status: 'not_started', progress: 0 }
    }
    if (next.progress >= 1 && next.progress <= 99) {
      if (next.status !== 'on_hold') {
        return { status: 'in_progress', progress: next.progress }
      }
    }
    return next
  }

  return next
}
