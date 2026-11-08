import { describe, expect, it } from 'vitest'
import { mergeTaskLists } from '../src/lib/offline/merge'
import type { TaskWithRelations } from '../src/lib/api/tasks'
import type { Task } from '../src/types/database'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    user_id: 'user',
    title: 'Task',
    description: null,
    category_id: 'category-1',
    status: 'not_started',
    progress: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    server_updated_at: '2026-01-01T00:00:00.000Z',
    client_updated_at: '2026-01-01T00:00:00.000Z',
    revision: 1,
    deleted_at: null,
    last_device_id: null,
    ...overrides,
  }
}

function withRelations(source: Task): TaskWithRelations {
  return {
    ...source,
    category: {
      id: 'category-1',
      name_th: 'เรียน',
      name_en: 'Study',
      color: '#3b82f6',
      icon: 'book-open',
    },
    images: [],
  }
}

describe('mergeTaskLists', () => {
  it('appends local-only creates after the snapshot', () => {
    const remote = withRelations(task({ title: 'Remote' }))
    const local = task({ id: 'local-1', title: 'New offline' })

    const result = mergeTaskLists([remote], [local], new Set([local.id]))

    expect(result.tasks.map((item) => item.title)).toEqual([
      'Remote',
      'New offline',
    ])
    expect(result.pendingCount).toBe(1)
  })

  it('overrides a snapshot row when the edit is pending (online)', () => {
    const remote = withRelations(task({ id: 't1', title: 'Server title' }))
    const local = task({
      id: 't1',
      title: 'Offline title',
      revision: 2,
    })

    const result = mergeTaskLists([remote], [local], new Set(['t1']))

    expect(result.tasks[0].title).toBe('Offline title')
    // Category metadata from the snapshot is preserved.
    expect(result.tasks[0].category?.name_en).toBe('Study')
    expect(result.pendingCount).toBe(1)
  })

  it('does not let a stale synced row shadow the server copy', () => {
    const remote = withRelations(task({ id: 't1', title: 'Latest server' }))
    const local = task({ id: 't1', title: 'Old synced local' })

    const result = mergeTaskLists([remote], [local], new Set())

    expect(result.tasks[0].title).toBe('Latest server')
    expect(result.pendingCount).toBe(0)
  })

  it('prefers every local row when overrideAll is set (offline)', () => {
    const cached = withRelations(task({ id: 't1', title: 'Cached' }))
    const local = task({ id: 't1', title: 'Edited offline' })

    const result = mergeTaskLists([cached], [local], new Set(), {
      overrideAll: true,
    })

    expect(result.tasks[0].title).toBe('Edited offline')
  })

  it('hides rows soft-deleted locally', () => {
    const cached = withRelations(task({ id: 't1' }))
    const deleted = task({
      id: 't1',
      deleted_at: '2026-01-02T00:00:00.000Z',
    })

    const result = mergeTaskLists([cached], [deleted], new Set(['t1']), {
      overrideAll: true,
    })

    expect(result.tasks).toHaveLength(0)
  })

  it('drops a synced local row that no longer exists in the snapshot', () => {
    const local = task({ id: 'deleted-elsewhere', title: 'Ghost' })

    const result = mergeTaskLists([], [local], new Set())

    expect(result.tasks).toHaveLength(0)
  })
})
