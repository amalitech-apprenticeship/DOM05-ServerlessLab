import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/contract'
import { createHttpAdapter } from '../api/http/httpAdapter'
import { GENERIC_ERROR, userMessage } from '../utils/errors'

// Amplify is mocked so these tests never reach Cognito.
const amplify = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
  confirmSignIn: vi.fn(),
  fetchAuthSession: vi.fn(),
}))
vi.mock('aws-amplify/auth', () => amplify)
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }))

const SECRET = 'User pool client 12rs02ockg7vjeeoj385i7a6df does not exist.'
const awsError = (name, message = SECRET) => Object.assign(new Error(message), { name })
const leaks = (error) => /12rs02ockg7vjeeoj385i7a6df|pool|arn:aws|[0-9a-f]{8}-[0-9a-f]{4}-/i.test(error.message)

const signedIn = () =>
  amplify.fetchAuthSession.mockResolvedValue({
    tokens: { idToken: { toString: () => 'token', payload: { sub: 'u-1', email: 'a@b.co', 'cognito:groups': ['admin'] } } },
  })

const respondWith = (status, body) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) })

describe('Error messages never reveal internal details', () => {
  let api
  beforeEach(() => {
    vi.clearAllMocks()
    api = createHttpAdapter({ baseUrl: 'https://api.example.com' })
  })
  afterEach(() => vi.restoreAllMocks())

  it('only shows ApiError messages in the UI', () => {
    expect(userMessage(new ApiError('Task not found', 404))).toBe('Task not found')
    expect(userMessage(new Error(SECRET))).toBe(GENERIC_ERROR)
    expect(userMessage(awsError('ResourceNotFoundException'), 'Sign in failed.')).toBe('Sign in failed.')
    expect(userMessage(undefined)).toBe(GENERIC_ERROR)
  })

  it('replaces unknown Cognito sign-in errors (e.g. a missing app client) with a generic message', async () => {
    for (const name of ['ResourceNotFoundException', 'AuthUserPoolException', 'InternalErrorException', 'Unknown']) {
      amplify.signIn.mockRejectedValueOnce(awsError(name))
      const error = await api.auth.login('admin@example.com', 'secret').catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.message).toMatch(/isn’t available right now/)
      expect(leaks(error)).toBe(false)
    }
  })

  it('maps known sign-in errors to fixed messages, without the username or Cognito text', async () => {
    amplify.signIn.mockRejectedValueOnce(awsError('NotAuthorizedException', 'Incorrect username or password.'))
    await expect(api.auth.login('a@b.co', 'x')).rejects.toMatchObject({ message: 'We could not find an account with those details.', status: 401 })
    amplify.signIn.mockRejectedValueOnce(awsError('UserNotFoundException', 'User 4f1c2e8a-1111-2222-3333-444455556666 does not exist.'))
    const error = await api.auth.login('a@b.co', 'x').catch((e) => e)
    expect(error.message).toBe('We could not find an account with those details.')
    expect(leaks(error)).toBe(false)
  })

  it('does not reveal unsupported sign-in step names', async () => {
    amplify.signIn.mockResolvedValueOnce({ nextStep: { signInStep: 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP' } })
    const error = await api.auth.login('a@b.co', 'x').catch((e) => e)
    expect(error.message).not.toMatch(/TOTP|CONTINUE_SIGN_IN/)
  })

  it('keeps new-password errors generic', async () => {
    amplify.confirmSignIn.mockRejectedValueOnce(awsError('InvalidPasswordException', 'Password did not conform with policy: Password must have symbol characters'))
    await expect(api.auth.completeNewPassword('weak')).rejects.toMatchObject({ message: expect.stringMatching(/at least 8 characters/) })
    amplify.confirmSignIn.mockRejectedValueOnce(awsError('ResourceNotFoundException'))
    const error = await api.auth.completeNewPassword('Str0ng!pass').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(leaks(error)).toBe(false)
  })

  it('shows backend messages for user-facing 4xx errors only', async () => {
    signedIn()
    respondWith(400, { error: 'title is required' })
    await expect(api.tasks.create({ title: '' })).rejects.toMatchObject({ message: 'title is required', status: 400 })
    respondWith(500, { error: 'arn:aws:dynamodb:eu-west-1:123456789012:table/Tasks failed' })
    const serverError = await api.tasks.list().catch((e) => e)
    expect(serverError).toMatchObject({ status: 500, message: 'Something went wrong on our side. Please try again.' })
    respondWith(401, { message: 'Unauthorized' })
    await expect(api.tasks.list()).rejects.toMatchObject({ status: 401, message: 'Your session has expired. Please sign in again.' })
    respondWith(502, null)
    await expect(api.users.listMembers()).rejects.toMatchObject({ status: 502, message: expect.not.stringMatching(/arn|pool/i) })
  })

  it('reports not-implemented features without naming adapter internals', async () => {
    await expect(api.users.updateMember('u-1', { name: 'X' })).rejects.toMatchObject({ status: 501, message: 'This feature isn’t available yet.' })
  })
})
