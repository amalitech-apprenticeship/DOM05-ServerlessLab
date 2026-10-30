import { ApiError, MEMBER_STATUS_TRANSITIONS, NOTIFICATION_TYPE, ROLES, TASK_PRIORITY, TASK_PRIORITY_LABELS, TASK_STATUS, TASK_STATUS_LABELS } from '../contract'
import { formatDate, isValidDateInput } from '../../utils/dates'
import { MAX_ATTACHMENT_BYTES, formatBytes, readAsDataUrl } from '../../utils/files'
import { daysUntilDue } from '../../utils/deadlines'
import { SEED_ADMIN_ID, createSeedTasks, createSeedUsers } from './seed'
import { DEFAULT_ITERATIONS, hashPassword, verifyPassword } from './passwords'

const KEYS = {
  tasks: 'ets.tasks',
  users: 'ets.users',
  notifications: 'ets.notifications',
  session: 'ets.session',
}

const LEGACY_KEYS = ['employees', 'loggedInUser']

// Build-time constant: when false, the minifier drops the demo credentials from the bundle.
const DEMO_SIGN_INS_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ALLOW_MOCK_IN_PRODUCTION === 'true'

const envAdminCredentials = () => ({
  email: DEMO_SIGN_INS_ENABLED ? import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() || '' : '',
  password: DEMO_SIGN_INS_ENABLED ? import.meta.env.VITE_ADMIN_PASSWORD || '' : '',
})

const envDemoMemberPassword = () => (DEMO_SIGN_INS_ENABLED ? import.meta.env.VITE_DEMO_MEMBER_PASSWORD || '' : '')

const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)))

const publicUser = ({ password: _password, credential: _credential, ...user }) => user

