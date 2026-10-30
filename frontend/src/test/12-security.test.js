import { describe, expect, it } from 'vitest'
import { ADMIN, AMIT, createTestApi } from './helpers'
import { ApiConfigError, createApi } from '../api'
import { hashPassword, verifyPassword } from '../api/mock/passwords'

const storedUsers = () => JSON.parse(localStorage.getItem('ets.users'))
const allStorage = () => Object.keys(localStorage).map((key) => localStorage.getItem(key)).join('\n')

describe('Security: no plaintext passwords (review finding 2)', () => {
  it('stores only salted hashes, even for temporary passwords', async () => {
    const api = createTestApi()
    await api.auth.login(ADMIN.email, ADMIN.password)
    const { temporaryPassword } = await api.users.createMember({ name: 'Sasha', email: 'sasha@example.com' })

    for (const user of storedUsers()) {
      expect(user).not.toHaveProperty('password')
      expect(user.credential).toMatchObject({ algorithm: 'PBKDF2-SHA256', salt: expect.stringMatching(/^[0-9a-f]{32}$/), hash: expect.stringMatching(/^[0-9a-f]{64}$/) })
    }
    const salts = storedUsers().map((user) => user.credential.salt)
    expect(new Set(salts).size).toBe(salts.length) // unique salt per account

    const dump = allStorage()
    expect(dump).not.toContain(ADMIN.password)
    expect(dump).not.toContain(temporaryPassword)
    expect(dump).not.toMatch(/"password"/)
  })

  it('never returns credentials from the API', async () => {
    const api = createTestApi()
    const session = await api.auth.login(ADMIN.email, ADMIN.password)
    expect(session.user).not.toHaveProperty('credential')
    expect(await api.auth.getSession()).not.toHaveProperty('user.credential')
    for (const member of await api.users.listMembers()) {
      expect(member).not.toHaveProperty('credential')
      expect(member).not.toHaveProperty('password')
    }
  })

  it('migrates plaintext passwords saved by older builds', async () => {
    localStorage.setItem('ets.users', JSON.stringify([
      { id: 'u-admin', name: 'Admin', email: ADMIN.email, password: ADMIN.password, role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'u-9', name: 'Old Member', email: 'old@example.com', password: 'legacy-pass', role: 'member', createdAt: '2026-01-01T00:00:00.000Z' },
    ]))
    const api = createTestApi()
    await expect(api.auth.login('old@example.com', 'legacy-pass')).resolves.toMatchObject({ user: { name: 'Old Member' } })
    expect(allStorage()).not.toContain('legacy-pass')
    expect(storedUsers().every((user) => !('password' in user) && user.credential)).toBe(true)
  })

  it('has no hardcoded demo password: seeded members need VITE_DEMO_MEMBER_PASSWORD', async () => {
    const api = createTestApi({ demoMemberPassword: '' })
    await expect(api.auth.login(AMIT.email, '123')).rejects.toMatchObject({ status: 401 })
    await expect(api.auth.login(AMIT.email, '')).rejects.toMatchObject({ status: 401 })
  })

  it('follows a changed admin password from the env', async () => {
    await createTestApi().auth.login(ADMIN.email, ADMIN.password)
    const rotated = createTestApi({ adminCredentials: { email: ADMIN.email, password: 'rotated-secret' } })
    await expect(rotated.auth.login(ADMIN.email, ADMIN.password)).rejects.toMatchObject({ status: 401 })
    await expect(rotated.auth.login(ADMIN.email, 'rotated-secret')).resolves.toBeTruthy()
  })

  it('hashes with a random salt and verifies correctly', async () => {
    const a = await hashPassword('s3cret', 1000)
    const b = await hashPassword('s3cret', 1000)
    expect(a.hash).not.toBe(b.hash)
    expect(await verifyPassword('s3cret', a)).toBe(true)
    expect(await verifyPassword('S3cret', a)).toBe(false)
    expect(await verifyPassword('s3cret', null)).toBe(false)
    expect(await hashPassword('')).toBeNull()
  })
})

describe('Security: the insecure mock never backs a production build (review finding 1)', () => {
  it('refuses mock mode in production unless explicitly allowed', () => {
    expect(() => createApi({ PROD: true })).toThrow(ApiConfigError)
    expect(() => createApi({ PROD: true, VITE_API_MODE: 'mock' })).toThrow(/not secure/)
    expect(createApi({ PROD: true, VITE_ALLOW_MOCK_IN_PRODUCTION: 'true' })).toHaveProperty('auth.login')
  })

  it('uses the http adapter when configured, and the mock in development', async () => {
    const http = createApi({ PROD: true, VITE_API_MODE: 'http', VITE_API_BASE_URL: 'https://api.example.com' })
    await expect(http.auth.login('a', 'b')).rejects.toMatchObject({ status: 501 })
    expect(createApi({ PROD: false })).toHaveProperty('tasks.archive')
    expect(() => createApi({ VITE_API_MODE: 'graphql' })).toThrow(/Unknown VITE_API_MODE/)
  })
})
