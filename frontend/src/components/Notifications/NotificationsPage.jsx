import React, { useState } from 'react'
import Icon from '../Layout/Icon'
import { NOTIFICATION_ICONS } from './icons'
import { NOTIFICATION_TYPE } from '../../api/contract'
import { addDays, toDateInput } from '../../utils/dates'

const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: NOTIFICATION_TYPE.ASSIGNMENT, label: 'Assignments' },
  { id: NOTIFICATION_TYPE.DEADLINE, label: 'Deadlines' },
  { id: NOTIFICATION_TYPE.UPDATE, label: 'Updates' },
  { id: NOTIFICATION_TYPE.COMMENT, label: 'Comments' },
]

const groupLabel = (iso, now) => {
  const day = toDateInput(new Date(iso))
  if (day === toDateInput(now)) return 'Today'
  if (day === toDateInput(addDays(now, -1))) return 'Yesterday'
  return 'Earlier'
}

const formatTime = (iso, group) =>
  new Date(iso).toLocaleString(undefined, group === 'Earlier'
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { hour: 'numeric', minute: '2-digit' })

// canOpenTask(taskId) -> boolean: whether to show "View task" (the task may be deleted or hidden).
const NotificationsPage = ({ notifications, now, onMarkRead, onMarkAllRead, canOpenTask, onOpenTask, onBack }) => {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [type, setType] = useState('all')

  const unread = notifications.filter((item) => !item.read).length
  const visible = notifications
    .filter((item) => !unreadOnly || !item.read)
    .filter((item) => type === 'all' || item.type === type)
  const groups = ['Today', 'Yesterday', 'Earlier']
    .map((label) => ({ label, items: visible.filter((item) => groupLabel(item.createdAt, now) === label) }))
    .filter((group) => group.items.length > 0)

  const openTask = (item) => {
    if (!item.read) onMarkRead(item.id)
    onOpenTask(item.taskId)
  }

  return (
    <>
      <div className='page-head'>
        <div>
          <nav className='breadcrumb' aria-label='Breadcrumb'><button type='button' onClick={onBack}>Dashboard</button><span aria-hidden='true'>›</span><span className='crumb-current'>Notifications</span></nav>
          <h1 className='page-title'>Notifications</h1>
          <p className='muted mt-2'>{unread ? `${unread} unread of ${notifications.length}` : `You’re all caught up · ${notifications.length} total`}</p>
        </div>
        <div className='page-actions'>
          <button type='button' className='btn btn-ghost' onClick={onMarkAllRead} disabled={unread === 0}><Icon name='check' size={16} /> Mark all as read</button>
        </div>
      </div>

      <div className='card filter-bar'>
        <div className='segmented' role='group' aria-label='Read status'>
          <button type='button' aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button>
          <button type='button' aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread{unread > 0 && <span className='count count-blocked'>{unread}</span>}</button>
        </div>
        <div className='chip-row' role='group' aria-label='Notification type'>
          {TYPE_FILTERS.map((filter) => (
            <button key={filter.id} type='button' className='chip' aria-pressed={type === filter.id} onClick={() => setType(filter.id)}>{filter.label}</button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className='card empty-state'>
          <Icon name='bell' size={28} />
          <h2>{notifications.length ? 'Nothing matches these filters' : 'No notifications yet'}</h2>
          <p className='muted'>{notifications.length ? 'Try showing all types or read notifications.' : 'Assignments, deadline reminders and updates will show up here.'}</p>
        </div>
      ) : groups.map((group) => (
        <section key={group.label} className='card notif-group' aria-label={group.label}>
          <h2 className='notif-group-title'>{group.label}</h2>
          <ul>
            {group.items.map((item) => (
              <li key={item.id} className={`notif-row ${item.read ? '' : 'unread'}`} aria-label={item.title}>
                <span className={`notif-icon notif-${item.type}`} aria-hidden='true'>{NOTIFICATION_ICONS[item.type]}</span>
                <div className='notif-body'>
                  <strong>{item.title}{!item.read && <span className='unread-dot' aria-label='Unread' />}</strong>
                  <span>{item.message}</span>
                  <time dateTime={item.createdAt}>{formatTime(item.createdAt, group.label)}</time>
                </div>
                <div className='notif-row-actions'>
                  {item.taskId && canOpenTask(item.taskId) && (
                    <button type='button' className='link-button' onClick={() => openTask(item)}>View task</button>
                  )}
                  {!item.read && <button type='button' className='link-button muted-link' onClick={() => onMarkRead(item.id)}>Mark as read</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

export default NotificationsPage
