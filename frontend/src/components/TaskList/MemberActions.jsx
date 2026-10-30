import React from 'react'
import { MEMBER_STATUS_TRANSITIONS, TASK_STATUS } from '../../api/contract'

const ACTIONS = {
  [TASK_STATUS.TO_DO]: { label: 'Accept task', className: 'btn-primary' },
  [TASK_STATUS.IN_PROGRESS]: { label: 'Start work', className: 'btn-primary' },
  [TASK_STATUS.COMPLETED]: { label: 'Mark complete', className: 'btn-success' },
  [TASK_STATUS.BLOCKED]: { label: 'Flag issue', className: 'btn-danger-soft' },
}

const actionFor = (task, nextStatus) =>
  task.status === TASK_STATUS.BLOCKED && nextStatus === TASK_STATUS.IN_PROGRESS
    ? { label: 'Resume', className: 'btn-primary' }
    : ACTIONS[nextStatus]

const MemberActions = ({ task, onStatusChange, disabled }) => {
  const next = MEMBER_STATUS_TRANSITIONS[task.status]
  if (next.length === 0) return null
  return (
    <div className='member-actions'>
      {next.map((status) => {
        const action = actionFor(task, status)
        return (
          <button key={status} type='button' className={`btn btn-sm ${action.className}`} disabled={disabled} onClick={() => onStatusChange(task, status)}>
            {action.label}
          </button>
        )
      })}
    </div>
  )
}

export default MemberActions
