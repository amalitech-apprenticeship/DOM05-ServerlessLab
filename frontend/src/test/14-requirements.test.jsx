import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, createTestApi, renderApp, signIn, goTo } from './helpers'

const as = async (api, who) => {
  await api.auth.login(who.email, who.password)
  return api
}

describe('ADM-01: task priority', () => {
  it('stores a priority, defaulting to medium and rejecting unknown values', async () => {
    const api = await as(createTestApi(), ADMIN)
    expect(await api.tasks.create({ title: 'Ship', dueDate: '2030-01-10', priority: 'urgent' })).toMatchObject({ priority: 'urgent' })
    expect(await api.tasks.create({ title: 'Later', dueDate: '2030-01-10' })).toMatchObject({ priority: 'medium' })
    await expect(api.tasks.create({ title: 'X', dueDate: '2030-01-10', priority: 'critical' })).rejects.toThrow(/unknown priority/i)
  })

  it('lets admins change it, notifying the assignee, but not team members', async () => {
    const api = await as(createTestApi(), ADMIN)
    await api.tasks.update('t-1', { priority: 'urgent' })

    await as(api, AMIT)
    expect((await api.notifications.list()).find((item) => item.type === 'update').message)
      .toBe('"Develop new feature" was updated: priority is now Urgent.')
    await expect(api.tasks.update('t-1', { priority: 'low' })).rejects.toMatchObject({ status: 403, message: 'Only admins can change the priority.' })
  })

  it('gives tasks saved without a priority the default', async () => {
    localStorage.setItem('ets.tasks', JSON.stringify([{ id: 't-old', title: 'Old', description: '', category: 'General', dueDate: '2030-01-01', assigneeId: null, status: 'new', createdBy: 'u-admin', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', history: [] }]))
    const api = await as(createTestApi(), ADMIN)
    expect((await api.tasks.get('t-old')).priority).toBe('medium')
  })

  it('is set when creating and shown on the board and task details', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'New task' }))
    const form = screen.getByRole('form', { name: 'Create task' })
    expect(within(form).getByLabelText(/priority/i)).toHaveDisplayValue('Medium')
    await user.type(within(form).getByLabelText(/task title/i), 'Hotfix login')
    await user.type(within(form).getByLabelText(/due date/i), '2030-05-01')
    await user.selectOptions(within(form).getByLabelText(/priority/i), 'Urgent')
    await user.click(within(form).getByRole('button', { name: /create task/i }))

    await goTo(user, 'Task board')
    const card = await screen.findByRole('article', { name: 'Hotfix login' })
    expect(within(card).getByText('Urgent')).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Hotfix login' }))
    expect(within(screen.getByRole('region', { name: 'Task properties' })).getByText('Urgent')).toBeInTheDocument()
  })
})

const textFile = (name = 'brief.txt', content = 'hello world') => new File([content], name, { type: 'text/plain' })

describe('ADM-01: optional attachment', () => {
  it('stores an attachment on create, readable by the assignee', async () => {
    const api = await as(createTestApi(), ADMIN)
    const task = await api.tasks.create({ title: 'Read brief', dueDate: '2030-01-10', assigneeId: 'u-1', attachment: textFile() })
    expect(task.attachment).toMatchObject({ name: 'brief.txt', type: 'text/plain', size: 11, url: expect.stringMatching(/^data:text\/plain;base64,/) })
    expect((await api.tasks.create({ title: 'No file', dueDate: '2030-01-10' })).attachment).toBeNull()

    await as(api, AMIT)
    expect((await api.tasks.get(task.id)).attachment.name).toBe('brief.txt')
  })

  it('rejects files over the size limit', async () => {
    const api = await as(createTestApi(), ADMIN)
    const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.bin')
    await expect(api.tasks.create({ title: 'Big', dueDate: '2030-01-10', attachment: big })).rejects.toMatchObject({ status: 413, message: 'Attachments must be 1 MB or smaller.' })
  })

  it('lets admins replace and remove it, telling the assignee; team members cannot', async () => {
    const api = await as(createTestApi(), ADMIN)
    await api.tasks.update('t-1', { attachment: textFile('spec.pdf') })
    expect((await api.tasks.get('t-1')).attachment.name).toBe('spec.pdf')
    await api.tasks.update('t-1', { attachment: null })
    expect((await api.tasks.get('t-1')).attachment).toBeNull()
    await api.tasks.update('t-1', { attachment: null }) // nothing to remove: no-op

    await as(api, AMIT)
    const messages = (await api.notifications.list()).filter((item) => item.type === 'update').map((item) => item.message)
    expect(messages).toEqual([
      '"Develop new feature" was updated: attachment removed.',
      '"Develop new feature" was updated: attachment spec.pdf added.',
    ])
    await expect(api.tasks.update('t-1', { attachment: textFile() })).rejects.toMatchObject({ status: 403, message: 'Only admins can change the attachment.' })
  })

  it('is added from the create form and downloadable from task details', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'New task' }))
    const form = screen.getByRole('form', { name: 'Create task' })
    await user.type(within(form).getByLabelText(/task title/i), 'Review brief')
    await user.type(within(form).getByLabelText(/due date/i), '2030-05-01')
    await user.upload(within(form).getByLabelText('Attachment'), textFile())
    expect(within(form).getByText('brief.txt')).toBeInTheDocument()
    await user.click(within(form).getByRole('button', { name: /create task/i }))

    await goTo(user, 'Task board')
    const card = await screen.findByRole('article', { name: 'Review brief' })
    expect(within(card).getByText('Has attachment')).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Review brief' }))
    const link = screen.getByRole('link', { name: 'Download brief.txt' })
    expect(link).toHaveAttribute('download', 'brief.txt')
    expect(link.getAttribute('href')).toMatch(/^data:text\/plain;base64,/)

    await user.click(screen.getByRole('button', { name: 'Edit Review brief' }))
    await user.click(within(screen.getByRole('form', { name: 'Edit task' })).getByRole('button', { name: 'Remove' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await within(screen.getByRole('article', { name: 'Task details' })).findByText('Admin edited the details')
    expect(screen.queryByRole('link', { name: 'Download brief.txt' })).not.toBeInTheDocument()
  })

  it('blocks oversized files in the form before uploading', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'New task' }))
    const form = screen.getByRole('form', { name: 'Create task' })
    await user.upload(within(form).getByLabelText('Attachment'), new File([new Uint8Array(1024 * 1024 + 1)], 'big.bin'))
    expect(within(form).getByRole('alert')).toHaveTextContent('Attachments must be 1 MB or smaller.')
    expect(within(form).queryByText('big.bin')).not.toBeInTheDocument()
  })

  it('is downloadable by team members, who cannot change it', async () => {
    const admin = await as(createTestApi(), ADMIN)
    await admin.tasks.update('t-1', { attachment: textFile('spec.txt') })
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: 'Develop new feature' }))
    expect(screen.getByRole('link', { name: 'Download spec.txt' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit Develop new feature' }))
    expect(within(screen.getByRole('form', { name: 'Edit task' })).queryByLabelText('Attachment')).not.toBeInTheDocument()
  })
})

