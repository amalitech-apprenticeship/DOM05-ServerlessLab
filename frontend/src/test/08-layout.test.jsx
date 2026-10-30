import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { ADMIN, AMIT, renderApp, signIn, goTo, column } from './helpers'

const nav = () => within(screen.getByRole('navigation', { name: 'Main' }))
const cardTitles = () => screen.queryAllByRole('article').map((card) => card.getAttribute('aria-label')).sort()

describe('App shell, board filters and task details', () => {
  it('marks the current page in the sidebar and shows open counts', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    expect(nav().getByRole('button', { name: /^Dashboard/ })).toHaveAttribute('aria-current', 'page')
    expect(nav().getByRole('button', { name: /^Task board/ })).toHaveTextContent('7')

    await goTo(user, 'Task board')
    expect(nav().getByRole('button', { name: /^Task board/ })).toHaveAttribute('aria-current', 'page')
    expect(nav().getByRole('button', { name: /^Dashboard/ })).not.toHaveAttribute('aria-current')
  })

  it('searches by title, category or assignee and jumps to the board', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    const search = screen.getByRole('searchbox', { name: 'Search tasks' })

    await user.type(search, 'priya')
    expect(screen.getByRole('heading', { name: 'Team task board' })).toBeInTheDocument()
    expect(cardTitles()).toEqual(['Documentation update', 'Fix bug in development'])

    await user.clear(search)
    await user.type(search, 'design')
    expect(cardTitles()).toEqual(['Design new UI layout', 'Design new logo'])

    await user.clear(search)
    expect(screen.getAllByRole('article')).toHaveLength(9)
  })

  it('filters the board by category chip and assignee avatar', async () => {
    const { user } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Task board')

    await user.click(screen.getByRole('button', { name: 'Testing' }))
    expect(cardTitles()).toEqual(['Quality assurance testing', 'Testing module 2'])
    await user.click(screen.getByRole('button', { name: 'Testing' }))

    await user.click(screen.getByRole('button', { name: 'Only Ravi' }))
    expect(screen.getByRole('button', { name: 'Only Ravi' })).toHaveAttribute('aria-pressed', 'true')
    expect(cardTitles()).toEqual(['Design new UI layout', 'Final research report'])
    expect(column('Completed').getByRole('article', { name: 'Final research report' })).toBeInTheDocument()
  })

  it('offers a task picker when no task is selected', async () => {
    const { user } = renderApp()
    await signIn(user, AMIT)
    await goTo(user, 'Task details')
    expect(screen.getByText('Pick a task to see its details')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Testing module 2' }))
    expect(screen.getByRole('heading', { name: 'Testing module 2' })).toBeInTheDocument()
  })

  it('lets an admin change any status from task details', async () => {
    const { user, api } = renderApp()
    await signIn(user, ADMIN)
    await goTo(user, 'Task board')
    await user.click(screen.getByRole('button', { name: 'Testing module 2' }))

    await user.selectOptions(screen.getByLabelText('Status'), 'In progress')
    await vi.waitFor(async () => expect((await api.tasks.get('t-2')).status).toBe('in_progress'))
    expect(await screen.findByText('Admin moved it to In progress')).toBeInTheDocument()
  })
})
