import React from 'react'
import Icon from '../Layout/Icon'
import { TASK_STATUS, TASK_STATUS_LABELS } from '../../api/contract'
import { formatDate } from '../../utils/dates'
import PriorityBadge from '../TaskList/PriorityBadge'

const AllTask = ({ tasks, members, onOpen, onEdit, onDelete, onAssign, onArchive }) => (
  <div className='card table-card'>
    <div className='overflow-auto'>
      <table className='data-table' aria-label='All tasks'>
        <thead>
          <tr><th>Task</th><th>Category</th><th>Priority</th><th>Assignee</th><th>Due</th><th>Status</th><th><span className='sr-only'>Actions</span></th></tr>
        </thead>
        <tbody>
          {tasks.length === 0 && <tr><td colSpan={7} className='muted'>No tasks match.</td></tr>}
          {tasks.map((task) => (
            <tr key={task.id}>
              <td><button type='button' className='table-link' onClick={() => onOpen(task)}>{task.title}</button><p className='muted'>{task.description}</p></td>
              <td><span className='tag'>{task.category}</span></td>
              <td><PriorityBadge priority={task.priority} /></td>
              <td>
                <select
                  className='field field-compact'
                  value={task.assigneeId || ''}
                  onChange={(e) => onAssign(task, e.target.value || null)}
                  aria-label={`Assignee for ${task.title}`}
                >
                  <option value=''>Unassigned</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </td>
              <td className='nowrap'>{formatDate(task.dueDate)}</td>
              <td><span className={`status-pill status-${task.status}`}>{TASK_STATUS_LABELS[task.status]}</span></td>
              <td className='row-actions'>
                {task.status === TASK_STATUS.COMPLETED && (
                  <button type='button' className='icon-button' onClick={() => onArchive(task)} aria-label={`Archive ${task.title}`} title='Archive'><Icon name='archive' size={16} /></button>
                )}
                <button type='button' className='icon-button' onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Icon name='edit' size={16} /></button>
                <button type='button' className='icon-button danger' onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Icon name='trash' size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default AllTask
