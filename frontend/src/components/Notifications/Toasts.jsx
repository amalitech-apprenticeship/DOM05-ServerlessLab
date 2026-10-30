import React, { useEffect } from 'react'
import { NOTIFICATION_ICONS } from './icons'

const TOAST_MS = 6000

const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div className='toast' role='status'>
      <span className={`notif-icon notif-${toast.type}`} aria-hidden='true'>{NOTIFICATION_ICONS[toast.type]}</span>
      <span className='notif-body'><strong>{toast.title}</strong><span>{toast.message}</span></span>
      <button type='button' className='link-button' aria-label='Dismiss' onClick={() => onDismiss(toast.id)}>✕</button>
    </div>
  )
}

const Toasts = ({ toasts, onDismiss }) => (
  <div className='toast-stack' aria-live='polite'>
    {toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />)}
  </div>
)

export default Toasts
