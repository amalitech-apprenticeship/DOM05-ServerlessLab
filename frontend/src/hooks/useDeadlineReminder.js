import { useCallback, useMemo, useState } from 'react'
import { DEADLINE_STATE, daysUntilDue, getDeadlineState } from '../utils/deadlines'

export const REMINDER_SNOOZE_MS = Number(import.meta.env.VITE_REMINDER_SNOOZE_MS ?? 4 * 60 * 60 * 1000)

const storageKey = (userId) => `ets.reminder.${userId}`

const readSnooze = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId))) || null
  } catch {
    return null
  }
}

// Open tasks that are overdue or due today/tomorrow.
export const getUrgentTasks = (tasks, now) =>
  tasks.filter((task) => {
    const state = getDeadlineState(task, now)
    return state === DEADLINE_STATE.OVERDUE || (state !== DEADLINE_STATE.DONE && daysUntilDue(task, now) <= 1)
  })

// Returns { visible, overdue, dueSoon, snooze }. A snooze lasts REMINDER_SNOOZE_MS and ends early
// if a task that wasn't urgent at snooze time becomes urgent. Stored per user in localStorage.
export const useDeadlineReminder = (userId, tasks, now) => {
  const [snooze, setSnooze] = useState(() => readSnooze(userId))
  const urgent = useMemo(() => getUrgentTasks(tasks, now), [tasks, now])

  const visible =
    urgent.length > 0 &&
    !(snooze && now.getTime() < snooze.until && urgent.every((task) => snooze.taskIds.includes(task.id)))

  const snoozeReminder = useCallback(() => {
    const next = { until: Date.now() + REMINDER_SNOOZE_MS, taskIds: urgent.map((task) => task.id) }
    localStorage.setItem(storageKey(userId), JSON.stringify(next))
    setSnooze(next)
  }, [urgent, userId])

  return {
    visible,
    overdue: urgent.filter((task) => getDeadlineState(task, now) === DEADLINE_STATE.OVERDUE),
    dueSoon: urgent.filter((task) => getDeadlineState(task, now) !== DEADLINE_STATE.OVERDUE),
    snooze: snoozeReminder,
  }
}
