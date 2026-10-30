import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import AuthProvider from '../context/AuthProvider'
import { ApiContext } from '../api/ApiContext'
import { createMockAdapter } from '../api/mock/mockAdapter'

export const ADMIN = { email: 'admin@test.dev', password: 'admin-pass' }
export const AMIT = { email: 'employee1@example.com', password: '123' }

const createMemoryStore = () => {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

// Each adapter behaves like a separate device: its own session, shared data.
export const createTestApi = (options = {}) =>
  createMockAdapter({
    storage: localStorage,
    sessionStore: createMemoryStore(),
    latencyMs: 0,
    adminCredentials: ADMIN,
    demoMemberPassword: AMIT.password,
    passwordIterations: 1000, // keep tests fast; production default is much higher
    ...options,
  })

export const renderApp = (api = createTestApi()) => {
  const user = userEvent.setup()
  render(
    <ApiContext.Provider value={api}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ApiContext.Provider>
  )
  return { api, user }
}

export const signIn = async (user, { email, password }) => {
  await user.type(await screen.findByLabelText('Email address'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  await screen.findByRole('button', { name: /log out/i })
}

export const goTo = async (user, name) => {
  const nav = screen.getByRole('navigation', { name: 'Main' })
  await user.click(within(nav).getByRole('button', { name: new RegExp(`^${name}`) }))
}

export const column = (status) => within(screen.getByRole('region', { name: `${status} column` }))
