export const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
}

export const TASK_STATUS = {
  NEW: 'new',
  TO_DO: 'to_do',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
}

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.NEW]: 'New',
  [TASK_STATUS.TO_DO]: 'To do',
  [TASK_STATUS.IN_PROGRESS]: 'In progress',
  [TASK_STATUS.COMPLETED]: 'Completed',
  [TASK_STATUS.BLOCKED]: 'Needs attention',
}

// Status moves allowed to a team member on their own task (admins may set any status).
export const MEMBER_STATUS_TRANSITIONS = {
  [TASK_STATUS.NEW]: [TASK_STATUS.TO_DO],
  [TASK_STATUS.TO_DO]: [TASK_STATUS.IN_PROGRESS],
  [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED, TASK_STATUS.BLOCKED],
  [TASK_STATUS.BLOCKED]: [TASK_STATUS.IN_PROGRESS],
  [TASK_STATUS.COMPLETED]: [],
}

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
}

export const TASK_PRIORITY_LABELS = {
  [TASK_PRIORITY.LOW]: 'Low',
  [TASK_PRIORITY.MEDIUM]: 'Medium',
  [TASK_PRIORITY.HIGH]: 'High',
  [TASK_PRIORITY.URGENT]: 'Urgent',
}

export const NOTIFICATION_TYPE = {
  ASSIGNMENT: 'assignment',
  DEADLINE: 'deadline',
  UPDATE: 'update',
  COMMENT: 'comment',
}

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {'admin'|'member'} role
 * @property {string} createdAt    ISO timestamp
 * @property {string} [deactivatedAt]  Set while a team member is deactivated
 *
 * @typedef {Object} Session
 * @property {string} token   Opaque session token
 * @property {User} user
 *
 * @typedef {Object} TaskHistoryEntry
 * @property {string} at       ISO timestamp
 * @property {string} by       User id of the actor
 * @property {string} action   'created' | 'edited' | 'assigned' | 'status_changed' | 'archived' | 'restored'
 * @property {string} [status] New status, for 'status_changed' and 'created'
 * @property {string|null} [assigneeId] New assignee, for 'assigned'
 *
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} category
 * @property {string} dueDate      'YYYY-MM-DD'; due at the end of that local day
 * @property {string|null} assigneeId
 * @property {'new'|'to_do'|'in_progress'|'completed'|'blocked'} status
 * @property {'low'|'medium'|'high'|'urgent'} priority
 * @property {Attachment|null} attachment
 * @property {Comment[]} comments  Oldest first
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} [archivedAt]  Set while archived (completed tasks only); archived tasks are read-only
 * @property {TaskHistoryEntry[]} history
 *
 * @typedef {Object} Attachment
 * @property {string} name
 * @property {string} type   MIME type
 * @property {number} size   Bytes
 * @property {string} url    Download URL (a data URL in the mock)
 *
 * @typedef {Object} Comment
 * @property {string} id
 * @property {string} authorId
 * @property {string} body
 * @property {Attachment|null} attachment
 * @property {string} createdAt  ISO timestamp
 *
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} recipientId  User id the notification belongs to
 * @property {'assignment'|'deadline'|'update'|'comment'} type
 * @property {string|null} taskId
 * @property {string} title
 * @property {string} message
 * @property {string} createdAt    ISO timestamp
 * @property {boolean} read
 *
 * @typedef {Object} TaskInput
 * @property {string} title
 * @property {string} [description]
 * @property {string} [category]
 * @property {'low'|'medium'|'high'|'urgent'} [priority]  Defaults to 'medium'
 * @property {string} dueDate
 * @property {string|null} [assigneeId]
 * @property {File|null} [attachment]  A File to attach or replace, null to remove, omitted to keep
 */
