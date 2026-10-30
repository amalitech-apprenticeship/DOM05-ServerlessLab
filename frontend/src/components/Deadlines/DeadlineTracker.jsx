import React, { forwardRef } from 'react'
import { TASK_STATUS_LABELS } from '../../api/contract'
import { formatDate } from '../../utils/dates'
import { DEADLINE_LABELS, DEADLINE_STATE, describeDue, getDeadlineState } from '../../utils/deadlines'

const GROUPS = [DEADLINE_STATE.OVERDUE, DEADLINE_STATE.DUE_TODAY, DEADLINE_STATE.DUE_SOON, DEADLINE_STATE.UPCOMING]

const DeadlineTracker = forwardRef(function DeadlineTracker({ tasks, now, onOpen }, ref) {
  const open = tasks
    .map((task) => ({ task, state: getDeadlineState(task, now) }))
    .filter(({ state }) => state !== DEADLINE_STATE.DONE)
    .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate))

  return (
    <section className='card panel' aria-label='Deadline tracker' ref={ref} tabIndex={-1}>
      <div className='panel-head'>
        <div><h2 className='panel-title'>Deadline tracker</h2><p className='muted'>Your open tasks, ordered by due date</p></div>
        <span className='pill pill-primary'>{open.length ? `Next: ${describeDue(open[0].task, now)}` : 'Nothing open'}</span>
      </div>

      {open.length === 0 ? <p className='muted'>No open deadlines. Nice work.</p> : (
        <div className='deadline-groups'>
          {GROUPS.map((group) => {
            const items = open.filter(({ state }) => state === group)
            return (
              <div key={group} className={`deadline-group deadline-group-${group}`} aria-label={DEADLINE_LABELS[group]} role='group'>
                <h3><span>{DEADLINE_LABELS[group]}</span><span className='count'>{items.length}</span></h3>
                {items.length === 0 ? <p className='muted'>—</p> : (
                  <ul>
                    {items.map(({ task }) => (
                      <li key={task.id}>
                        <button type='button' className='table-link' onClick={() => onOpen?.(task)}>{task.title}</button>
                        <span>{describeDue(task, now)} · {formatDate(task.dueDate)}</span>
                        <span className={`status-pill status-${task.status}`}>{TASK_STATUS_LABELS[task.status]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
})

export default DeadlineTracker
