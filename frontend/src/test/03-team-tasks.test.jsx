import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo, column } from './helpers'

describe('Feature 3: team members read and update tasks (service)', () => {
  it('lets a member move their own task through the workflow', async () => {
    const api = createTestApi()
    await api.auth.login(AMIT.email, AMIT.password)

    expect(await api.tasks.get('t-1')).toMatchObject({ title: 'Develop new feature', status: 'new' })
    await expect(api.tasks.updateStatus('t-1', 'in_progress')).rejects.toMatchObject({ status: 403 }) // must pass through To do
    expect((await api.tasks.updateStatus('t-1', 'to_do')).status).toBe('to_do')
    expect((await api.tasks.updateStatus('t-1', 'in_progress')).status).toBe('in_progress')
    expect((await api.tasks.updateStatus('t-1', 'blocked')).status).toBe('blocked')
    expect((await api.tasks.updateStatus('t-1', 'in_progress')).status).toBe('in_progress')
    const done = await api.tasks.updateStatus('t-1', 'completed')
    expect(done.status).toBe('completed')
    expect(done.history.at(-1)).toMatchObject({ action: 'status_changed', status: 'completed', by: 'u-1' })
  })

  it('rejects transitions outside the member workflow', async () => {
    const api = createTestApi()
    await api.auth.login(AMIT.email, AMIT.password)
    await expect(api.tasks.updateStatus('t-1', 'completed')).rejects.toMatchObject({ status: 403 }) // new -> completed
    await expect(api.tasks.updateStatus('t-2', 'in_progress')).rejects.toMatchObject({ status: 403 }) // reopen completed
    await expect(api.tasks.updateStatus('t-1', 'done')).rejects.toThrow(/unknown status/i)
  })

  it('hides and protects tasks that belong to someone else', async () => {
    const api = createTestApi()
    await api.auth.login(AMIT.email, AMIT.password)
    await expect(api.tasks.get('t-4')).rejects.toMatchObject({ status: 404 })
    await expect(api.tasks.updateStatus('t-4', 'in_progress')).rejects.toMatchObject({ status: 404 })
  })

  it('never lets a member delete or reassign', async () => {
    const api = createTestApi()
    await api.auth.login(AMIT.email, AMIT.password)
    await expect(api.tasks.remove('t-1')).rejects.toMatchObject({ status: 403 })
    await expect(api.tasks.assign('t-1', 'u-2')).rejects.toMatchObject({ status: 403 })
    expect((await api.tasks.list()).map((task) => task.id)).toContain('t-1')
  })

  it('lets an admin set any status', async () => {
    const api = createTestApi()
    await api.auth.login(ADMIN.email, ADMIN.password)
    expect((await api.tasks.updateStatus('t-2', 'in_progress')).status).toBe('in_progress')
  })
})

describe('Feature 3: team members read and update tasks (UI)', () => {
  it('shows only the member’s tasks with status actions, and no create, edit or delete', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')

    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.queryByText('Documentation update')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new task|add task|delete|edit/i })).not.toBeInTheDocument()

    const card = () => screen.getByRole('article', { name: 'Develop new feature' })
    expect(column('New').getByRole('article', { name: 'Develop new feature' })).toBeInTheDocument()
    await user.click(within(card()).getByRole('button', { name: 'Accept task' }))
    expect(await column('To do').findByRole('article', { name: 'Develop new feature' })).toBeInTheDocument()
    await user.click(within(card()).getByRole('button', { name: 'Start work' }))
    expect(await column('In progress').findByRole('article', { name: 'Develop new feature' })).toBeInTheDocument()

    await user.click(within(card()).getByRole('button', { name: 'Mark complete' }))
    expect(await column('Completed').findByRole('article', { name: 'Develop new feature' })).toBeInTheDocument()
    expect(within(card()).queryAllByRole('button', { name: /accept|complete|flag|resume/i })).toHaveLength(0)
  })

  it('lets a member flag an issue and resume', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')
    const card = () => screen.getByRole('article', { name: 'Research new tech stack' })
    await user.click(within(card()).getByRole('button', { name: 'Flag issue' }))
    expect(await column('Needs attention').findByRole('article', { name: 'Research new tech stack' })).toBeInTheDocument()
    await user.click(within(card()).getByRole('button', { name: 'Resume' }))
    expect(await column('In progress').findByRole('article', { name: 'Research new tech stack' })).toBeInTheDocument()
  })

  it('shows task details read-only apart from the member’s allowed moves', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: 'Develop new feature' }))

    const props = screen.getByRole('region', { name: 'Task properties' })
    expect(within(props).queryByLabelText('Status')).not.toBeInTheDocument()
    expect(within(props).queryByRole('combobox')).not.toBeInTheDocument()
    const operations = within(screen.getByRole('region', { name: 'Task operations' }))
    expect(operations.getAllByRole('button').map((button) => button.textContent.trim())).toEqual(['Edit task'])

    await user.click(within(props).getByRole('button', { name: 'Accept task' }))
    await user.click(await within(props).findByRole('button', { name: 'Start work' }))
    expect(await within(props).findByRole('button', { name: 'Mark complete' })).toBeInTheDocument()
    expect(screen.getByText('Amit moved it to To do')).toBeInTheDocument()
    expect(screen.getByText('Amit moved it to In progress')).toBeInTheDocument()
  })
})
