import { Amplify } from 'aws-amplify'
import { confirmSignIn, fetchAuthSession, signIn, signOut } from 'aws-amplify/auth'
import { ApiError, ROLES } from '../contract'

// Backend adapter: API Gateway (HTTP API) + Lambda, signed in through Amazon Cognito.
// Each method resolves to the shapes in ../contract.js or rejects with an ApiError carrying
// an HTTP status, matching the mock adapter.

// Error messages shown to users must never include raw Amplify/Cognito/AWS text: those can
// contain user pool or client ids, usernames and other configuration details. Every error
// this adapter throws uses one of the fixed messages below (or a backend 4xx message, which
// the Lambdas keep generic). The raw error is logged to the console in local development only.
const logDevError = (context, error) => {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') console.warn(`[api] ${context}`, error)
}

// Tagged so the UI can hide features the backend doesn't support yet.
const notImplemented = (name) =>
  Object.assign(
    () => {
      logDevError(`${name} is not implemented in the http adapter`)
      return Promise.reject(new ApiError('This feature isn’t available yet.', 501))
    },
    { notImplemented: true }
  )

const NEW_PASSWORD_STEP = 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
const PASSWORD_RULES =
  'Passwords need at least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.'

const MESSAGES = {
  invalidCredentials: 'We could not find an account with those details.',
  signInUnavailable: 'Sign-in isn’t available right now. Please try again later.',
  unsupportedStep: 'This account needs a sign-in step that isn’t supported here. Contact your workspace admin.',
  tooManyAttempts: 'Too many attempts. Wait a few minutes and try again.',
  offline: 'Could not reach the server. Check your connection and try again.',
  sessionExpired: 'Your session has expired. Please sign in again.',
}

// Known Cognito/Amplify sign-in error names → safe messages. Anything else is a configuration
// or service problem, shown as MESSAGES.signInUnavailable.
const SIGN_IN_ERRORS = {
  NotAuthorizedException: MESSAGES.invalidCredentials,
  UserNotFoundException: MESSAGES.invalidCredentials,
  EmptySignInUsername: 'Enter your email address.',
  EmptySignInPassword: 'Enter your password.',
  PasswordResetRequiredException: 'Your password needs to be reset. Contact your workspace admin.',
  UserNotConfirmedException: 'This account isn’t ready yet. Contact your workspace admin.',
  TooManyRequestsException: MESSAGES.tooManyAttempts,
  LimitExceededException: MESSAGES.tooManyAttempts,
  NetworkError: MESSAGES.offline,
}

const NEW_PASSWORD_ERRORS = {
  InvalidPasswordException: `That password isn’t allowed. ${PASSWORD_RULES}`,
  InvalidParameterException: `That password isn’t allowed. ${PASSWORD_RULES}`,
  EmptyChallengeResponse: 'Enter a new password.',
  NotAuthorizedException: 'Your sign-in expired. Sign in again with your temporary password.',
  SignInException: 'Your sign-in expired. Sign in again with your temporary password.',
  TooManyRequestsException: MESSAGES.tooManyAttempts,
  LimitExceededException: MESSAGES.tooManyAttempts,
  NetworkError: MESSAGES.offline,
}

// Backend statuses whose { error } text is written for users (validation, permission, not found,
// conflict). Anything else gets a fixed message for its status.
const USER_FACING_STATUSES = [400, 403, 404, 409]
const statusMessage = (status) => {
  if (status === 401) return MESSAGES.sessionExpired
  if (status === 403) return 'You don’t have permission to do that.'
  if (status === 404) return 'That item could not be found.'
  if (status === 409) return 'That change conflicts with the current data. Refresh and try again.'
  if (status === 429) return 'Too many requests. Wait a moment and try again.'
  if (status >= 500) return 'Something went wrong on our side. Please try again.'
  return 'The request could not be completed.'
}

const TASK_FIELDS = ['title', 'description', 'category', 'priority', 'dueDate']

// '' is what a "no assignee" option sends; the backend only accepts a user id or null.
const normalizeAssignee = (assigneeId) => (assigneeId === '' || assigneeId === undefined ? null : assigneeId)

const pickTaskFields = (input) =>
  Object.fromEntries(TASK_FIELDS.filter((key) => key in input).map((key) => [key, input[key]]))

