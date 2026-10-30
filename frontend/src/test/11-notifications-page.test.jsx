import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn } from './helpers'

const as = async (api, who) => {
  await api.auth.login(who.email, who.password)
  return api
}

const openAllNotifications = async (user, unread) => {
  await user.click(await screen.findByRole('button', { name: `Notifications, ${unread} unread` }))
  await user.click(within(screen.getByRole('dialog', { name: 'Notifications' })).getByRole('button', { name: 'See all notifications' }))
  return screen.findByRole('heading', { name: 'Notifications', level: 1 })
}

describe('Notifications page', () => {
  it('is reached from the header popup only, not the sidebar', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toHaveTextContent(/notifications/i)

    await openAllNotifications(user, 2)
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()
    expect(screen.getByText('2 unread of 2')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Today' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('filters by unread and type, and marks items read', async () => {
    const admin = await as(createTestApi(), ADMIN)
    await admin.tasks.assign('t-9', 'u-1') // + an assignment for Amit

    const { user } = renderApp()
    await signIn(user, AMIT)
    await openAllNotifications(user, 3)
    const items = () => screen.queryAllByRole('listitem').map((item) => item.getAttribute('aria-label')).sort()
    expect(items()).toEqual(['Deadline approaching', 'New task assigned', 'Task overdue'])

    await user.click(screen.getByRole('button', { name: 'Deadlines' }))
    expect(items()).toEqual(['Deadline approaching', 'Task overdue'])

    await user.click(within(screen.getByRole('listitem', { name: 'Task overdue' })).getByRole('button', { name: 'Mark as read' }))
    await user.click(screen.getByRole('button', { name: /^Unread/ }))
    expect(items()).toEqual(['Deadline approaching'])
    expect(screen.getByText('2 unread of 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(await screen.findByText('Nothing matches these filters')).toBeInTheDocument()
    expect(screen.getByText(/You’re all caught up · 3 total/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifications, 0 unread' })).toBeInTheDocument()
  })

  it('opens the related task and marks the notification read', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await openAllNotifications(user, 2)
    await user.click(within(screen.getByRole('listitem', { name: 'Task overdue' })).getByRole('button', { name: 'View task' }))
    expect(screen.getByRole('heading', { name: 'Research new tech stack' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument()
  })

  it('works for admins and hides "View task" when the task is gone', async () => {
    const member = await as(createTestApi(), AMIT)
    await member.tasks.updateStatus('t-1', 'to_do')
    const admin = await as(createTestApi(), ADMIN)
    await admin.tasks.updateStatus('t-4', 'blocked')
    const priya = await as(createTestApi(), { email: 'employee2@example.com', password: '123' })
    await priya.tasks.updateStatus('t-4', 'in_progress')
    await admin.tasks.remove('t-4')

    const { user } = renderApp()
    await signIn(user, ADMIN)
    await openAllNotifications(user, 2)
    const rows = screen.getAllByRole('listitem', { name: 'Status changed' })
    const forTask = (text) => rows.find((row) => row.textContent.includes(text))
    expect(within(forTask('Develop new feature')).getByRole('button', { name: 'View task' })).toBeInTheDocument()
    expect(within(forTask('Documentation update')).queryByRole('button', { name: 'View task' })).not.toBeInTheDocument()

    await user.click(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('button', { name: 'Dashboard' }))
    expect(screen.getByRole('region', { name: 'Status tracker' })).toBeInTheDocument()
  })

  it('shows an empty state when there is nothing yet', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await openAllNotifications(user, 0)
    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
  })
})
