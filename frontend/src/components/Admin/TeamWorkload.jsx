import React from 'react'
import Avatar from '../Layout/Avatar'
import { TASK_STATUS, TASK_STATUS_LABELS } from '../../api/contract'
import { DEADLINE_STATE, getDeadlineState } from '../../utils/deadlines'

const TeamWorkload = ({ tasks, members, now }) => (
  <section className='card panel' aria-label='Team workload'>
    <div className='panel-head'>
      <div><h2 className='panel-title'>Team workload</h2><p className='muted'>Open work and completion per team member</p></div>
    </div>
    <ul className='workload'>
      {members.map((member) => {
        const own = tasks.filter((task) => task.assigneeId === member.id)
        const done = own.filter((task) => task.status === TASK_STATUS.COMPLETED).length
        const overdue = own.filter((task) => getDeadlineState(task, now) === DEADLINE_STATE.OVERDUE).length
        const completion = own.length ? Math.round((done / own.length) * 100) : 0
        const breakdown = Object.values(TASK_STATUS).map((status) => `${own.filter((task) => task.status === status).length} ${TASK_STATUS_LABELS[status].toLowerCase()}`).join(', ')
        return (
          <li key={member.id} aria-label={member.name}>
            <div className='workload-row'>
              <Avatar name={member.name} />
              <div className='workload-name'><strong>{member.name}</strong><span className='muted'>{breakdown}</span></div>
              <div className='workload-stats'>
                <span className='muted'>{own.length - done} open{overdue > 0 && <span className='text-danger'> · {overdue} overdue</span>}</span>
                <strong className={completion >= 50 ? 'text-success' : 'text-primary'}>{completion}%</strong>
              </div>
            </div>
            <div className='progress-track' role='progressbar' aria-label={`${member.name} completion`} aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
              <div className={overdue ? 'bar-danger' : ''} style={{ width: `${completion}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  </section>
)

export default TeamWorkload
