import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo } from './helpers'

const as = async (api, who) => {
  await api.auth.login(who.email, who.password)
  return api
}
const textFile = (name = 'notes.txt') => new File(['some notes'], name, { type: 'text/plain' })
const commentNotes = async (api) => (await api.notifications.list()).filter((item) => item.type === 'comment')

describe('ADM-07 / TM-04: comments and attachments on tasks (service)', () => {
  it('lets an admin comment with an attachment on any task, notifying the assignee', async () => {
    const api = await as(createTestApi(), ADMIN)
    const task = await api.tasks.addComment('t-4', { body: 'Please include the API section.', attachment: textFile('outline.txt') })
    expect(task.comments).toEqual([expect.objectContaining({ authorId: 'u-admin', body: 'Please include the API section.', attachment: expect.objectContaining({ name: 'outline.txt' }) })])

    await as(api, { email: 'employee2@example.com', password: AMIT.password })
    expect((await commentNotes(api))[0].message).toBe('Admin commented on "Documentation update": "Please include the API section."')
  })

  it('lets a member comment or attach on their own tasks only, notifying admins', async () => {
    const api = await as(createTestApi(), AMIT)
    await api.tasks.addComment('t-1', { attachment: textFile('draft.txt') })
    expect((await api.tasks.get('t-1')).comments[0]).toMatchObject({ authorId: 'u-1', body: '', attachment: { name: 'draft.txt' } })
    await expect(api.tasks.addComment('t-4', { body: 'Not mine' })).rejects.toMatchObject({ status: 404 })
    expect(await commentNotes(api)).toEqual([])

    await as(api, ADMIN)
    expect((await commentNotes(api))[0].message).toBe('Amit commented on "Develop new feature" and attached draft.txt')
  })

  it('validates comments and blocks them on archived tasks', async () => {
    const api = await as(createTestApi(), ADMIN)
    await expect(api.tasks.addComment('t-1', { body: '   ' })).rejects.toThrow(/write a comment or attach a file/i)
    await expect(api.tasks.addComment('t-1', { body: 'x'.repeat(2001) })).rejects.toThrow(/2000 characters/)
    await api.tasks.archive('t-2')
    await expect(api.tasks.addComment('t-2', { body: 'Late note' })).rejects.toMatchObject({ status: 409 })
  })

  it('lets authors delete their own comments and admins delete any', async () => {
    const admin = await as(createTestApi(), ADMIN)
    const member = await as(createTestApi(), AMIT)
    const adminComment = (await admin.tasks.addComment('t-1', { body: 'From admin' })).comments[0]
    const memberComment = (await member.tasks.addComment('t-1', { body: 'From Amit' })).comments[1]

    await expect(member.tasks.deleteComment('t-1', adminComment.id)).rejects.toMatchObject({ status: 403 })
    expect((await member.tasks.deleteComment('t-1', memberComment.id)).comments.map((c) => c.body)).toEqual(['From admin'])
    expect((await admin.tasks.deleteComment('t-1', adminComment.id)).comments).toEqual([])
    await expect(admin.tasks.deleteComment('t-1', 'missing')).rejects.toMatchObject({ status: 404 })
  })
})

describe('ADM-07 / TM-04: comments and attachments on tasks (UI)', () => {
  it('lets a team member post a comment with an attachment from task details', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: 'Develop new feature' }))

    const comments = within(screen.getByRole('region', { name: 'Comments' }))
    expect(comments.getByText('No comments yet.')).toBeInTheDocument()
    expect(comments.getByRole('button', { name: 'Post comment' })).toBeDisabled()
    await user.type(comments.getByLabelText('Comment'), 'Started on the API layer.')
    await user.upload(comments.getByLabelText('Attach a file to the comment'), textFile('api-notes.txt'))
    await user.click(comments.getByRole('button', { name: 'Post comment' }))

    const posted = await comments.findByRole('listitem', { name: 'Comment by Amit' })
    expect(within(posted).getByText('Started on the API layer.')).toBeInTheDocument()
    expect(within(posted).getByRole('link', { name: 'Download api-notes.txt' })).toBeInTheDocument()
    expect(comments.getByLabelText('Comment')).toHaveValue('')

    await goTo(user, 'Task board')
    expect(within(screen.getByRole('article', { name: 'Develop new feature' })).getByText(/comments/)).toBeInTheDocument()
  })

  it('lets an admin comment and delete comments', async () => {
    const member = await as(createTestApi(), AMIT)
    await member.tasks.addComment('t-3', { body: 'Blocked on access.' })

    const { user } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: 'Research new tech stack' }))
    const comments = within(screen.getByRole('region', { name: 'Comments' }))
    await user.type(comments.getByLabelText('Comment'), 'Access granted.')
    await user.click(comments.getByRole('button', { name: 'Post comment' }))
    expect(await comments.findByRole('listitem', { name: 'Comment by Admin' })).toBeInTheDocument()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(within(comments.getByRole('listitem', { name: 'Comment by Amit' })).getByRole('button', { name: 'Delete comment' }))
    await vi.waitFor(() => expect(comments.queryByRole('listitem', { name: 'Comment by Amit' })).not.toBeInTheDocument())
  })

  it('only offers delete on your own comments to team members', async () => {
    const admin = await as(createTestApi(), ADMIN)
    await admin.tasks.addComment('t-1', { body: 'Admin note' })
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: 'Develop new feature' }))
    const adminComment = await screen.findByRole('listitem', { name: 'Comment by Admin' })
    expect(within(adminComment).queryByRole('button', { name: 'Delete comment' })).not.toBeInTheDocument()
  })
})

