const pad = (value) => String(value).padStart(2, '0')

export const toDateInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const isValidDateInput = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime())

// End of the due date in local time.
export const dueAt = (dueDate) => new Date(`${dueDate}T23:59:59.999`)

export const formatDate = (dueDate) =>
  new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
