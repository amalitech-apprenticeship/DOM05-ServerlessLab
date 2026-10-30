import React, { useState } from 'react'
import Avatar from '../Layout/Avatar'
import { TASK_STATUS, TASK_STATUS_LABELS } from '../../api/contract'
import { formatDate, formatDateTime } from '../../utils/dates'
import { DEADLINE_STATE, describeDue, getDeadlineState } from '../../utils/deadlines'
import DeadlineSelect, { ANY_DEADLINE } from '../others/DeadlineSelect'
import { describeEntry } from '../../utils/people'

const ALL = 'all'
const UNASSIGNED = 'unassigned'

// statusFilter/onStatusFilter come from the parent so the status pipeline can set them.
const TaskTracker = ({ tasks, members, nameOf, now, statusFilter, onStatusFilter, onOpen }) => {
  const [assigneeFilter, setAssigneeFilter] = useState(ALL)
  const [deadlineFilter, setDeadlineFilter] = useState(ANY_DEADLINE)
  const isOverdue = (task) => getDeadlineState(task, now) === DEADLINE_STATE.OVERDUE

  const visible = tasks
    .filter((task) => statusFilter === ALL || task.status === statusFilter)
    .filter((task) => assigneeFilter === ALL || (assigneeFilter === UNASSIGNED ? !task.assigneeId : task.assigneeId === assigneeFilter))
    .filter((task) => deadlineFilter === ANY_DEADLINE || getDeadlineState(task, now) === deadlineFilter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <section className='card panel' aria-label='Task tracker'>
      <div className='panel-head wrap'>
        <div><h2 className='panel-title'>Task tracker</h2><p className='muted'>Live status of every task, most recently updated first</p></div>
        <div className='tracker-filters'>
          <label className='field-label'>Status
            <select className='field field-compact' value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}>
              <option value={ALL}>All statuses</option>
              {Object.values(TASK_STATUS).map((status) => <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>)}
            </select>
          </label>
          <label className='field-label'>Assignee
            <select className='field field-compact' value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
              <option value={ALL}>Everyone</option>
              <option value={UNASSIGNED}>Unassigned</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </label>
          <DeadlineSelect value={deadlineFilter} onChange={setDeadlineFilter} />
        </div>
      </div>

      <div className='overflow-auto'>
        <table className='data-table' aria-label='Task status'>
          <thead><tr><th>Task</th><th>Assignee</th><th>Status</th><th>Deadline</th><th>Activity</th></tr></thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={5} className='muted'>No tasks match these filters.</td></tr>}
            {visible.map((task) => (
              <tr key={task.id}>
                <td><button type='button' className='table-link' onClick={() => onOpen(task)}>{task.title}</button><p className='muted'>{task.category}</p></td>
                <td>{task.assigneeId
                  ? <span className='kcard-assignee'><Avatar name={nameOf(task.assigneeId)} size='sm' />{nameOf(task.assigneeId)}</span>
                  : <span className='muted'>Unassigned</span>}</td>
                <td><span className={`status-pill status-${task.status}`}>{TASK_STATUS_LABELS[task.status]}</span></td>
                <td className='nowrap'>
                  {formatDate(task.dueDate)}
                  {task.status !== TASK_STATUS.COMPLETED && <p className={isOverdue(task) ? 'overdue-note' : 'muted'}>{describeDue(task, now)}</p>}
                </td>
                <td>
                  <details className='history'>
                    <summary>Updated {formatDateTime(task.updatedAt)}</summary>
                    <ol>
                      {[...task.history].reverse().map((entry, index) => (
                        <li key={`${entry.at}-${index}`}><span>{describeEntry(entry, nameOf)}</span><time dateTime={entry.at}>{formatDateTime(entry.at)}</time></li>
                      ))}
                    </ol>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TaskTracker