describe('ADM-03: view all tasks filtered by status, assignee and deadline', () => {
  const cardTitles = () => screen.queryAllByRole('article').map((card) => card.getAttribute('aria-label')).sort()

  it('filters the board by deadline, combined with assignee', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Task board')
    expect(cardTitles()).toHaveLength(9)

    await user.selectOptions(screen.getByLabelText('Deadline'), 'Overdue')
    expect(cardTitles()).toEqual(['Research new tech stack'])
    await user.selectOptions(screen.getByLabelText('Deadline'), 'Upcoming')
    expect(cardTitles()).toEqual(['Design new UI layout', 'Design new logo', 'Documentation update', 'Quality assurance testing'])
    await user.click(screen.getByRole('button', { name: 'Only Ravi' }))
    expect(cardTitles()).toEqual(['Design new UI layout'])

    await user.selectOptions(screen.getByLabelText('Deadline'), 'Any deadline')
    expect(cardTitles()).toEqual(['Design new UI layout', 'Final research report'])
  })
})

describe('ADM-06: view all members filtered by name, open tasks and completed tasks', () => {
  const names = () =>
    within(screen.getByRole('table', { name: 'Team members' }))
      .queryAllByRole('row')
      .slice(1)
      .map((row) => row.querySelector('strong')?.textContent)
      .filter(Boolean)

  it('filters by name, open tasks and completed tasks, alone or combined', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Team members')
    await screen.findByText('Amit', { selector: 'strong' })
    const filters = within(screen.getByRole('group', { name: 'Filter team members' }))
    expect(names()).toEqual(['Amit', 'Priya', 'Ravi', 'Neha', 'Sanya'])
    expect(filters.getByText('5 of 5 shown')).toBeInTheDocument()

    await user.type(filters.getByLabelText('Filter by name'), 'YA')
    expect(names()).toEqual(['Priya', 'Sanya'])
    await user.clear(filters.getByLabelText('Filter by name'))

    await user.selectOptions(filters.getByLabelText('Open tasks'), 'No open tasks')
    expect(names()).toEqual(['Sanya'])
    await user.selectOptions(filters.getByLabelText('Open tasks'), 'Has open tasks')
    expect(names()).toEqual(['Amit', 'Priya', 'Ravi', 'Neha'])

    await user.selectOptions(filters.getByLabelText('Completed'), 'Has completed tasks')
    expect(names()).toEqual(['Amit', 'Ravi'])
    await user.type(filters.getByLabelText('Filter by name'), 'r')
    expect(names()).toEqual(['Ravi'])
    expect(filters.getByText('1 of 5 shown')).toBeInTheDocument()

    await user.selectOptions(filters.getByLabelText('Completed'), 'None completed')
    expect(names()).toEqual(['Priya'])

    await user.type(filters.getByLabelText('Filter by name'), 'zz')
    expect(names()).toEqual([])
    expect(screen.getByText('No team members match these filters.')).toBeInTheDocument()
  })
})
