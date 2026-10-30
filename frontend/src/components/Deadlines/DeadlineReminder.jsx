import React from 'react'
import Icon from '../Layout/Icon'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const DeadlineReminder = ({ overdue, dueSoon, onView, onSnooze }) => {
  const parts = []
  if (overdue.length) parts.push(`${plural(overdue.length, 'task')} overdue`)
  if (dueSoon.length) parts.push(`${plural(dueSoon.length, 'task')} due within a day`)
  const next = [...overdue, ...dueSoon][0]

  return (
    <div className={`reminder-banner ${overdue.length ? 'reminder-urgent' : ''}`} role='alert' aria-label='Deadline reminder'>
      <span className='reminder-icon' aria-hidden='true'><Icon name={overdue.length ? 'alert' : 'clock'} /></span>
      <div className='reminder-text'>
        <strong>Reminder: you have {parts.join(' and ')}.</strong>
        {next && <span className='muted'>Start with “{next.title}”.</span>}
      </div>
      <div className='reminder-actions'>
        <button type='button' className='btn btn-sm btn-primary' onClick={onView}>View deadlines</button>
        <button type='button' className='link-button' onClick={onSnooze}>Remind me later</button>
      </div>
    </div>
  )
}

export default DeadlineReminder
