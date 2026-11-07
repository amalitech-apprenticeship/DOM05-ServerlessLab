import { Amplify } from 'aws-amplify'
import { fetchAuthSession, signIn, signOut } from 'aws-amplify/auth'
import { ApiError, ROLES } from '../contract'

// Backend adapter: API Gateway (HTTP API) + Lambda, signed in through Amazon Cognito.
// Each method resolves to the shapes in ../contract.js or rejects with an ApiError carrying
// an HTTP status, matching the mock adapter.

const notImplemented = (name) => () =>
  Promise.reject(new ApiError(`http adapter: ${name} is not implemented yet.`, 501))

const INVALID_CREDENTIAL_ERRORS = ['NotAuthorizedException', 'UserNotFoundException']
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
    } catch {
      return null
    }
  }

  const request = async (method, path, body) => {
    const idToken = await getIdToken()
    if (!idToken) throw new ApiError('You are not signed in.', 401)
    let response
    try {
      response = await fetch(`${apiBase}${path}`, {
        method,
        headers: { Authorization: idToken.toString(), 'Content-Type': 'application/json' },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      })
    } catch {
      throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
    }
    if (response.status === 204) return null
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new ApiError(data?.error ?? 'Request failed', response.status)
    return data
  }

  const taskPath = (id, suffix = '') => `/tasks/${encodeURIComponent(id)}${suffix}`

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

  const auth = {
    login: async (email, password) => {
      await signOut().catch(() => {})
      let result
      try {
        result = await signIn({ username: String(email).trim().toLowerCase(), password })
      } catch (error) {
        if (INVALID_CREDENTIAL_ERRORS.includes(error?.name)) {
          throw new ApiError('We could not find an account with those details.', 401)
        }
        throw new ApiError(error?.message || 'Sign-in failed.', 401)
      }
      const step = result?.nextStep?.signInStep
      if (step !== 'DONE') {
        throw new ApiError(
          step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
            ? 'This account needs a new password before it can sign in. Ask an admin to set a permanent password.'
            : `Sign-in needs an extra step this app does not support yet (${step}).`,
          401
        )
      }
      const session = await getSession()
      if (!session) throw new ApiError('Sign-in did not return a session.', 401)
      return session
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

  return {
    auth,
    users: {
      listMembers: notImplemented('users.listMembers'),
      createMember: notImplemented('users.createMember'),
      updateMember: notImplemented('users.updateMember'),
      deactivateMember: notImplemented('users.deactivateMember'),
      reactivateMember: notImplemented('users.reactivateMember'),
    },
    tasks,
    notifications: {
      list: notImplemented('notifications.list'),
      markRead: notImplemented('notifications.markRead'),
      markAllRead: notImplemented('notifications.markAllRead'),
    },
  }
}
