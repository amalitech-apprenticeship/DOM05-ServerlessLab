import React, { useEffect, useRef, useState } from 'react'
import { formatDateTime } from '../../utils/dates'
import { NOTIFICATION_ICONS } from './icons'
import Icon from '../Layout/Icon'

const PANEL_LIMIT = 8

const NotificationBell = ({ notifications, onMarkRead, onMarkAllRead, onSeeAll }) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const unread = notifications.filter((item) => !item.read).length

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (e) => !containerRef.current?.contains(e.target) && setOpen(false)
    const closeOnEscape = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className='notif' ref={containerRef}>
      <button type='button' className='icon-button notif-button' aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name='bell' size={20} />
        {unread > 0 && <span className='notif-badge' aria-hidden='true'>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className='notif-panel' role='dialog' aria-label='Notifications'>
          <div className='notif-panel-header'>
            <strong>Notifications</strong>
            <button type='button' className='link-button' onClick={onMarkAllRead} disabled={unread === 0}>Mark all read</button>
          </div>
          {notifications.length === 0 ? <p className='muted notif-empty'>You’re all caught up.</p> : (
            <ul>
              {notifications.slice(0, PANEL_LIMIT).map((item) => (
                <li key={item.id}>
                  <button type='button' className={`notif-item ${item.read ? '' : 'unread'}`} onClick={() => !item.read && onMarkRead(item.id)}>
                    <span className={`notif-icon notif-${item.type}`} aria-hidden='true'>{NOTIFICATION_ICONS[item.type]}</span>
                    <span className='notif-body'>
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                    </span>
                    {!item.read && <span className='sr-only'>Unread</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {onSeeAll && (
            <div className='notif-panel-footer'>
              <button type='button' className='link-button' onClick={() => { setOpen(false); onSeeAll() }}>See all notifications</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
