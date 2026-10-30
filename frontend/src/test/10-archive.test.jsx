import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo, column } from './helpers'

const as = async (api, who) => {
  await api.auth.login(who.email, who.password)
  return api
}

describe('Archiving completed tasks (service)', () => {
  it('archives and restores completed tasks, recording both in history', async () => {
    const api = await as(createTestApi(), ADMIN)
    const archived = await api.tasks.archive('t-2')
    expect(archived.archivedAt).toEqual(expect.any(String))
    expect(archived.history.at(-1)).toMatchObject({ action: 'archived', by: 'u-admin' })
    expect((await api.tasks.archive('t-2')).archivedAt).toBe(archived.archivedAt) // idempotent

    const restored = await api.tasks.unarchive('t-2')
    expect(restored.archivedAt).toBeNull()
    expect(restored.history.at(-1)).toMatchObject({ action: 'restored' })
  })

  it('only archives completed tasks', async () => {
    const api = await as(createTestApi(), ADMIN)
    await expect(api.tasks.archive('t-1')).rejects.toMatchObject({ status: 409, message: 'Only completed tasks can be archived.' })
    await expect(api.tasks.archive('t-3')).rejects.toMatchObject({ status: 409 })
  })

  it('makes archived tasks read-only until restored, but still deletable', async () => {
    const api = await as(createTestApi(), ADMIN)
    await api.tasks.archive('t-2')
    await expect(api.tasks.update('t-2', { title: 'Changed' })).rejects.toMatchObject({ status: 409 })
    await expect(api.tasks.updateStatus('t-2', 'in_progress')).rejects.toMatchObject({ status: 409 })
    await expect(api.tasks.assign('t-2', 'u-2')).rejects.toMatchObject({ status: 409 })

    await api.tasks.unarchive('t-2')
    await expect(api.tasks.update('t-2', { title: 'Changed' })).resolves.toMatchObject({ title: 'Changed' })
    await api.tasks.archive('t-6')
    await expect(api.tasks.remove('t-6')).resolves.toEqual({ id: 't-6' })
  })

  it('is admin-only', async () => {
    const api = await as(createTestApi(), AMIT)
    await expect(api.tasks.archive('t-2')).rejects.toMatchObject({ status: 403 })
    await expect(api.tasks.unarchive('t-2')).rejects.toMatchObject({ status: 403 })
  })
})

describe('Archiving completed tasks (UI)', () => {
  const openBoard = async () => {
    const { user, api } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Task board')
    return { user, api }
  }

  it('archives from the board only for completed tasks, with undo', async () => {
    const { user } = await openBoard()
    expect(column('Completed').getAllByRole('button', { name: /^Archive / })).toHaveLength(2)
    expect(column('New').queryByRole('button', { name: /^Archive / })).not.toBeInTheDocument()
    expect(column('In progress').queryByRole('button', { name: /^Archive / })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Archive Testing module 2' }))
    expect(await screen.findByText('“Testing module 2” was archived.')).toBeInTheDocument()
    expect(column('Completed').queryByRole('article', { name: 'Testing module 2' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archived (1)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await column('Completed').findByRole('article', { name: 'Testing module 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archived (0)' })).toBeInTheDocument()
    expect(screen.queryByText('“Testing module 2” was archived.')).not.toBeInTheDocument()
  })

  it('lists archived tasks in the archive view and restores them', async () => {
    const { user } = await openBoard()
    await user.click(screen.getByRole('button', { name: 'Archive Final research report' }))
    await user.click(await screen.findByRole('button', { name: 'Archived (1)' }))

    expect(screen.getByRole('heading', { name: 'Archived tasks' })).toBeInTheDocument()
    const archive = within(screen.getByRole('region', { name: 'Archived tasks' }))
    const card = archive.getByRole('article', { name: 'Final research report' })
    expect(within(card).getByText(/^Archived /)).toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: 'Restore Final research report' }))
    expect(await screen.findByText('Nothing archived')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to board' }))
    expect(column('Completed').getByRole('article', { name: 'Final research report' })).toBeInTheDocument()
  })

  it('archives from task details, locking edits until restored', async () => {
    const { user } = await openBoard()
    await user.click(screen.getByRole('button', { name: 'Testing module 2' }))
    expect(screen.queryByRole('button', { name: 'Restore Testing module 2' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Archive Testing module 2' }))
    const banner = await screen.findByRole('status', { name: 'Archived task' })
    expect(banner).toHaveTextContent('read-only until it’s restored')
    expect(screen.getByLabelText('Status')).toBeDisabled()
    expect(screen.getByLabelText('Assignee for Testing module 2')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit Testing module 2' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Archive Testing module 2' })).not.toBeInTheDocument()
    expect(screen.getByText('Admin archived it')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restore Testing module 2' }))
    await within(screen.getByRole('article', { name: 'Task details' })).findByText('Admin restored it from the archive')
    expect(screen.queryByRole('status', { name: 'Archived task' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toBeEnabled()
  })

  it('does not offer archiving for tasks that are not completed', async () => {
    const { user } = await openBoard()
    await user.click(screen.getByRole('button', { name: 'Develop new feature' }))
    expect(screen.queryByRole('button', { name: 'Archive Develop new feature' })).not.toBeInTheDocument()
  })

  it('archives from the list layout', async () => {
    const { user } = await openBoard()
    await user.click(screen.getByRole('button', { name: /list/i }))
    const table = within(screen.getByRole('table', { name: 'All tasks' }))
    expect(table.queryByRole('button', { name: 'Archive Develop new feature' })).not.toBeInTheDocument()
    await user.click(table.getByRole('button', { name: 'Archive Testing module 2' }))
    expect(await screen.findByText('“Testing module 2” was archived.')).toBeInTheDocument()
    expect(table.queryByText('Testing module 2')).not.toBeInTheDocument()
  })

  it('leaves archived tasks out of the dashboard and the team member’s views', async () => {
    const admin = await as(createTestApi(), ADMIN)
    await admin.tasks.archive('t-2') // Amit's completed task

    const { user } = renderApp()
    await signIn(user, AMIT)
    expect(within(screen.getByRole('group', { name: 'Completed' })).getByText('0')).toBeInTheDocument()
    await goTo(user, 'Task board')
    expect(screen.queryByRole('article', { name: 'Testing module 2' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Archived \(/ })).not.toBeInTheDocument()
  })

  it('excludes archived tasks from the admin status tracker', async () => {
    const admin = await as(createTestApi(), ADMIN)
    await admin.tasks.archive('t-2')
    const { user } = renderApp()
    await signIn(user, ADMIN)
    const pipeline = within(screen.getByRole('region', { name: 'Status tracker' }))
    expect(pipeline.getByRole('button', { name: 'Completed: 1' })).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: 'Task status' })).queryByText('Testing module 2')).not.toBeInTheDocument()
  })
})