export const createHttpAdapter = ({ baseUrl = '', userPoolId, userPoolClientId } = {}) => {
  Amplify.configure({ Auth: { Cognito: { userPoolId, userPoolClientId } } })
  const apiBase = String(baseUrl).replace(/\/+$/, '')

  const getIdToken = async () => {
    try {
      const { tokens } = await fetchAuthSession()
      return tokens?.idToken ?? null
    } catch (error) {
      logDevError('fetchAuthSession failed', error)
      return null
    }
  }

  const request = async (method, path, body) => {
    const idToken = await getIdToken()
    if (!idToken) throw new ApiError(MESSAGES.sessionExpired, 401)
    let response
    try {
      response = await fetch(`${apiBase}${path}`, {
        method,
        headers: { Authorization: idToken.toString(), 'Content-Type': 'application/json' },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      })
    } catch (error) {
      logDevError(`${method} ${path} failed to send`, error)
      throw new ApiError(MESSAGES.offline, 0)
    }
    if (response.status === 204) return null
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      logDevError(`${method} ${path} returned ${response.status}`, data)
      const serverMessage = USER_FACING_STATUSES.includes(response.status) && typeof data?.error === 'string' ? data.error : ''
      throw new ApiError(serverMessage || statusMessage(response.status), response.status)
    }
    return data
  }

  const taskPath = (id, suffix = '') => `/tasks/${encodeURIComponent(id)}${suffix}`
  const memberPath = (id) => `/members/${encodeURIComponent(id)}`

  const getSession = async () => {
    const idToken = await getIdToken()
    if (!idToken) return null
    const claims = idToken.payload
    const groups = claims['cognito:groups'] ?? []
    return {
      token: idToken.toString(),
      user: {
        id: claims.sub,
        name: claims.name ?? claims.email ?? '',
        email: claims.email ?? '',
        role: groups.includes('admin') ? ROLES.ADMIN : ROLES.MEMBER,
        createdAt: '',
      },
    }
  }

  const finishSignIn = async () => {
    const session = await getSession()
    if (!session) throw new ApiError(MESSAGES.signInUnavailable, 401)
    return session
  }

  const unsupportedStep = (step) => {
    logDevError(`unsupported sign-in step ${step}`)
    return new ApiError(MESSAGES.unsupportedStep, 401)
  }

  const auth = {
    login: async (email, password) => {
      await signOut().catch(() => {})
      let result
      try {
        result = await signIn({ username: String(email).trim().toLowerCase(), password })
      } catch (error) {
        logDevError('signIn failed', error)
        throw new ApiError(SIGN_IN_ERRORS[error?.name] ?? MESSAGES.signInUnavailable, 401)
      }
      const step = result?.nextStep?.signInStep
      if (step === NEW_PASSWORD_STEP) {
        // Amplify keeps this sign-in in progress; completeNewPassword finishes it.
        const error = new ApiError('Choose a new password to finish signing in.', 401)
        error.code = 'NEW_PASSWORD_REQUIRED'
        throw error
      }
      if (step !== 'DONE') throw unsupportedStep(step)
      return finishSignIn()
    },
    // Second half of a first sign-in with a temporary password (after NEW_PASSWORD_REQUIRED).
    completeNewPassword: async (newPassword) => {
      let result
      try {
        result = await confirmSignIn({ challengeResponse: newPassword })
      } catch (error) {
        logDevError('confirmSignIn failed', error)
        const message = NEW_PASSWORD_ERRORS[error?.name]
        throw new ApiError(message ?? 'We couldn’t set your new password. Please try again later.', message ? 400 : 401)
      }
      const step = result?.nextStep?.signInStep
      if (step !== 'DONE') throw unsupportedStep(step)
      return finishSignIn()
    },
    logout: async () => {
      await signOut()
    },
    getSession,
  }

  const tasks = {
    list: () => request('GET', '/tasks'),
    get: (id) => request('GET', taskPath(id)),
    // Attachments aren't supported by the backend yet, so input.attachment is ignored.
    create: (input) => {
      const assigneeId = normalizeAssignee(input.assigneeId)
      return request('POST', '/tasks', { ...pickTaskFields(input), ...(assigneeId !== null && { assigneeId }) })
    },
    // Edits fields, then the assignee if the patch has one. Attachment changes are ignored.
    update: async (id, patch) => {
      const fields = pickTaskFields(patch)
      let task = null
      if (Object.keys(fields).length > 0) task = await request('PATCH', taskPath(id), fields)
      if ('assigneeId' in patch) {
        task = await request('PATCH', taskPath(id, '/assignee'), { assigneeId: normalizeAssignee(patch.assigneeId) })
      }
      return task ?? request('GET', taskPath(id))
    },
    updateStatus: (id, status) => request('PATCH', taskPath(id, '/status'), { status }),
    assign: (id, assigneeId) => request('PATCH', taskPath(id, '/assignee'), { assigneeId: normalizeAssignee(assigneeId) }),
    archive: notImplemented('tasks.archive'),
    unarchive: notImplemented('tasks.unarchive'),
    addComment: notImplemented('tasks.addComment'),
    deleteComment: notImplemented('tasks.deleteComment'),
    remove: async (id) => {
      await request('DELETE', taskPath(id))
      return { id }
    },
  }

  // All admin-only. Errors: 400 validation, 403 not admin, 404 not found, 409 email in use.
  const users = {
    // Includes deactivated members (with deactivatedAt).
    listMembers: () => request('GET', '/members'),
    // Cognito emails the temporary password, so this resolves to { user, temporaryPassword: null }.
    createMember: (input) => request('POST', '/members', { name: input.name, email: input.email }),
    // The backend has no route for editing a member yet; the UI hides the edit button.
    updateMember: notImplemented('users.updateMember'),
    deactivateMember: async (id) => {
      const { id: memberId, unassignedTasks } = await request('PATCH', memberPath(id), { active: false })
      return { id: memberId ?? id, unassignedTasks }
    },
    reactivateMember: async (id) => {
      const { unassignedTasks: _unassignedTasks, ...user } = await request('PATCH', memberPath(id), { active: true })
      return user
    },
  }

  return {
    auth,
    users,
    tasks,
    notifications: {
      list: notImplemented('notifications.list'),
      markRead: notImplemented('notifications.markRead'),
      markAllRead: notImplemented('notifications.markAllRead'),
    },
  }
}
