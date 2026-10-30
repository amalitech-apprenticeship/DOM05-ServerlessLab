import React from 'react'
import Avatar from '../Layout/Avatar'
import Icon from '../Layout/Icon'
import PriorityBadge from './PriorityBadge'
import { TASK_STATUS } from '../../api/contract'
import { formatDate } from '../../utils/dates'
import { DEADLINE_STATE, describeDue, getDeadlineState } from '../../utils/deadlines'

const TaskCard = ({ task, now, nameOf, showAssignee = true, onOpen, children }) => {
  const deadline = getDeadlineState(task, now)
  const done = task.status === TASK_STATUS.COMPLETED
  return (
    <article className={`kcard ${done ? 'kcard-done' : ''}`} aria-label={task.title}>
      <div className='kcard-top'>
        <span className='kcard-tags'><span className='tag'>{task.category}</span><PriorityBadge priority={task.priority} /></span>
        {deadline !== DEADLINE_STATE.DONE && <span className={`deadline-badge deadline-${deadline}`}>{describeDue(task, now)}</span>}
      </div>
      <h3 className='kcard-title'>
        {onOpen ? <button type='button' className='kcard-link' onClick={() => onOpen(task)}>{task.title}</button> : task.title}
      </h3>
      {task.description && <p className='kcard-desc'>{task.description}</p>}
      {children}
      <div className='kcard-foot'>
        <span className='kcard-due'>
          <Icon name='calendar' size={14} /> {formatDate(task.dueDate)}
          {task.comments?.length > 0 && <span className='kcard-clip' title='Comments'><Icon name='comment' size={14} />{task.comments.length}<span className='sr-only'> comments</span></span>}
          {task.attachment && <span className='kcard-clip' title={task.attachment.name}><Icon name='paperclip' size={14} /><span className='sr-only'>Has attachment</span></span>}
        </span>
        {showAssignee && (task.assigneeId
          ? <span className='kcard-assignee'><Avatar name={nameOf(task.assigneeId)} size='sm' />{nameOf(task.assigneeId)}</span>
          : <span className='kcard-assignee muted'>Unassigned</span>)}
      </div>
    </article>
  )
}

export default TaskCard
