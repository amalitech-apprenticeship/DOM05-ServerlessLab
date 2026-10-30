import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo } from './helpers'

const as = async (api, email, password) => {
  await api.auth.login(email, password)
  return api
}
const asAdmin = () => as(createTestApi(), ADMIN.email, ADMIN.password)

describe('Team members (service)', () => {
  it('adds a member who can sign in, be assigned work and see only their own tasks', async () => {
    const api = await asAdmin()
    const { user, temporaryPassword } = await api.users.createMember({ name: ' Sasha Moss ', email: 'Sasha.Moss@Example.com' })
    expect(user).toMatchObject({ name: 'Sasha Moss', email: 'sasha.moss@example.com', role: 'member' })
    expect(user).not.toHaveProperty('password')
    expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{12}$/)
    expect((await api.users.listMembers()).map((member) => member.name)).toContain('Sasha Moss')

    await api.tasks.assign('t-9', user.id)
    const sasha = await as(createTestApi(), 'sasha.moss@example.com', temporaryPassword)
    expect((await sasha.tasks.list()).map((task) => task.id)).toEqual(['t-9'])
    expect((await sasha.notifications.list())[0]).toMatchObject({ type: 'assignment', taskId: 't-9' })
  })

  it('validates name, email and uniqueness', async () => {
    const api = await asAdmin()
    await expect(api.users.createMember({ name: ' ', email: 'a@b.co' })).rejects.toThrow(/name is required/i)
    await expect(api.users.createMember({ name: 'X', email: 'not-an-email' })).rejects.toThrow(/valid email/i)
    await expect(api.users.createMember({ name: 'X', email: 'two@@example.com' })).rejects.toThrow(/valid email/i)
    await expect(api.users.createMember({ name: 'X', email: AMIT.email.toUpperCase() })).rejects.toMatchObject({ status: 409 })
    await expect(api.users.createMember({ name: 'X', email: ADMIN.email })).rejects.toMatchObject({ status: 409 })
  })

  it('updates a member’s name and email', async () => {
    const api = await asAdmin()
    expect(await api.users.updateMember('u-1', { name: 'Amit Shah' })).toMatchObject({ name: 'Amit Shah', email: AMIT.email })
    await expect(api.users.updateMember('u-1', { email: 'employee2@example.com' })).rejects.toMatchObject({ status: 409 })
    await expect(api.users.updateMember('u-admin', { name: 'Not a member' })).rejects.toMatchObject({ status: 404 })

    await api.users.updateMember('u-1', { email: 'amit@example.com' })
    await expect(api.auth.login(AMIT.email, AMIT.password)).rejects.toMatchObject({ status: 401 })
    await expect(api.auth.login('amit@example.com', AMIT.password)).resolves.toMatchObject({ user: { name: 'Amit Shah' } })
  })

  it('deactivates a member: blocks access, unassigns open tasks, keeps completed history', async () => {
    const api = await asAdmin()
    const amit = await as(createTestApi(), AMIT.email, AMIT.password)

    expect(await api.users.deactivateMember('u-1')).toEqual({ id: 'u-1', unassignedTasks: 2 })

    const tasks = await api.tasks.list()
    const byId = (id) => tasks.find((task) => task.id === id)
    expect(byId('t-1')).toMatchObject({ assigneeId: null, status: 'new' })
    expect(byId('t-3')).toMatchObject({ assigneeId: null, status: 'new' })
    expect(byId('t-3').history.at(-1)).toMatchObject({ action: 'assigned', assigneeId: null, by: 'u-admin' })
    expect(byId('t-2')).toMatchObject({ assigneeId: 'u-1', status: 'completed' })

    expect((await api.users.listMembers()).find((member) => member.id === 'u-1').deactivatedAt).toEqual(expect.any(String))
    await expect(amit.tasks.list()).rejects.toMatchObject({ status: 401 })
    await expect(api.auth.login(AMIT.email, AMIT.password)).rejects.toMatchObject({ status: 401 })
    await expect(api.tasks.assign('t-9', 'u-1')).rejects.toThrow(/team members/i)
    await expect(api.users.deactivateMember('u-1')).rejects.toMatchObject({ status: 404 })

    // The email stays reserved so the account can be reactivated.
    await expect(api.users.createMember({ name: 'New Amit', email: AMIT.email })).rejects.toMatchObject({ status: 409 })
  })

  it('is admin-only', async () => {
    const api = await as(createTestApi(), AMIT.email, AMIT.password)
    await expect(api.users.listMembers()).rejects.toMatchObject({ status: 403 })
    await expect(api.users.createMember({ name: 'Friend', email: 'friend@example.com' })).rejects.toMatchObject({ status: 403 })
    await expect(api.users.updateMember('u-2', { name: 'Hacked' })).rejects.toMatchObject({ status: 403 })
    await expect(api.users.deactivateMember('u-2')).rejects.toMatchObject({ status: 403 })
    await expect(api.users.reactivateMember('u-2')).rejects.toMatchObject({ status: 403 })
  })
})

