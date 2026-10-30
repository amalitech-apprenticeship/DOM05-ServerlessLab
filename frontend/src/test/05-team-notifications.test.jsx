import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo, column } from './helpers'
import { addDays, formatDate, toDateInput } from '../utils/dates'

const PRIYA = { email: 'employee2@example.com', password: '123' }

const as = async (api, who) => {
  await api.auth.login(who.email, who.password)
  return api
}

describe('Feature 5: assignment and deadline notifications (service)', () => {
  it('notifies the assignee when a task is created for them or reassigned to them', async () => {
    const api = await as(createTestApi(), ADMIN)
    await api.tasks.create({ title: 'Prepare demo', dueDate: '2030-05-01', assigneeId: 'u-2' })
    await api.tasks.assign('t-9', 'u-2')
    await api.tasks.create({ title: 'Nobody’s task', dueDate: '2030-05-01' })

    await as(api, PRIYA)
    const assignments = (await api.notifications.list()).filter((item) => item.type === 'assignment')
    expect(assignments.map((item) => item.message.split(' was ')[0])).toEqual(['"Design new logo"', '"Prepare demo"'])
    expect(assignments[1].message).toBe(`"Prepare demo" was assigned to you. Due ${formatDate('2030-05-01')}.`)
    expect(assignments.every((item) => item.recipientId === 'u-2' && !item.read && item.taskId)).toBe(true)

    await as(api, AMIT)
    expect((await api.notifications.list()).some((item) => item.type === 'assignment')).toBe(false)
  })

  it('sends deadline reminders once for due-soon and overdue open tasks', async () => {
    const api = await as(createTestApi(), AMIT)
    const first = (await api.notifications.list()).filter((item) => item.type === 'deadline')
    // t-1 due tomorrow, t-3 overdue; t-2 is completed so it is skipped.
    expect(first.map((item) => [item.taskId, item.title]).sort()).toEqual([
      ['t-1', 'Deadline approaching'],
      ['t-3', 'Task overdue'],
    ])
    expect(first.find((item) => item.taskId === 't-1').message).toBe('"Develop new feature" is due tomorrow.')
    expect(first[0]).not.toHaveProperty('dedupeKey')

    const second = (await api.notifications.list()).filter((item) => item.type === 'deadline')
    expect(second).toHaveLength(2)
  })

  it('re-arms the reminder when time passes or the due date changes', async () => {
    let clock = new Date()
    const api = await as(createTestApi({ now: () => clock }), AMIT)
    await api.notifications.list()

    clock = addDays(clock, 2) // t-1 (due tomorrow) is now overdue
    const overdue = (await api.notifications.list()).filter((item) => item.taskId === 't-1' && item.type === 'deadline')
    expect(overdue.map((item) => item.title)).toEqual(['Task overdue', 'Deadline approaching'])

    await as(api, ADMIN)
    await api.tasks.update('t-1', { dueDate: toDateInput(clock) })
    await as(api, AMIT)
    const rearmed = (await api.notifications.list()).filter((item) => item.taskId === 't-1' && item.type === 'deadline')
    expect(rearmed[0]).toMatchObject({ title: 'Deadline approaching', message: '"Develop new feature" is due today.' })
  })

  it('marks only the caller’s notifications as read', async () => {
    const api = await as(createTestApi(), AMIT)
    const [first, second] = await api.notifications.list()
    await api.notifications.markRead(first.id)
    expect((await api.notifications.list()).find((item) => item.id === first.id).read).toBe(true)
    expect((await api.notifications.list()).find((item) => item.id === second.id).read).toBe(false)

    await as(api, PRIYA)
    await expect(api.notifications.markRead(second.id)).rejects.toMatchObject({ status: 404 })
    await api.notifications.markAllRead()

    await as(api, AMIT)
    expect((await api.notifications.list()).find((item) => item.id === second.id).read).toBe(false)
    await api.notifications.markAllRead()
    expect((await api.notifications.list()).every((item) => item.read)).toBe(true)
  })
})

describe('Feature 5: assignment and deadline notifications (UI)', () => {
  it('shows unread count and lets the member read notifications', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)

    const bell = await screen.findByRole('button', { name: 'Notifications, 2 unread' })
    await user.click(bell)
    const panel = screen.getByRole('dialog', { name: 'Notifications' })
    expect(within(panel).getByText('"Develop new feature" is due tomorrow.')).toBeInTheDocument()
    expect(within(panel).getByText('Task overdue')).toBeInTheDocument()

    await user.click(within(panel).getByText('Task overdue'))
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'Mark all read' }))
    expect(screen.getByRole('button', { name: 'Notifications, 0 unread' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()
  })

  it('pops a toast and shows the task when the admin assigns new work', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')
    await screen.findByRole('button', { name: 'Notifications, 2 unread' })

    const admin = await as(createTestApi(), ADMIN)
    await admin.tasks.assign('t-9', 'u-1')

    const toast = await screen.findByRole('status', {}, { timeout: 2000 })
    expect(within(toast).getByText('New task assigned')).toBeInTheDocument()
    expect(await column('New').findByRole('article', { name: 'Design new logo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument()

    await user.click(within(toast).getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
