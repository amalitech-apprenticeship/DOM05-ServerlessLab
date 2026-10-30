import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo } from './helpers'

describe('Feature 2: assign tasks (service)', () => {
  it('assigns on create and reassigns later, resetting status to new', async () => {
    const api = createTestApi()
    await api.auth.login(ADMIN.email, ADMIN.password)

    const task = await api.tasks.create({ title: 'Ship it', dueDate: '2030-01-10', assigneeId: 'u-2' })
    expect(task.assigneeId).toBe('u-2')

    // t-3 is seeded in progress for Amit.
    const reassigned = await api.tasks.assign('t-3', 'u-4')
    expect(reassigned).toMatchObject({ assigneeId: 'u-4', status: 'new' })
    expect(reassigned.history.at(-1)).toMatchObject({ action: 'assigned', assigneeId: 'u-4' })

    const unassigned = await api.tasks.assign('t-3', null)
    expect(unassigned.assigneeId).toBeNull()
  })

  it('only allows admins to assign, and only to team members', async () => {
    const api = createTestApi()
    await api.auth.login(ADMIN.email, ADMIN.password)
    await expect(api.tasks.assign('t-1', 'u-admin')).rejects.toThrow(/team members/i)
    await expect(api.tasks.assign('t-1', 'nobody')).rejects.toThrow(/team members/i)

    await api.auth.login(AMIT.email, AMIT.password)
    await expect(api.tasks.assign('t-1', 'u-1')).rejects.toMatchObject({ status: 403 })
  })

  it('makes an assigned task visible to the assignee only', async () => {
    const api = createTestApi()
    await api.auth.login(ADMIN.email, ADMIN.password)
    await api.tasks.assign('t-9', 'u-1')

    await api.auth.login(AMIT.email, AMIT.password)
    const titles = (await api.tasks.list()).map((task) => task.title)
    expect(titles).toContain('Design new logo')
    expect(titles).not.toContain('Documentation update')
  })
})

describe('Feature 2: assign tasks (UI)', () => {
  it('assigns while creating and reassigns from the list layout', async () => {
    const { user, api } = renderApp()
    await signIn(user, ADMIN)

    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'New task' }))
    const form = screen.getByRole('form', { name: 'Create task' })
    await user.type(within(form).getByLabelText(/task title/i), 'Prepare demo')
    await user.type(within(form).getByLabelText(/due date/i), '2030-05-01')
    await user.selectOptions(await within(form).findByLabelText(/assign to/i), 'Priya')
    await user.click(within(form).getByRole('button', { name: /create task/i }))

    await goTo(user, 'Task board')
    const card = await screen.findByRole('article', { name: 'Prepare demo' })
    expect(within(card).getByText('Priya')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /list/i }))
    await user.selectOptions(screen.getByLabelText('Assignee for Prepare demo'), 'Ravi')
    await vi.waitFor(() => expect(screen.getByLabelText('Assignee for Prepare demo')).toHaveDisplayValue('Ravi'))
    const stored = (await api.tasks.list()).find((task) => task.title === 'Prepare demo')
    expect(stored.assigneeId).toBe('u-3')
  })

  it('reassigns from task details and resets the status to new', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: 'Research new tech stack' }))

    const props = screen.getByRole('region', { name: 'Task properties' })
    expect(within(props).getByLabelText('Status')).toHaveDisplayValue('In progress')
    await user.selectOptions(within(props).getByLabelText('Assignee for Research new tech stack'), 'Neha')

    await vi.waitFor(() => expect(within(props).getByLabelText('Status')).toHaveDisplayValue('New'))
    expect(within(props).getByText('Neha', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Admin assigned it to Neha')).toBeInTheDocument()
  })
})
