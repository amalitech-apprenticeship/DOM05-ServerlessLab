import React from 'react'
import Avatar from '../Layout/Avatar'
import Icon from '../Layout/Icon'
import { DEADLINE_STATE, describeDue, getDeadlineState } from '../../utils/deadlines'

const REASON = {
  [DEADLINE_STATE.OVERDUE]: 'Overdue',
  [DEADLINE_STATE.DUE_TODAY]: 'Due today',
  blocked: 'Blocked',
  unassigned: 'No owner',
}

const AttentionQueue = ({ items, now, nameOf, onOpen }) => (
  <section className='card panel' aria-label='Attention queue'>
    <div className='panel-head'>
      <div><h2 className='panel-title'><span className='live-dot danger' /> Attention queue</h2><p className='muted'>Open tasks that need an admin decision</p></div>
      {items.length > 0 && <span className='pill pill-danger'>{items.length} flagged</span>}
    </div>
    {items.length === 0 ? <p className='muted'>Nothing needs attention. 🎉</p> : (
      <ul className='queue'>
        {items.slice(0, 4).map(({ task, reason }) => (
          <li key={task.id} className='queue-item'>
            <div className='queue-top'>
              <span className={`reason reason-${reason}`}>{REASON[reason]}</span>
              <strong className='queue-title'>{task.title}</strong>
              <span className={`queue-due deadline-text-${getDeadlineState(task, now)}`}>{describeDue(task, now)}</span>
            </div>
            <div className='queue-bottom'>
              {task.assigneeId
                ? <span className='kcard-assignee'><Avatar name={nameOf(task.assigneeId)} size='sm' />{nameOf(task.assigneeId)}</span>
                : <span className='muted'>Unassigned</span>}
              <button type='button' className='btn btn-sm btn-primary' onClick={() => onOpen(task)} aria-label={`Review ${task.title}`}>Review</button>
            </div>
          </li>
        ))}
      </ul>
    )}
    {items.length > 4 && <p className='panel-foot'><Icon name='arrowRight' size={14} /> {items.length - 4} more in the task tracker below</p>}
  </section>
)

export default AttentionQueue