// storage: shared data (tasks, users, notifications). sessionStore: the signed-in user, per tab.
export const createMockAdapter = ({
  storage = window.localStorage,
  sessionStore = window.sessionStorage,
  latencyMs = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 150),
  now = () => new Date(),
  adminCredentials = envAdminCredentials(),
  demoMemberPassword = envDemoMemberPassword(),
  passwordIterations = DEFAULT_ITERATIONS,
} = {}) => {

  const read = (key, fallback) => {
    try {
      const raw = storage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  }
  const write = (key, value) => storage.setItem(key, JSON.stringify(value))

  LEGACY_KEYS.forEach((key) => storage.removeItem(key))
  if (!storage.getItem(KEYS.tasks)) write(KEYS.tasks, createSeedTasks(now()))
  write(KEYS.tasks, read(KEYS.tasks, []).map((task) => ({ ...task, priority: task.priority || TASK_PRIORITY.MEDIUM, comments: task.comments || [] })))

  // Seeds users, hashes the env credentials and migrates legacy plaintext passwords.
  // Every API call waits for it (see `respond`).
  const ready = (async () => {
    if (!storage.getItem(KEYS.users)) {
      const seeded = await Promise.all(createSeedUsers(adminCredentials.email, now()).map(async (user) => ({
        ...user,
        credential: await hashPassword(user.id === SEED_ADMIN_ID ? adminCredentials.password : demoMemberPassword, passwordIterations),
      })))
      if (!storage.getItem(KEYS.users)) write(KEYS.users, seeded)
    }

    // Changes are applied to a fresh read so writes from other tabs made meanwhile survive.
    const changes = {}
    await Promise.all(read(KEYS.users, []).map(async (user) => {
      if (user.password && !user.credential) changes[user.id] = { credential: await hashPassword(user.password, passwordIterations) }
      if (user.id === SEED_ADMIN_ID && !(await verifyPassword(adminCredentials.password, user.credential))) {
        changes[user.id] = { credential: await hashPassword(adminCredentials.password, passwordIterations) }
      }
    }))
    write(KEYS.users, read(KEYS.users, []).map(({ password: _password, removedAt, ...user }) => ({
      ...user,
      ...(removedAt && !user.deactivatedAt && { deactivatedAt: removedAt }),
      ...changes[user.id],
      ...(user.id === SEED_ADMIN_ID && { email: adminCredentials.email }),
    })))
  })()

  const loadUsers = () => read(KEYS.users, [])
  const isActive = (user) => !user.deactivatedAt
  const saveUsers = (users) => write(KEYS.users, users)

  const respond = (fn) =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        ready.then(fn).then((value) => resolve(clone(value)), reject)
      }, latencyMs)
    })

  const readSession = () => {
    try {
      return JSON.parse(sessionStore.getItem(KEYS.session))
    } catch {
      return null
    }
  }

  const currentUser = () => {
    const session = readSession()
    return loadUsers().find((user) => user.id === session?.userId && isActive(user)) || null
  }

  const requireUser = () => {
    const user = currentUser()
    if (!user) throw new ApiError('You are not signed in.', 401)
    return user
  }

  const requireAdmin = () => {
    const user = requireUser()
    if (user.role !== ROLES.ADMIN) throw new ApiError('Only admins can do that.', 403)
    return user
  }

  const loadTasks = () => read(KEYS.tasks, [])
  const saveTasks = (tasks) => {
    try {
      write(KEYS.tasks, tasks)
    } catch {
      throw new ApiError('Not enough browser storage to save this. Try a smaller attachment.', 413)
    }
  }

  const loadNotifications = () => read(KEYS.notifications, [])

  // dedupeKey (internal) lets the deadline sweep skip reminders it already sent.
  const notify = (recipientId, type, task, title, message, dedupeKey) => {
    if (!recipientId) return
    const notification = {
      id: `n-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      recipientId,
      type,
      taskId: task?.id ?? null,
      title,
      message,
      createdAt: now().toISOString(),
      read: false,
      ...(dedupeKey && { dedupeKey }),
    }
    write(KEYS.notifications, [notification, ...loadNotifications()])
  }

  const notifyAssigned = (task) =>
    notify(task.assigneeId, NOTIFICATION_TYPE.ASSIGNMENT, task, 'New task assigned', `"${task.title}" was assigned to you. Due ${formatDate(task.dueDate)}.`)

  // Sends an 'update' notification to each recipient except the actor.
  const notifyUpdate = (actor, recipientIds, task, title, message) =>
    [...new Set(recipientIds)]
      .filter((id) => id && id !== actor.id)
      .forEach((id) => notify(id, NOTIFICATION_TYPE.UPDATE, task, title, message))

  const adminIds = () => loadUsers().filter((user) => user.role === ROLES.ADMIN).map((user) => user.id)

  const EDITABLE_FIELD_LABELS = { title: 'title', description: 'description', category: 'category', dueDate: 'due date', priority: 'priority', attachment: 'attachment' }
  const ADMIN_ONLY_FIELDS = ['dueDate', 'priority', 'attachment']

  const describeChange = (key, task) => {
    if (key === 'dueDate') return `due date is now ${formatDate(task.dueDate)}`
    if (key === 'priority') return `priority is now ${TASK_PRIORITY_LABELS[task.priority]}`
    if (key === 'attachment') return task.attachment ? `attachment ${task.attachment.name} added` : 'attachment removed'
    return `${EDITABLE_FIELD_LABELS[key]} changed`
  }

  // Runs on every notifications.list(). For each open, assigned task it sends one 'due_soon'
  // (due today/tomorrow) and one 'overdue' reminder per assignee and due date.
  const runDeadlineSweep = () => {
    const current = now()
    const sent = new Set(loadNotifications().map((item) => item.dedupeKey).filter(Boolean))
    loadTasks().forEach((task) => {
      if (!task.assigneeId || task.status === TASK_STATUS.COMPLETED) return
      const days = daysUntilDue(task, current)
      const kind = days < 0 ? 'overdue' : days <= 1 ? 'due_soon' : null
      if (!kind) return
      const dedupeKey = `deadline:${task.id}:${task.assigneeId}:${task.dueDate}:${kind}`
      if (sent.has(dedupeKey)) return
      const [title, message] = kind === 'overdue'
        ? ['Task overdue', `"${task.title}" was due ${formatDate(task.dueDate)}.`]
        : ['Deadline approaching', `"${task.title}" is due ${days === 0 ? 'today' : 'tomorrow'}.`]
      notify(task.assigneeId, NOTIFICATION_TYPE.DEADLINE, task, title, message, dedupeKey)
    })
  }

  const findTask = (tasks, id) => {
    const task = tasks.find((item) => item.id === id)
    if (!task) throw new ApiError('Task not found.', 404)
    return task
  }

  const ensureNotArchived = (task) => {
    if (task.archivedAt) throw new ApiError('This task is archived. Restore it before making changes.', 409)
    return task
  }

  const canSee = (user, task) => user.role === ROLES.ADMIN || task.assigneeId === user.id

  const cleanAssignee = (assigneeId) => {
    if (assigneeId === null || assigneeId === undefined || assigneeId === '') return null
    const member = loadUsers().find((user) => user.id === assigneeId && user.role === ROLES.MEMBER && isActive(user))
    if (!member) throw new ApiError('Tasks can only be assigned to team members.')
    return member.id
  }

  // File -> Attachment (stored as a data URL), null -> null.
  const cleanAttachment = async (file) => {
    if (!file) return null
    if (typeof file.size !== 'number' || !file.name) throw new ApiError('Attachment must be a file.')
    if (file.size > MAX_ATTACHMENT_BYTES) throw new ApiError(`Attachments must be ${formatBytes(MAX_ATTACHMENT_BYTES)} or smaller.`, 413)
    return { name: file.name, type: file.type || 'application/octet-stream', size: file.size, url: await readAsDataUrl(file) }
  }

  const cleanFields = (input, { partial }) => {
    const fields = {}
    if (!partial || 'title' in input) {
      const title = String(input.title ?? '').trim()
      if (!title) throw new ApiError('Title is required.')
      if (title.length > 120) throw new ApiError('Title must be 120 characters or fewer.')
      fields.title = title
    }
    if (!partial || 'description' in input) fields.description = String(input.description ?? '').trim()
    if (!partial || 'category' in input) fields.category = String(input.category ?? '').trim() || 'General'
    if (!partial || 'dueDate' in input) {
      if (!isValidDateInput(input.dueDate)) throw new ApiError('A valid due date is required.')
      fields.dueDate = input.dueDate
    }
    if (!partial || 'priority' in input) {
      const priority = input.priority ?? TASK_PRIORITY.MEDIUM
      if (!Object.values(TASK_PRIORITY).includes(priority)) throw new ApiError('Unknown priority.')
      fields.priority = priority
    }
    return fields
  }

  const auth = {
    login: (email, password) =>
      respond(async () => {
        const normalizedEmail = String(email).trim().toLowerCase()
        const candidate = loadUsers().find((item) => isActive(item) && item.email && item.email === normalizedEmail)
        const user = candidate && (await verifyPassword(password, candidate.credential)) ? candidate : null
        if (!user) throw new ApiError('We could not find an account with those details.', 401)
        const token = `mock-${user.id}-${Date.now()}`
        sessionStore.setItem(KEYS.session, JSON.stringify({ token, userId: user.id }))
        return { token, user: publicUser(user) }
      }),
    logout: () => respond(() => sessionStore.removeItem(KEYS.session)),
    getSession: () =>
      respond(() => {
        const session = readSession()
        const user = currentUser()
        return user ? { token: session.token, user: publicUser(user) } : null
      }),
  }

  const tasks = {
    list: () =>
      respond(() => {
        const user = requireUser()
        return loadTasks().filter((task) => canSee(user, task))
      }),
    get: (id) =>
      respond(() => {
        const user = requireUser()
        const task = findTask(loadTasks(), id)
        if (!canSee(user, task)) throw new ApiError('Task not found.', 404)
        return task
      }),
    create: (input) =>
      respond(async () => {
        const admin = requireAdmin()
        const attachment = await cleanAttachment(input.attachment)
        const at = now().toISOString()
        const assigneeId = cleanAssignee(input.assigneeId)
        const task = {
          id: `t-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          ...cleanFields(input, { partial: false }),
          attachment,
          comments: [],
          assigneeId,
          status: TASK_STATUS.NEW,
          createdBy: admin.id,
          createdAt: at,
          updatedAt: at,
          history: [{ at, by: admin.id, action: 'created', status: TASK_STATUS.NEW, assigneeId }],
        }
        saveTasks([...loadTasks(), task])
        notifyAssigned(task)
        return task
      }),
    // Admins may edit any field; the assignee may not change ADMIN_ONLY_FIELDS.
    update: (id, patch) =>
      respond(async () => {
        const user = requireUser()
        const isAdmin = user.role === ROLES.ADMIN
        // Read the file before loading tasks, so the read-modify-write below has no await in it.
        const attachment = 'attachment' in patch ? await cleanAttachment(patch.attachment) : undefined
        const all = loadTasks()
        const task = findTask(all, id)
        if (!canSee(user, task)) throw new ApiError('Task not found.', 404)
        ensureNotArchived(task)
        const fields = cleanFields(patch, { partial: true })
        const changed = Object.keys(fields).filter((key) => fields[key] !== task[key])
        if (attachment !== undefined && (attachment || task.attachment)) {
          fields.attachment = attachment
          changed.push('attachment')
        }
        const forbidden = isAdmin ? undefined : changed.find((key) => ADMIN_ONLY_FIELDS.includes(key))
        if (forbidden) throw new ApiError(`Only admins can change the ${EDITABLE_FIELD_LABELS[forbidden]}.`, 403)
        if (changed.length === 0) return task
        const at = now().toISOString()
        const updated = {
          ...task,
          ...fields,
          updatedAt: at,
          history: [...task.history, { at, by: user.id, action: 'edited' }],
        }
        saveTasks(all.map((item) => (item.id === id ? updated : item)))
        const details = changed.map((key) => describeChange(key, updated)).join(', ')
        if (isAdmin) {
          notifyUpdate(user, [updated.assigneeId], updated, 'Task updated', `"${updated.title}" was updated: ${details}.`)
        } else {
          notifyUpdate(user, adminIds(), updated, 'Task updated', `${user.name} updated "${updated.title}": ${details}.`)
        }
        return updated
      }),
    updateStatus: (id, status) =>
      respond(() => {
        const user = requireUser()
        const all = loadTasks()
        const task = findTask(all, id)
        if (!canSee(user, task)) throw new ApiError('Task not found.', 404)
        ensureNotArchived(task)
        if (!Object.values(TASK_STATUS).includes(status)) throw new ApiError('Unknown status.')
        if (status === task.status) return task
        if (user.role !== ROLES.ADMIN && !MEMBER_STATUS_TRANSITIONS[task.status].includes(status)) {
          throw new ApiError('You cannot move this task to that status.', 403)
        }
        const at = now().toISOString()
        const updated = {
          ...task,
          status,
          updatedAt: at,
          history: [...task.history, { at, by: user.id, action: 'status_changed', status }],
        }
        saveTasks(all.map((item) => (item.id === id ? updated : item)))
        notifyUpdate(user, [...adminIds(), updated.assigneeId], updated, 'Status changed', `${user.name} moved "${updated.title}" to ${TASK_STATUS_LABELS[status]}.`)
        return updated
      }),
    // A new assignee resets the status to 'new'.
    assign: (id, assigneeId) =>
      respond(() => {
        const admin = requireAdmin()
        const all = loadTasks()
        const task = ensureNotArchived(findTask(all, id))
        const nextAssigneeId = cleanAssignee(assigneeId)
        if (nextAssigneeId === task.assigneeId) return task
        const at = now().toISOString()
        const updated = {
          ...task,
          assigneeId: nextAssigneeId,
          status: TASK_STATUS.NEW,
          updatedAt: at,
          history: [...task.history, { at, by: admin.id, action: 'assigned', assigneeId: nextAssigneeId, status: TASK_STATUS.NEW }],
        }
        saveTasks(all.map((item) => (item.id === id ? updated : item)))
        notifyAssigned(updated)
        notifyUpdate(admin, [task.assigneeId], updated, 'Task reassigned', `"${updated.title}" is no longer assigned to you.`)
        return updated
      }),
    archive: (id) =>
      respond(() => {
        const admin = requireAdmin()
        const all = loadTasks()
        const task = findTask(all, id)
        if (task.archivedAt) return task
        if (task.status !== TASK_STATUS.COMPLETED) throw new ApiError('Only completed tasks can be archived.', 409)
        const at = now().toISOString()
        const updated = { ...task, archivedAt: at, updatedAt: at, history: [...task.history, { at, by: admin.id, action: 'archived' }] }
        saveTasks(all.map((item) => (item.id === id ? updated : item)))
        return updated
      }),
    unarchive: (id) =>
      respond(() => {
        const admin = requireAdmin()
        const all = loadTasks()
        const task = findTask(all, id)
        if (!task.archivedAt) return task
        const at = now().toISOString()
        const updated = { ...task, archivedAt: null, updatedAt: at, history: [...task.history, { at, by: admin.id, action: 'restored' }] }
        saveTasks(all.map((item) => (item.id === id ? updated : item)))
        return updated
      }),
    // Admins comment on any task, members on their own. Needs a body or an attachment.
    addComment: (id, input = {}) =>
      respond(async () => {
        const user = requireUser()
        const body = String(input.body ?? '').trim()
        if (body.length > 2000) throw new ApiError('Comments must be 2000 characters or fewer.')
        const attachment = await cleanAttachment(input.attachment)
        if (!body && !attachment) throw new ApiError('Write a comment or attach a file.')
        const all = loadTasks()
        const task = findTask(all, id)
        if (!canSee(user, task)) throw new ApiError('Task not found.', 404)
        ensureNotArchived(task)
        const comment = {
          id: `c-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          authorId: user.id,
          body,
          attachment,
          createdAt: now().toISOString(),
        }
        const updated = { ...task, comments: [...(task.comments || []), comment] }
        saveTasks(all.map((item) => (item.id === id ? updated : item)))
        const recipients = user.role === ROLES.ADMIN ? [updated.assigneeId] : adminIds()
        const summary = body ? `: "${body.length > 80 ? `${body.slice(0, 77)}...` : body}"` : ` and attached ${attachment.name}`
        recipients
          .filter((recipientId) => recipientId && recipientId !== user.id)
          .forEach((recipientId) => notify(recipientId, NOTIFICATION_TYPE.COMMENT, updated, 'New comment', `${user.name} commented on "${updated.title}"${summary}`))
        return updated
      }),
    // The author or an admin may delete a comment.
    deleteComment: (id, commentId) =>
      respond(() => {
        const user = requireUser()
        const all = loadTasks()
        const task = findTask(all, id)
        if (!canSee(user, task)) throw new ApiError('Task not found.', 404)
        const comment = (task.comments || []).find((item) => item.id === commentId)
        if (!comment) throw new ApiError('Comment not found.', 404)
        if (comment.authorId !== user.id && user.role !== ROLES.ADMIN) throw new ApiError('You can only delete your own comments.', 403)
        const updated = { ...task, comments: task.comments.filter((item) => item.id !== commentId) }
        saveTasks(all.map((item) => (item.id === id ? updated : item)))
        return updated
      }),
    remove: (id) =>
      respond(() => {
        const admin = requireAdmin()
        const all = loadTasks()
        const task = findTask(all, id)
        saveTasks(all.filter((item) => item.id !== id))
        notifyUpdate(admin, [task.assigneeId], task, 'Task removed', `"${task.title}" was deleted by ${admin.name}.`)
        return { id }
      }),
  }

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const cleanAccountFields = (input, excludeId) => {
    const name = String(input.name ?? '').trim()
    const email = String(input.email ?? '').trim().toLowerCase()
    if (!name) throw new ApiError('Name is required.')
    if (name.length > 80) throw new ApiError('Name must be 80 characters or fewer.')
    if (!EMAIL_PATTERN.test(email)) throw new ApiError('A valid email address is required.')
    if (loadUsers().some((user) => user.id !== excludeId && user.email === email)) {
      throw new ApiError('Another account already uses that email.', 409)
    }
    return { name, email }
  }

  const findMember = (id, { includeDeactivated = false } = {}) => {
    const member = loadUsers().find((user) => user.id === id && user.role === ROLES.MEMBER && (includeDeactivated || isActive(user)))
    if (!member) throw new ApiError('Team member not found.', 404)
    return member
  }

  const temporaryPassword = () =>
    Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[n % 56]).join('')

  const usersApi = {
    // Includes deactivated members (with deactivatedAt).
    listMembers: () =>
      respond(() => {
        requireAdmin()
        return loadUsers().filter((user) => user.role === ROLES.MEMBER).map(publicUser)
      }),
    createMember: (input) =>
      respond(async () => {
        requireAdmin()
        const fields = cleanAccountFields(input)
        const password = temporaryPassword()
        const credential = await hashPassword(password, passwordIterations)
        const member = {
          id: `u-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          ...fields,
          credential,
          role: ROLES.MEMBER,
          createdAt: now().toISOString(),
        }
        saveUsers([...loadUsers(), member])
        return { user: publicUser(member), temporaryPassword: password }
      }),
    updateMember: (id, patch) =>
      respond(() => {
        requireAdmin()
        const member = findMember(id, { includeDeactivated: true })
        const updated = { ...member, ...cleanAccountFields({ ...member, ...patch }, id) }
        saveUsers(loadUsers().map((user) => (user.id === id ? updated : user)))
        return publicUser(updated)
      }),
    // Blocks sign-in and assignment, and returns their open tasks to 'new' unassigned.
    // Resolves to { id, unassignedTasks }. Reversible with reactivateMember.
    deactivateMember: (id) =>
      respond(() => {
        const admin = requireAdmin()
        const member = findMember(id)
        const at = now().toISOString()
        saveUsers(loadUsers().map((user) => (user.id === id ? { ...user, deactivatedAt: at } : user)))
        let unassigned = 0
        saveTasks(loadTasks().map((task) => {
          if (task.assigneeId !== member.id || task.status === TASK_STATUS.COMPLETED) return task
          unassigned += 1
          return {
            ...task,
            assigneeId: null,
            status: TASK_STATUS.NEW,
            updatedAt: at,
            history: [...task.history, { at, by: admin.id, action: 'assigned', assigneeId: null, status: TASK_STATUS.NEW }],
          }
        }))
        return { id, unassignedTasks: unassigned }
      }),
    reactivateMember: (id) =>
      respond(() => {
        requireAdmin()
        const member = findMember(id, { includeDeactivated: true })
        if (isActive(member)) return publicUser(member)
        const { deactivatedAt: _deactivatedAt, ...reactivated } = member
        saveUsers(loadUsers().map((user) => (user.id === id ? reactivated : user)))
        return publicUser(reactivated)
      }),
  }

  const publicNotification = ({ dedupeKey: _dedupeKey, ...notification }) => notification

  const updateOwnNotifications = (user, shouldMark) =>
    write(
      KEYS.notifications,
      loadNotifications().map((item) => (item.recipientId === user.id && shouldMark(item) ? { ...item, read: true } : item))
    )

  const notifications = {
    list: () =>
      respond(() => {
        const user = requireUser()
        runDeadlineSweep()
        return loadNotifications().filter((item) => item.recipientId === user.id).map(publicNotification)
      }),
    markRead: (id) =>
      respond(() => {
        const user = requireUser()
        if (!loadNotifications().some((item) => item.id === id && item.recipientId === user.id)) {
          throw new ApiError('Notification not found.', 404)
        }
        updateOwnNotifications(user, (item) => item.id === id)
        return { id }
      }),
    markAllRead: () =>
      respond(() => {
        updateOwnNotifications(requireUser(), () => true)
        return {}
      }),
  }

  return { auth, tasks, users: usersApi, notifications }
}
