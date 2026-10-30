import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo, column } from './helpers'

describe('Feature 1: admin CRUD tasks (service)', () => {
  it('lets an admin create, read, update and delete a task', async () => {
    const api = createTestApi()
    await api.auth.login(ADMIN.email, ADMIN.password)

    const created = await api.tasks.create({ title: '  Write spec ', dueDate: '2030-01-10', description: 'd' })
    expect(created).toMatchObject({ title: 'Write spec', category: 'General', status: 'new', assigneeId: null })
    expect(await api.tasks.get(created.id)).toEqual(created)

    const updated = await api.tasks.update(created.id, { title: 'Write full spec', category: 'Docs' })
    expect(updated).toMatchObject({ title: 'Write full spec', category: 'Docs', dueDate: '2030-01-10' })
    expect(updated.history.map((entry) => entry.action)).toEqual(['created', 'edited'])

    await api.tasks.remove(created.id)
    await expect(api.tasks.get(created.id)).rejects.toMatchObject({ status: 404 })
  })

  it('validates input', async () => {
    const api = createTestApi()
    await api.auth.login(ADMIN.email, ADMIN.password)
    await expect(api.tasks.create({ title: ' ', dueDate: '2030-01-10' })).rejects.toThrow(/title is required/i)
    await expect(api.tasks.create({ title: 'x', dueDate: 'tomorrow' })).rejects.toThrow(/valid due date/i)
  })

  it('rejects create, update and delete from non-admins', async () => {
    const api = createTestApi()
    await expect(api.tasks.list()).rejects.toMatchObject({ status: 401 })
    await api.auth.login(AMIT.email, AMIT.password)
    await expect(api.tasks.create({ title: 'x', dueDate: '2030-01-10' })).rejects.toMatchObject({ status: 403 })
    await expect(api.tasks.update('t-4', { title: 'hacked' })).rejects.toMatchObject({ status: 404 }) // not Amit's task
    await expect(api.tasks.remove('t-1')).rejects.toMatchObject({ status: 403 })
  })
})

describe('Feature 1: admin CRUD tasks (UI)', () => {
  const createTask = async (user, { title, dueDate, category, assignee }) => {
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'New task' }))
    const form = screen.getByRole('form', { name: 'Create task' })
    await user.type(within(form).getByLabelText(/task title/i), title)
    await user.type(within(form).getByLabelText(/due date/i), dueDate)
    if (category) await user.type(within(form).getByLabelText(/category/i), category)
    if (assignee) await user.selectOptions(within(form).getByLabelText(/assign to/i), assignee)
    await user.click(within(form).getByRole('button', { name: /create task/i }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'New task' })).not.toBeInTheDocument())
  }

  it('creates a task from the top bar and shows it on the board', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await createTask(user, { title: 'Prepare demo', dueDate: '2030-05-01', category: 'Sales' })

    await goTo(user, 'Task board')
    const card = await column('New').findByRole('article', { name: 'Prepare demo' })
    expect(within(card).getByText('Sales')).toBeInTheDocument()
    expect(within(card).getByText('Unassigned')).toBeInTheDocument()
  })

  it('closes the create dialog without saving on cancel or Escape', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'New task' }))
    await user.type(screen.getByLabelText(/task title/i), 'Never saved')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'New task' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await goTo(user, 'Task board')
    expect(screen.queryByText('Never saved')).not.toBeInTheDocument()
  })

  it('edits and deletes a task from the task details page', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await createTask(user, { title: 'Prepare demo', dueDate: '2030-05-01' })
    await goTo(user, 'Task board')
    await user.click(await screen.findByRole('button', { name: 'Prepare demo' }))

    await user.click(screen.getByRole('button', { name: 'Edit Prepare demo' }))
    const form = screen.getByRole('form', { name: 'Edit task' })
    const title = within(form).getByLabelText(/task title/i)
    await user.clear(title)
    await user.type(title, 'Prepare final demo')
    await user.click(within(form).getByRole('button', { name: /save changes/i }))
    expect(await screen.findByRole('heading', { name: 'Prepare final demo' })).toBeInTheDocument()
    expect(screen.getByText('Admin edited the details')).toBeInTheDocument()

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Delete Prepare final demo' }))
    expect(confirm).toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'Team task board' })).toBeInTheDocument()
    expect(screen.queryByText('Prepare final demo')).not.toBeInTheDocument()
  })

  it('edits and deletes from the list layout, respecting a cancelled confirm', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: /list/i }))
    const table = screen.getByRole('table', { name: 'All tasks' })

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    await user.click(within(table).getByRole('button', { name: 'Delete Design new logo' }))
    expect(within(table).getByText('Design new logo')).toBeInTheDocument()
    await user.click(within(table).getByRole('button', { name: 'Delete Design new logo' }))
    await vi.waitFor(() => expect(screen.queryByText('Design new logo')).not.toBeInTheDocument())

    await user.click(within(table).getByRole('button', { name: 'Edit Documentation update' }))
    const form = screen.getByRole('form', { name: 'Edit task' })
    await user.clear(within(form).getByLabelText(/category/i))
    await user.type(within(form).getByLabelText(/category/i), 'Docs')
    await user.click(within(form).getByRole('button', { name: /save changes/i }))
    const row = (await within(table).findByRole('button', { name: 'Documentation update' })).closest('tr')
    expect(await within(row).findByText('Docs')).toBeInTheDocument()
  })
})
