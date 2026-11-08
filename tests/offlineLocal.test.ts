import { afterEach, describe, expect, it } from 'vitest'
import {
  deleteUserCache,
  getOfflineDatabase,
} from '../src/lib/offline/cache'
import {
  createLocalTask,
  deleteLocalTask,
  getAllLocalTasks,
  getLocalTasks,
  getPendingSyncCount,
  getPendingTaskIds,
  isLocalId,
  updateLocalTask,
} from '../src/lib/offline/local'
import type { Task } from '../src/types/database'

const userIds: string[] = []

function newUser(): string {
  const id = crypto.randomUUID()
  userIds.push(id)
  return id
}

function serverTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    user_id: 'user',
    title: 'Server task',
    description: null,
    category_id: null,
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

afterEach(async () => {
  while (userIds.length > 0) {
    await deleteUserCache(userIds.pop()!)
  }
})

describe('createLocalTask', () => {
  it('stores the task locally and queues a create', async () => {
    const userId = newUser()
    const task = await createLocalTask(userId, {
      title: '  Read a paper  ',
      description: '  notes ',
      status: 'in_progress',
      progress: 0,
    })

    expect(isLocalId(task.id)).toBe(true)
    expect(task.title).toBe('Read a paper')
    expect(task.description).toBe('notes')
    expect(task.status).toBe('in_progress')
    expect(task.progress).toBe(1)
    expect(task.revision).toBe(1)

    const queue = await getOfflineDatabase(userId).syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({
      operation: 'create',
      taskId: task.id,
      baseRevision: 0,
    })
    expect(await getPendingSyncCount(userId)).toBe(1)
  })
})

describe('updateLocalTask', () => {
  it('coalesces repeated edits of a local-only task into one create', async () => {
    const userId = newUser()
    const task = await createLocalTask(userId, { title: 'First' })

    const updated = await updateLocalTask(userId, task.id, {
      title: 'Second',
      progress: 50,
    })

    expect(updated?.title).toBe('Second')
    expect(updated?.progress).toBe(50)
    expect(updated?.status).toBe('in_progress')
    expect(updated?.revision).toBe(2)

    const queue = await getOfflineDatabase(userId).syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].operation).toBe('create')
    expect(queue[0].payload).toMatchObject({ title: 'Second', progress: 50 })
  })

  it('can seed a server task through the fallback argument', async () => {
    const userId = newUser()
    const base = serverTask({ revision: 3, title: 'Old title' })

    const updated = await updateLocalTask(
      userId,
      base.id,
      { title: 'Offline title' },
      base,
    )

    expect(updated?.title).toBe('Offline title')
    expect(updated?.revision).toBe(4)

    const queue = await getOfflineDatabase(userId).syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].operation).toBe('update')
    expect(queue[0].baseRevision).toBe(3)
    expect(await getLocalTasks(userId)).toHaveLength(1)
  })

  it('keeps the original baseRevision across multiple edits', async () => {
    const userId = newUser()
    const base = serverTask({ revision: 3 })

    await updateLocalTask(userId, base.id, { title: 'One' }, base)
    await updateLocalTask(userId, base.id, { title: 'Two' })

    const queue = await getOfflineDatabase(userId).syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].baseRevision).toBe(3)
    expect(queue[0].payload).toMatchObject({ title: 'Two' })
  })

  it('returns null when the task is unknown and no fallback is given', async () => {
    const userId = newUser()
    expect(await updateLocalTask(userId, 'missing', { title: 'x' })).toBeNull()
  })
})

describe('deleteLocalTask', () => {
  it('discards an unsynced create instead of queueing a delete', async () => {
    const userId = newUser()
    const task = await createLocalTask(userId, { title: 'Temp' })

    await deleteLocalTask(userId, task.id)

    expect(await getPendingSyncCount(userId)).toBe(0)
    expect(await getLocalTasks(userId)).toHaveLength(0)
    const all = await getAllLocalTasks(userId)
    expect(all).toHaveLength(1)
    expect(all[0].deleted_at).not.toBeNull()
  })

  it('queues a delete for a server task with its base revision', async () => {
    const userId = newUser()
    const base = serverTask({ revision: 5 })

    await deleteLocalTask(userId, base.id, base)

    const queue = await getOfflineDatabase(userId).syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({
      operation: 'delete',
      taskId: base.id,
      baseRevision: 5,
    })
    expect(await getLocalTasks(userId)).toHaveLength(0)
  })
})

describe('getPendingTaskIds', () => {
  it('returns the ids that still have queued work', async () => {
    const userId = newUser()
    const created = await createLocalTask(userId, { title: 'A' })
    const base = serverTask({ revision: 2 })
    await deleteLocalTask(userId, base.id, base)

    const ids = await getPendingTaskIds(userId)
    expect(ids.has(created.id)).toBe(true)
    expect(ids.has(base.id)).toBe(true)
    expect(ids.size).toBe(2)
  })
})
