import { TASK_STATUS } from '../api/contract'
import { dueAt, toDateInput } from './dates'

export const DUE_SOON_DAYS = 3

export const DEADLINE_STATE = {
  DONE: 'done',
  OVERDUE: 'overdue',
  DUE_TODAY: 'due_today',
  DUE_SOON: 'due_soon',
  UPCOMING: 'upcoming',
}

export const DEADLINE_LABELS = {
  [DEADLINE_STATE.DONE]: 'Done',
  [DEADLINE_STATE.OVERDUE]: 'Overdue',
  [DEADLINE_STATE.DUE_TODAY]: 'Due today',
  [DEADLINE_STATE.DUE_SOON]: 'Due soon',
  [DEADLINE_STATE.UPCOMING]: 'Upcoming',
}

const DAY_MS = 24 * 60 * 60 * 1000

export const getDeadlineState = (task, now = new Date()) => {
  if (task.status === TASK_STATUS.COMPLETED) return DEADLINE_STATE.DONE
  if (dueAt(task.dueDate) < now) return DEADLINE_STATE.OVERDUE
  if (task.dueDate === toDateInput(now)) return DEADLINE_STATE.DUE_TODAY
  if (dueAt(task.dueDate) - now <= DUE_SOON_DAYS * DAY_MS) return DEADLINE_STATE.DUE_SOON
  return DEADLINE_STATE.UPCOMING
}

// Calendar days until the due date; negative when overdue.
export const daysUntilDue = (task, now = new Date()) => {
  const today = new Date(`${toDateInput(now)}T00:00:00`)
  const due = new Date(`${task.dueDate}T00:00:00`)
  return Math.round((due - today) / DAY_MS)
}

export const describeDue = (task, now = new Date()) => {
  const days = daysUntilDue(task, now)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 1) return `Due in ${days} days`
  if (days === -1) return 'Overdue by 1 day'
  return `Overdue by ${-days} days`
}

// -> [{ task, reason }] for open tasks that are overdue, due today, blocked, or due soon and
// unassigned; sorted by due date.
export const getAttentionTasks = (tasks, now) =>
  tasks
    .map((task) => {
      const state = getDeadlineState(task, now)
      if (state === DEADLINE_STATE.DONE) return null
      if (state === DEADLINE_STATE.OVERDUE || state === DEADLINE_STATE.DUE_TODAY) return { task, reason: state }
      if (task.status === TASK_STATUS.BLOCKED) return { task, reason: 'blocked' }
      if (!task.assigneeId && state === DEADLINE_STATE.DUE_SOON) return { task, reason: 'unassigned' }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate))
