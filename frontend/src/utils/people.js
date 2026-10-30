import { TASK_STATUS_LABELS } from '../api/contract'

// Returns id -> display name. Unknown ids are shown as "Admin"; deactivated members get "(deactivated)".
export const makeNameOf = (people, currentUser) => (id) => {
  if (id === currentUser?.id) return currentUser.name
  const person = people.find((item) => item.id === id)
  if (!person) return 'Admin'
  return person.deactivatedAt ? `${person.name} (deactivated)` : person.name
}

export const describeEntry = (entry, nameOf) => {
  const actor = nameOf(entry.by)
  switch (entry.action) {
    case 'created':
      return entry.assigneeId ? `${actor} created it and assigned it to ${nameOf(entry.assigneeId)}` : `${actor} created it`
    case 'edited':
      return `${actor} edited the details`
    case 'assigned':
      return entry.assigneeId ? `${actor} assigned it to ${nameOf(entry.assigneeId)}` : `${actor} unassigned it`
    case 'status_changed':
      return `${actor} moved it to ${TASK_STATUS_LABELS[entry.status]}`
    case 'archived':
      return `${actor} archived it`
    case 'restored':
      return `${actor} restored it from the archive`
    default:
      return `${actor} updated it`
  }
}

export const matchesSearch = (task, query, nameOf) => {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const assignee = task.assigneeId ? nameOf(task.assigneeId) : 'unassigned'
  return [task.title, task.description, task.category, assignee].some((value) => value.toLowerCase().includes(needle))
}

export const greeting = (now = new Date()) => {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
