import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo } from './helpers'

const as = async (api, who) => {
  await api.auth.login(who.email, who.password)
  return api
}

describe('Team members editing tasks (service)', () => {
  it('lets the assignee edit title, description and category, and tells the admins', async () => {
    const api = await as(createTestApi(), AMIT)
    const updated = await api.tasks.update('t-1', { title: 'Build the new feature', description: 'With tests.', category: 'Engineering' })
    expect(updated).toMatchObject({ title: 'Build the new feature', description: 'With tests.', category: 'Engineering' })
    expect(updated.history.at(-1)).toMatchObject({ action: 'edited', by: 'u-1' })
    expect((await api.notifications.list()).filter((item) => item.type === 'update')).toEqual([])

    await as(api, ADMIN)
    const [notification] = (await api.notifications.list()).filter((item) => item.type === 'update')
    expect(notification).toMatchObject({
      title: 'Task updated',
      taskId: 't-1',
      message: 'Amit updated "Build the new feature": title changed, description changed, category changed.',
    })
  })

  it('keeps the due date admin-only', async () => {
    const api = await as(createTestApi(), AMIT)
    const { dueDate } = await api.tasks.get('t-1')
    await expect(api.tasks.update('t-1', { dueDate: '2099-01-01' })).rejects.toMatchObject({ status: 403, message: 'Only admins can change the due date.' })
    await expect(api.tasks.update('t-1', { dueDate, title: 'Same date is fine' })).resolves.toMatchObject({ dueDate, title: 'Same date is fine' })
  })

  it('only allows editing your own, unarchived tasks', async () => {
    const admin = await as(createTestApi(), ADMIN)
    await admin.tasks.archive('t-2')
    const api = await as(createTestApi(), AMIT)
    await expect(api.tasks.update('t-4', { title: 'Not mine' })).rejects.toMatchObject({ status: 404 })
    await expect(api.tasks.update('t-2', { title: 'Archived' })).rejects.toMatchObject({ status: 409 })
  })
})

describe('Team members editing tasks (UI)', () => {
  it('edits a task from task details with the due date locked', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: 'Develop new feature' }))
    await user.click(screen.getByRole('button', { name: 'Edit Develop new feature' }))

    const form = screen.getByRole('form', { name: 'Edit task' })
    expect(within(form).getByLabelText(/due date/i)).toBeDisabled()
    expect(within(form).getByLabelText(/priority/i)).toBeDisabled()
    expect(within(form).getByText('Only admins can change the due date and priority.')).toBeInTheDocument()
    expect(within(form).queryByLabelText(/assign to/i)).not.toBeInTheDocument()

    const description = within(form).getByLabelText(/description/i)
    await user.clear(description)
    await user.type(description, 'Now with acceptance criteria.')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Now with acceptance criteria.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument()
    expect(screen.getByText('Amit edited the details')).toBeInTheDocument()
  })

  it('alerts the admin live when a team member edits a task', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await screen.findByRole('button', { name: 'Notifications, 0 unread' })

    const member = await as(createTestApi(), AMIT)
    await member.tasks.update('t-3', { description: 'Shortlisted three options.' })

    const toast = await screen.findByRole('status', {}, { timeout: 2000 })
    expect(within(toast).getByText('Amit updated "Research new tech stack": description changed.')).toBeInTheDocument()
  })
})
