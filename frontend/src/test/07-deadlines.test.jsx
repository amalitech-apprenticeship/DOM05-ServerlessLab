import { describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo, column } from './helpers'
import { getUrgentTasks } from '../hooks/useDeadlineReminder'
import { toDateInput } from '../utils/dates'

const NOW = new Date('2030-03-10T12:00:00')

describe('Feature 7: deadline helpers', () => {
  it('treats overdue and due-within-a-day open tasks as urgent', () => {
    const tasks = [
      { id: 'a', dueDate: '2030-03-09', status: 'in_progress' },
      { id: 'b', dueDate: '2030-03-10', status: 'new' },
      { id: 'c', dueDate: '2030-03-11', status: 'blocked' },
      { id: 'd', dueDate: '2030-03-12', status: 'new' },
      { id: 'e', dueDate: '2030-03-01', status: 'completed' },
    ]
    expect(getUrgentTasks(tasks, NOW).map((task) => task.id)).toEqual(['a', 'b', 'c'])
  })
})

const group = (name) => within(screen.getByRole('group', { name }))

describe('Feature 7: deadline tracker and reminder (UI)', () => {
  it('groups open tasks by deadline on the dashboard and badges the board cards', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)

    const tracker = await screen.findByRole('region', { name: 'Deadline tracker' })
    expect(within(tracker).getByText('Next: Overdue by 1 day')).toBeInTheDocument()
    expect(group('Overdue').getByText('Research new tech stack')).toBeInTheDocument()
    expect(group('Due soon').getByText('Develop new feature')).toBeInTheDocument()
    expect(group('Due today').queryAllByRole('listitem')).toHaveLength(0)
    expect(within(tracker).queryByText('Testing module 2')).not.toBeInTheDocument() // completed

    await user.click(group('Overdue').getByRole('button', { name: 'Research new tech stack' }))
    expect(screen.getByRole('heading', { name: 'Research new tech stack' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Task properties' })).getByText('Overdue by 1 day')).toBeInTheDocument()

    await goTo(user, 'Task board')
    expect(within(screen.getByRole('article', { name: 'Research new tech stack' })).getByText('Overdue by 1 day')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Develop new feature' })).getByText('Due tomorrow')).toBeInTheDocument()
  })

  it('shows a reminder that can be snoozed, and survives a reload while snoozed', async () => {
    const api = createTestApi()
    const { user } = renderApp(api)
    await signIn(user, AMIT)

    const banner = await screen.findByRole('alert', { name: 'Deadline reminder' })
    expect(banner).toHaveTextContent('Reminder: you have 1 task overdue and 1 task due within a day.')
    expect(banner).toHaveTextContent('Start with “Research new tech stack”.')

    await user.click(within(banner).getByRole('button', { name: 'View deadlines' }))
    expect(screen.getByRole('region', { name: 'Deadline tracker' })).toHaveFocus()

    await user.click(within(banner).getByRole('button', { name: 'Remind me later' }))
    expect(screen.queryByRole('alert', { name: 'Deadline reminder' })).not.toBeInTheDocument()

    cleanup()
    renderApp(api)
    await screen.findByRole('region', { name: 'Deadline tracker' })
    expect(screen.queryByRole('alert', { name: 'Deadline reminder' })).not.toBeInTheDocument()
  })

  it('brings a snoozed reminder back when a new task becomes urgent', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await user.click(within(await screen.findByRole('alert', { name: 'Deadline reminder' })).getByRole('button', { name: 'Remind me later' }))

    const admin = createTestApi()
    await admin.auth.login(ADMIN.email, ADMIN.password)
    await admin.tasks.create({ title: 'Hotfix', dueDate: toDateInput(new Date()), assigneeId: 'u-1' })

    const banner = await screen.findByRole('alert', { name: 'Deadline reminder' }, { timeout: 2000 })
    expect(banner).toHaveTextContent('1 task overdue and 2 tasks due within a day')
    expect(group('Due today').getByText('Hotfix')).toBeInTheDocument()
  })

  it('clears the reminder once urgent work is done', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await screen.findByRole('alert', { name: 'Deadline reminder' })

    await goTo(user, 'Task board')
    const card = (name) => screen.getByRole('article', { name })
    await user.click(within(card('Research new tech stack')).getByRole('button', { name: 'Mark complete' }))
    await user.click(within(card('Develop new feature')).getByRole('button', { name: 'Accept task' }))
    await user.click(await within(card('Develop new feature')).findByRole('button', { name: 'Start work' }))
    await user.click(await within(card('Develop new feature')).findByRole('button', { name: 'Mark complete' }))
    await vi.waitFor(() => expect(column('Completed').getAllByRole('article')).toHaveLength(3))

    await goTo(user, 'Dashboard')
    expect(screen.queryByRole('alert', { name: 'Deadline reminder' })).not.toBeInTheDocument()
    expect(screen.getByText('No open deadlines. Nice work.')).toBeInTheDocument()
  })
})
