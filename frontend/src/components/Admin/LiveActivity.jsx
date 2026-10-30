import React from 'react'
import Icon from '../Layout/Icon'
import { formatDateTime } from '../../utils/dates'
import { describeEntry } from '../../utils/people'

const ACTION_ICONS = { created: 'plus', edited: 'edit', assigned: 'user', status_changed: 'check', archived: 'archive', restored: 'restore' }

const LiveActivity = ({ tasks, nameOf, onOpen, limit = 6 }) => {
  const entries = tasks
    .flatMap((task) => task.history.map((entry) => ({ task, entry })))
    .sort((a, b) => b.entry.at.localeCompare(a.entry.at))
    .slice(0, limit)

  return (
    <section className='card panel' aria-label='Live activity'>
      <div className='panel-head'>
        <div><h2 className='panel-title'><span className='live-dot' /> Live activity</h2><p className='muted'>Refreshes automatically</p></div>
      </div>
      {entries.length === 0 ? <p className='muted'>No activity yet.</p> : (
        <ol className='activity'>
          {entries.map(({ task, entry }, index) => (
            <li key={`${task.id}-${entry.at}-${index}`}>
              <span className={`activity-icon activity-${entry.action}`}><Icon name={ACTION_ICONS[entry.action] || 'activity'} size={14} /></span>
              <div>
                <p>{describeEntry(entry, nameOf)} · <button type='button' className='table-link' onClick={() => onOpen(task)}>{task.title}</button></p>
                <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default LiveActivity