describe('Team members (UI)', () => {
  const table = () => within(screen.getByRole('table', { name: 'Team members' }))
  const rowOf = (name) => table().getByText(name, { selector: 'strong' }).closest('tr')

  const openTeam = async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Team members')
    await table().findByText('Amit', { selector: 'strong' })
    return user
  }

  const addMember = async (user, name, email) => {
    await user.click(screen.getByRole('button', { name: 'Add team member' }))
    const form = screen.getByRole('form', { name: 'Add team member' })
    await user.type(within(form).getByLabelText(/full name/i), name)
    await user.type(within(form).getByLabelText(/email address/i), email)
    await user.click(within(form).getByRole('button', { name: 'Add member' }))
    return screen.findByRole('region', { name: 'New member credentials' })
  }

  it('lists the team with their open and completed task counts', async () => {
    await openTeam()
    expect(table().getAllByRole('row')).toHaveLength(6) // header + 5 members
    expect(within(rowOf('Amit')).getAllByRole('cell').map((cell) => cell.textContent).slice(1, 4)).toEqual([AMIT.email, '2', '1'])
  })

  it('adds a member who is then assignable, and shows the temporary password once', async () => {
    const user = await openTeam()
    const credentials = await addMember(user, 'Sasha Moss', 'sasha@example.com')
    expect(within(credentials).getByText('sasha@example.com')).toBeInTheDocument()
    expect(within(credentials).getByText(/^[A-Za-z0-9]{12}$/)).toBeInTheDocument()
    await user.click(within(credentials).getByRole('button', { name: 'Done' }))
    expect(rowOf('Sasha Moss')).toBeInTheDocument()
    expect(screen.queryByText(/^[A-Za-z0-9]{12}$/)).not.toBeInTheDocument()

    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'New task' }))
    expect(within(screen.getByLabelText(/assign to/i)).getByRole('option', { name: 'Sasha Moss' })).toBeInTheDocument()
  })

  it('edits a member', async () => {
    const user = await openTeam()
    await user.click(table().getByRole('button', { name: 'Edit Priya' }))
    const form = screen.getByRole('form', { name: 'Edit team member' })
    await user.clear(within(form).getByLabelText(/full name/i))
    await user.type(within(form).getByLabelText(/full name/i), 'Priya Patel')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))
    expect(await table().findByText('Priya Patel', { selector: 'strong' })).toBeInTheDocument()
  })

  it('deactivates a member after confirming, unassigning their open work', async () => {
    const user = await openTeam()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)

    await user.click(table().getByRole('button', { name: 'Deactivate Amit' }))
    expect(confirm.mock.calls[0][0]).toContain('Their 2 open tasks will be unassigned.')
    expect(rowOf('Amit')).toBeInTheDocument()

    await user.click(table().getByRole('button', { name: 'Deactivate Amit' }))
    expect(await screen.findByText('Amit was deactivated. 2 open tasks are now unassigned.')).toBeInTheDocument()
    expect(table().queryByText('Amit', { selector: 'strong' })).not.toBeInTheDocument()

    await goTo(user, 'Task board')
    expect(within(screen.getByRole('article', { name: 'Develop new feature' })).getByText('Unassigned')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Testing module 2' })).getByText('Amit (deactivated)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Only Amit' })).not.toBeInTheDocument()
  })

  it('shows service validation errors in the form', async () => {
    const user = await openTeam()
    await user.click(screen.getByRole('button', { name: 'Add team member' }))
    const form = screen.getByRole('form', { name: 'Add team member' })
    await user.type(within(form).getByLabelText(/full name/i), 'Copycat')
    await user.type(within(form).getByLabelText(/email address/i), AMIT.email)
    await user.click(within(form).getByRole('button', { name: 'Add member' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('Another account already uses that email.')
  })

  it('lets a newly added member sign in to their own workspace', async () => {
    const user = await openTeam()
    const credentials = await addMember(user, 'Sasha Moss', 'sasha@example.com')
    const password = within(credentials).getByText(/^[A-Za-z0-9]{12}$/).textContent
    await user.click(within(credentials).getByRole('button', { name: 'Done' }))

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await signIn(user, { email: 'sasha@example.com', password })
    expect(within(screen.getByRole('banner')).getByText('Sasha Moss')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText('Team member')).toBeInTheDocument()
  })

  it('is not available to team members', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toHaveTextContent('Team members')
  })
})
