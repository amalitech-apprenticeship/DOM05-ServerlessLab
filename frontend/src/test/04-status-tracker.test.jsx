import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn } from './helpers'
import { DEADLINE_STATE, describeDue, getDeadlineState } from '../utils/deadlines'

const NOW = new Date('2030-03-10T12:00:00')
const task = (dueDate, status = 'in_progress') => ({ dueDate, status })

describe('deadline helpers', () => {
  it('classifies deadlines', () => {
    expect(getDeadlineState(task('2030-03-09'), NOW)).toBe(DEADLINE_STATE.OVERDUE)
    expect(getDeadlineState(task('2030-03-10'), NOW)).toBe(DEADLINE_STATE.DUE_TODAY)
    expect(getDeadlineState(task('2030-03-12'), NOW)).toBe(DEADLINE_STATE.DUE_SOON)
    expect(getDeadlineState(task('2030-03-20'), NOW)).toBe(DEADLINE_STATE.UPCOMING)
    expect(getDeadlineState(task('2030-03-01', 'completed'), NOW)).toBe(DEADLINE_STATE.DONE)
    expect(describeDue(task('2030-03-11'), NOW)).toBe('Due tomorrow')
    expect(describeDue(task('2030-03-07'), NOW)).toBe('Overdue by 3 days')
  })
})

const openDashboard = async () => {
  const { user, api } = renderApp()
  await signIn(user, ADMIN)
  return { user, api, tracker: await screen.findByRole('region', { name: 'Task tracker' }) }
}

const rowTitles = () =>
  within(screen.getByRole('table', { name: 'Task status' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].querySelector('button')?.textContent)
    .filter(Boolean)

describe('Feature 4: admin status tracker (UI)', () => {
  it('summarises seeded tasks by status, overdue and completion', async () => {
    await openDashboard()
    const pipeline = within(screen.getByRole('region', { name: 'Status tracker' }))
    expect(pipeline.getByRole('button', { name: 'New: 4' })).toBeInTheDocument()
    expect(pipeline.getByRole('button', { name: 'In progress: 2' })).toBeInTheDocument()
    expect(pipeline.getByRole('button', { name: 'Completed: 2' })).toBeInTheDocument()
    expect(pipeline.getByRole('button', { name: 'Needs attention: 1' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Overdue / at risk' })).getByText('1')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Overall completion' })).toHaveAttribute('aria-valuenow', '22')

    const amit = within(within(screen.getByRole('region', { name: 'Team workload' })).getByRole('listitem', { name: 'Amit' }))
    expect(amit.getByText('1 new, 0 to do, 1 in progress, 1 completed, 0 needs attention')).toBeInTheDocument()
    expect(amit.getByText(/1 overdue/)).toBeInTheDocument()
    expect(amit.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
  })

  it('lists overdue, due-today and blocked work in the attention queue', async () => {
    const { user } = await openDashboard()
    const queue = within(screen.getByRole('region', { name: 'Attention queue' }))
    expect(queue.getByText('Research new tech stack')).toBeInTheDocument() // overdue
    expect(queue.getByText('Fix bug in development')).toBeInTheDocument() // due today + blocked
    expect(queue.queryByText('Develop new feature')).not.toBeInTheDocument()

    await user.click(queue.getByRole('button', { name: 'Review Research new tech stack' }))
    expect(screen.getByRole('heading', { name: 'Research new tech stack' })).toBeInTheDocument()
  })

  it('filters the tracker by pipeline status, assignee and deadline', async () => {
    const { user, tracker } = await openDashboard()
    expect(rowTitles()).toHaveLength(9)

    await user.click(within(screen.getByRole('region', { name: 'Status tracker' })).getByRole('button', { name: 'Needs attention: 1' }))
    expect(rowTitles()).toEqual(['Fix bug in development'])
    expect(within(tracker).getByLabelText('Status')).toHaveDisplayValue('Needs attention')
    await user.selectOptions(within(tracker).getByLabelText('Status'), 'All statuses')

    await user.selectOptions(within(tracker).getByLabelText('Assignee'), 'Amit')
    expect(rowTitles().sort()).toEqual(['Develop new feature', 'Research new tech stack', 'Testing module 2'])
    await user.selectOptions(within(tracker).getByLabelText('Deadline'), 'Overdue')
    expect(rowTitles()).toEqual(['Research new tech stack'])
    expect(within(tracker).getByText('Overdue by 1 day')).toBeInTheDocument()

    await user.selectOptions(within(tracker).getByLabelText('Assignee'), 'Everyone')
    await user.selectOptions(within(tracker).getByLabelText('Deadline'), 'Due today')
    expect(rowTitles()).toEqual(['Fix bug in development'])
    await user.selectOptions(within(tracker).getByLabelText('Deadline'), 'Due soon')
    expect(rowTitles()).toEqual(['Develop new feature'])
    await user.selectOptions(within(tracker).getByLabelText('Deadline'), 'Done')
    expect(rowTitles().sort()).toEqual(['Final research report', 'Testing module 2'])

    await user.selectOptions(within(tracker).getByLabelText('Assignee'), 'Unassigned')
    expect(within(tracker).getByText('No tasks match these filters.')).toBeInTheDocument()
  })

  it('picks up status changes made by a team member, in the tracker and live activity', async () => {
    await openDashboard()

    // Simulate Amit acting from another device against the same backend.
    const other = createTestApi()
    await other.auth.login(AMIT.email, AMIT.password)
    await other.tasks.updateStatus('t-1', 'to_do')
    await other.tasks.updateStatus('t-1', 'in_progress')

    const pipeline = within(screen.getByRole('region', { name: 'Status tracker' }))
    expect(await pipeline.findByRole('button', { name: 'In progress: 3' }, { timeout: 2000 })).toBeInTheDocument()
    const row = within(screen.getByRole('table', { name: 'Task status' })).getByRole('button', { name: 'Develop new feature' }).closest('tr')
    expect(within(row).getByText('Amit moved it to In progress')).toBeInTheDocument()
    expect(within(row).getByText('Admin created it and assigned it to Amit')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Live activity' })).getAllByText(/Amit moved it to In progress/)[0]).toBeInTheDocument()
  })
})
