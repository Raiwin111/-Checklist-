import { describe, expect, it } from 'vitest'
import { normalizeStatusProgress } from '../src/features/tasks/statusProgress'

describe('normalizeStatusProgress — new task (no previous state)', () => {
  it('keeps the approved default of Not Started / 0', () => {
    expect(
      normalizeStatusProgress({ status: 'not_started', progress: 0 }),
    ).toEqual({ status: 'not_started', progress: 0 })
  })

  it('Completed forces progress to 100', () => {
    expect(
      normalizeStatusProgress({ status: 'completed', progress: 12 }),
    ).toEqual({ status: 'completed', progress: 100 })
  })

  it('In Progress at 0 becomes 1', () => {
    expect(
      normalizeStatusProgress({ status: 'in_progress', progress: 0 }),
    ).toEqual({ status: 'in_progress', progress: 1 })
  })

  it('In Progress at 100 becomes Completed', () => {
    expect(
      normalizeStatusProgress({ status: 'in_progress', progress: 100 }),
    ).toEqual({ status: 'completed', progress: 100 })
  })

  it('On Hold is allowed to keep its progress', () => {
    expect(
      normalizeStatusProgress({ status: 'on_hold', progress: 42 }),
    ).toEqual({ status: 'on_hold', progress: 42 })
  })
})

describe('normalizeStatusProgress — status changes', () => {
  const previous = { status: 'in_progress' as const, progress: 40 }

  it('changing to Completed sets 100', () => {
    expect(
      normalizeStatusProgress({ status: 'completed', progress: 40 }, previous),
    ).toEqual({ status: 'completed', progress: 100 })
  })

  it('changing to Not Started sets 0', () => {
    expect(
      normalizeStatusProgress({ status: 'not_started', progress: 40 }, previous),
    ).toEqual({ status: 'not_started', progress: 0 })
  })

  it('changing to In Progress keeps a mid-range progress', () => {
    expect(
      normalizeStatusProgress({ status: 'in_progress', progress: 55 }, previous),
    ).toEqual({ status: 'in_progress', progress: 55 })
  })

  it('changing to In Progress at 0 becomes 1', () => {
    expect(
      normalizeStatusProgress(
        { status: 'in_progress', progress: 0 },
        { status: 'on_hold', progress: 40 },
      ),
    ).toEqual({ status: 'in_progress', progress: 1 })
  })

  it('changing to In Progress at 100 becomes Completed', () => {
    expect(
      normalizeStatusProgress({ status: 'in_progress', progress: 100 }, previous),
    ).toEqual({ status: 'completed', progress: 100 })
  })

  it('changing to On Hold keeps progress unchanged', () => {
    expect(
      normalizeStatusProgress({ status: 'on_hold', progress: 40 }, previous),
    ).toEqual({ status: 'on_hold', progress: 40 })
  })
})

describe('normalizeStatusProgress — progress changes', () => {
  const previous = { status: 'in_progress' as const, progress: 40 }

  it('progress 100 becomes Completed', () => {
    expect(
      normalizeStatusProgress({ status: 'in_progress', progress: 100 }, previous),
    ).toEqual({ status: 'completed', progress: 100 })
  })

  it('progress 0 becomes Not Started', () => {
    expect(
      normalizeStatusProgress({ status: 'in_progress', progress: 0 }, previous),
    ).toEqual({ status: 'not_started', progress: 0 })
  })

  it('progress 1–99 becomes In Progress', () => {
    expect(
      normalizeStatusProgress({ status: 'in_progress', progress: 35 }, previous),
    ).toEqual({ status: 'in_progress', progress: 35 })
  })

  it('On Hold keeps its status while progress moves', () => {
    expect(
      normalizeStatusProgress(
        { status: 'on_hold', progress: 60 },
        { status: 'on_hold', progress: 40 },
      ),
    ).toEqual({ status: 'on_hold', progress: 60 })
  })

  it('returns the input when nothing changed', () => {
    const next = { status: 'in_progress' as const, progress: 40 }
    expect(normalizeStatusProgress(next, previous)).toBe(next)
  })
})