describe('ADM-08: deactivate a team member', () => {
  it('reactivates a deactivated member, restoring sign-in and assignment', async () => {
    const api = await as(createTestApi(), ADMIN)
    await api.users.deactivateMember('u-1')
    await expect(api.auth.login(AMIT.email, AMIT.password)).rejects.toMatchObject({ status: 401 })

    await as(api, ADMIN)
    const member = await api.users.reactivateMember('u-1')
    expect(member).not.toHaveProperty('deactivatedAt')
    await expect(api.tasks.assign('t-9', 'u-1')).resolves.toMatchObject({ assigneeId: 'u-1' })
    expect((await api.tasks.get('t-1')).assigneeId).toBeNull() // previously unassigned work stays unassigned
    await expect(as(createTestApi(), AMIT)).resolves.toBeTruthy()
    await expect(api.users.reactivateMember('u-admin')).rejects.toMatchObject({ status: 404 })
  })

  it('migrates members removed by older builds to deactivated', async () => {
    await as(createTestApi(), ADMIN) // seeds the users
    const users = JSON.parse(localStorage.getItem('ets.users')).map((user) => (user.id === 'u-5' ? { ...user, removedAt: '2026-01-01T00:00:00.000Z' } : user))
    localStorage.setItem('ets.users', JSON.stringify(users))
    const fresh = await as(createTestApi(), ADMIN)
    const sanya = (await fresh.users.listMembers()).find((member) => member.id === 'u-5')
    expect(sanya).toMatchObject({ deactivatedAt: '2026-01-01T00:00:00.000Z' })
    expect(sanya).not.toHaveProperty('removedAt')
  })

  it('deactivates and reactivates from the Team members page', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Team members')
    const table = () => within(screen.getByRole('table', { name: 'Team members' }))
    const filters = within(screen.getByRole('group', { name: 'Filter team members' }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await user.click(await table().findByRole('button', { name: 'Deactivate Sanya' }))
    expect(await screen.findByText('Sanya was deactivated.')).toBeInTheDocument()
    expect(table().queryByText('Sanya', { selector: 'strong' })).not.toBeInTheDocument()
    expect(screen.getByText(/4 active, 1 deactivated/)).toBeInTheDocument()

    await user.selectOptions(filters.getByLabelText('Status'), 'Deactivated')
    const row = table().getByText('Sanya', { selector: 'strong' }).closest('tr')
    expect(within(row).getByText('Deactivated')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: 'Reactivate Sanya' }))
    expect(await screen.findByText('Sanya was reactivated and can sign in again.')).toBeInTheDocument()

    await user.selectOptions(filters.getByLabelText('Status'), 'Active')
    expect(table().getByText('Sanya', { selector: 'strong' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'New task' }))
    expect(within(screen.getByLabelText(/assign to/i)).getByRole('option', { name: 'Sanya' })).toBeInTheDocument()
  })
})

describe('TM-02: status flow New → To do → In progress → Completed', () => {
  it('only allows the next step in order', async () => {
    const api = await as(createTestApi(), AMIT)
    await expect(api.tasks.updateStatus('t-1', 'completed')).rejects.toMatchObject({ status: 403 })
    expect((await api.tasks.updateStatus('t-1', 'to_do')).status).toBe('to_do')
    await expect(api.tasks.updateStatus('t-1', 'completed')).rejects.toMatchObject({ status: 403 })
    await expect(api.tasks.updateStatus('t-1', 'new')).rejects.toMatchObject({ status: 403 })
    expect((await api.tasks.updateStatus('t-1', 'in_progress')).status).toBe('in_progress')
    expect((await api.tasks.updateStatus('t-1', 'completed')).status).toBe('completed')
  })

  it('walks a task through every column on the board', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')
    const card = () => screen.getByRole('article', { name: 'Develop new feature' })
    const inColumn = (name) => within(screen.getByRole('region', { name: `${name} column` })).findByRole('article', { name: 'Develop new feature' })

    expect(await inColumn('New')).toBeInTheDocument()
    await user.click(within(card()).getByRole('button', { name: 'Accept task' }))
    expect(await inColumn('To do')).toBeInTheDocument()
    expect(within(card()).getAllByRole('button').map((button) => button.textContent)).toContain('Start work')
    await user.click(within(card()).getByRole('button', { name: 'Start work' }))
    expect(await inColumn('In progress')).toBeInTheDocument()
    await user.click(within(card()).getByRole('button', { name: 'Mark complete' }))
    expect(await inColumn('Completed')).toBeInTheDocument()
  })

  it('shows To do in the admin status tracker and status picker', async () => {
    const member = await as(createTestApi(), AMIT)
    await member.tasks.updateStatus('t-1', 'to_do')
    const { user } = renderApp()
    await signIn(user, ADMIN)
    expect(within(screen.getByRole('region', { name: 'Status tracker' })).getByRole('button', { name: 'To do: 1' })).toBeInTheDocument()
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: 'Develop new feature' }))
    expect(screen.getByLabelText('Status')).toHaveDisplayValue('To do')
  })
})
