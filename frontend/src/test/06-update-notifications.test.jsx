import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo } from './helpers'
import { formatDate } from '../utils/dates'

const PRIYA = { email: 'employee2@example.com', password: '123' }

const as = async (api, who) => {
  await api.auth.login(who.email, who.password)
  return api
}

const updates = async (api) => (await api.notifications.list()).filter((item) => item.type === 'update')

describe('Feature 6: update notifications (service)', () => {
  it('notifies admins when a member changes a status, but not the member', async () => {
    const api = await as(createTestApi(), AMIT)
    await api.tasks.updateStatus('t-1', 'to_do')
    await api.tasks.updateStatus('t-1', 'in_progress')
    await api.tasks.updateStatus('t-1', 'completed')
    expect(await updates(api)).toEqual([])

    await as(api, ADMIN)
    expect((await updates(api)).map((item) => item.message)).toEqual([
      'Amit moved "Develop new feature" to Completed.',
      'Amit moved "Develop new feature" to In progress.',
      'Amit moved "Develop new feature" to To do.',
    ])
  })

  it('notifies the assignee about admin edits, listing what changed', async () => {
    const api = await as(createTestApi(), ADMIN)
    await api.tasks.update('t-1', { title: 'Develop feature X', dueDate: '2030-02-01' })
    await api.tasks.update('t-1', { title: 'Develop feature X' }) // no-op: nothing changed
    expect(await updates(api)).toEqual([])

    await as(api, AMIT)
    expect((await updates(api)).map((item) => item.message)).toEqual([
      `"Develop feature X" was updated: title changed, due date is now ${formatDate('2030-02-01')}.`,
    ])
    expect((await api.tasks.get('t-1')).history.filter((entry) => entry.action === 'edited')).toHaveLength(1)
  })

  it('notifies the assignee when an admin changes the status', async () => {
    const api = await as(createTestApi(), ADMIN)
    await api.tasks.updateStatus('t-2', 'in_progress')
    await as(api, AMIT)
    expect((await updates(api))[0].message).toBe('Admin moved "Testing module 2" to In progress.')
  })

  it('tells the previous assignee about reassignment and deletion', async () => {
    const api = await as(createTestApi(), ADMIN)
    await api.tasks.assign('t-1', 'u-2')
    await api.tasks.remove('t-4')

    await as(api, AMIT)
    expect((await updates(api)).map((item) => item.message)).toEqual(['"Develop new feature" is no longer assigned to you.'])

    await as(api, PRIYA)
    const priya = await api.notifications.list()
    expect(priya.find((item) => item.type === 'assignment').taskId).toBe('t-1')
    expect((await updates(api)).map((item) => item.message)).toEqual(['"Documentation update" was deleted by Admin.'])
  })
})

describe('Feature 6: update notifications (UI)', () => {
  it('alerts the admin live when a member completes a task', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await screen.findByRole('button', { name: 'Notifications, 0 unread' })

    const member = await as(createTestApi(), AMIT)
    await member.tasks.updateStatus('t-3', 'completed')

    const toast = await screen.findByRole('status', {}, { timeout: 2000 })
    expect(within(toast).getByText('Amit moved "Research new tech stack" to Completed.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
    expect(within(screen.getByRole('dialog', { name: 'Notifications' })).getByText('Status changed')).toBeInTheDocument()
  })

  it('alerts the member live when the admin edits their task', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')
    await screen.findByRole('button', { name: 'Notifications, 2 unread' })

    const admin = await as(createTestApi(), ADMIN)
    await admin.tasks.update('t-1', { description: 'Now with more detail.' })

    const toast = await screen.findByRole('status', {}, { timeout: 2000 })
    expect(within(toast).getByText('"Develop new feature" was updated: description changed.')).toBeInTheDocument()
    const card = screen.getByRole('article', { name: 'Develop new feature' })
    expect(await within(card).findByText('Now with more detail.')).toBeInTheDocument()
  })
})
