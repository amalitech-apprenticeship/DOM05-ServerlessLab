import React from 'react'
import Avatar from '../Layout/Avatar'
import Icon from '../Layout/Icon'
import MemberActions from '../TaskList/MemberActions'
import Comments from './Comments'
import PriorityBadge from '../TaskList/PriorityBadge'
import { TASK_STATUS, TASK_STATUS_LABELS } from '../../api/contract'
import { formatDate, formatDateTime } from '../../utils/dates'
import { formatBytes } from '../../utils/files'
import { DEADLINE_STATE, describeDue, getDeadlineState } from '../../utils/deadlines'
import { describeEntry } from '../../utils/people'

const EmptyDetails = ({ tasks, onOpen, onBack }) => (
  <>
    <div className='page-head'>
      <div>
        <nav className='breadcrumb' aria-label='Breadcrumb'><button type='button' onClick={onBack}>Task board</button><span aria-hidden='true'>›</span><span className='crumb-current'>Task details</span></nav>
        <h1 className='page-title'>Task details</h1>
      </div>
    </div>
    <div className='card empty-state'>
      <Icon name='details' size={28} />
      <h2>Pick a task to see its details</h2>
      <p className='muted'>Open any card from the board, or choose one of these.</p>
      <ul className='pick-list'>
        {tasks.slice(0, 6).map((task) => (
          <li key={task.id}><button type='button' className='table-link' onClick={() => onOpen(task)}>{task.title}</button><span className={`status-pill status-${task.status}`}>{TASK_STATUS_LABELS[task.status]}</span></li>
        ))}
      </ul>
    </div>
  </>
)

const TaskDetails = ({ task, tasks, now, nameOf, isAdmin, members = [], pending, onOpen, onBack, onStatusChange, onAssign, onEdit, onDelete, onArchive, onUnarchive, onAddComment, onDeleteComment }) => {
  if (!task) return <EmptyDetails tasks={tasks} onOpen={onOpen} onBack={onBack} />

  const deadline = getDeadlineState(task, now)
  const history = [...task.history].reverse()
  const archived = Boolean(task.archivedAt)
  const canArchive = isAdmin && task.status === TASK_STATUS.COMPLETED && !archived

  return (
    <>
      <div className='page-head'>
        <nav className='breadcrumb' aria-label='Breadcrumb'>
          <button type='button' onClick={onBack}>Task board</button><span aria-hidden='true'>›</span><span className='crumb-current'>{task.title}</span>
        </nav>
      </div>

      {archived && (
        <div className='archived-banner' role='status' aria-label='Archived task'>
          <Icon name='archive' />
          <p><strong>Archived {formatDateTime(task.archivedAt)}.</strong> It’s hidden from the board and read-only until it’s restored.</p>
          {isAdmin && <button type='button' className='btn btn-sm btn-primary' onClick={() => onUnarchive(task)} disabled={pending}>Restore</button>}
        </div>
      )}

      <div className='details-layout'>
        <article className='card details-main' aria-label='Task details'>
          <div className='details-meta'>
            <span className='eyebrow-chip'>{task.category} · {task.id.toUpperCase()}</span>
            <span className='muted'>Created {formatDateTime(task.createdAt)}</span>
          </div>
          <h1 className='details-title'>{task.title}</h1>

          <h2 className='details-section'>Description</h2>
          <p className='details-body'>{task.description || <span className='muted'>No description provided.</span>}</p>

          {task.attachment && (
            <>
              <h2 className='details-section'>Attachment</h2>
              <a className='attachment-card' href={task.attachment.url} download={task.attachment.name} aria-label={`Download ${task.attachment.name}`}>
                <span className='attachment-icon'><Icon name='paperclip' size={18} /></span>
                <span className='attachment-meta'><strong>{task.attachment.name}</strong><span>{formatBytes(task.attachment.size)}</span></span>
                <Icon name='download' size={18} />
              </a>
            </>
          )}

          <Comments
            task={task}
            nameOf={nameOf}
            isAdmin={isAdmin}
            readOnly={archived}
            onAdd={(input) => onAddComment(task, input)}
            onDelete={(commentId) => onDeleteComment(task, commentId)}
          />

          <h2 className='details-section'>Activity <span className='count'>{history.length}</span></h2>
          <ol className='timeline'>
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`}>
                <Avatar name={nameOf(entry.by)} size='sm' />
                <div><p>{describeEntry(entry, nameOf)}</p><time dateTime={entry.at}>{formatDateTime(entry.at)}</time></div>
              </li>
            ))}
          </ol>
        </article>

        <aside className='details-side'>
          <section className='card side-card' aria-label='Task properties'>
            <p className='side-label'>Status</p>
            {isAdmin ? (
              <select className={`field status-select status-${task.status}`} aria-label='Status' value={task.status} disabled={pending || archived} onChange={(e) => onStatusChange(task, e.target.value)}>
                {Object.values(TASK_STATUS).map((status) => <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>)}
              </select>
            ) : (
              <>
                <div className={`status-box status-${task.status}`}><span className={`dot dot-${task.status}`} /> {TASK_STATUS_LABELS[task.status]}</div>
                {!archived && <MemberActions task={task} onStatusChange={onStatusChange} disabled={pending} />}
              </>
            )}

            <div className='side-divider' />
            <p className='side-label'>Assignee</p>
            {task.assigneeId ? (
              <div className='person-box'><Avatar name={nameOf(task.assigneeId)} /><div><strong>{nameOf(task.assigneeId)}</strong><span>Team member</span></div></div>
            ) : <div className='person-box muted'>Unassigned</div>}
            {isAdmin && (
              <label className='field-label mt-3'>Reassign
                <select className='field' aria-label={`Assignee for ${task.title}`} value={task.assigneeId || ''} disabled={archived} onChange={(e) => onAssign(task, e.target.value || null)}>
                  <option value=''>Unassigned</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
            )}

            <div className='side-divider' />
            <dl className='side-facts'>
              <div><dt><Icon name='flag' size={16} /> Priority</dt><dd><PriorityBadge priority={task.priority} /></dd></div>
              <div><dt><Icon name='user' size={16} /> Reporter</dt><dd>{nameOf(task.createdBy)}</dd></div>
              <div>
                <dt><Icon name='calendar' size={16} /> Due date</dt>
                <dd>{formatDate(task.dueDate)}{deadline !== DEADLINE_STATE.DONE && <span className={`due-note deadline-text-${deadline}`}>{describeDue(task, now)}</span>}</dd>
              </div>
              <div><dt><Icon name='clock' size={16} /> Last update</dt><dd>{formatDateTime(task.updatedAt)}</dd></div>
            </dl>
          </section>

          {onEdit && (
            <section className='card side-card' aria-label='Task operations'>
              <p className='side-label'>Task operations</p>
              <button type='button' className='op-button' onClick={() => onEdit(task)} disabled={archived} title={archived ? 'Restore the task to edit it' : undefined} aria-label={`Edit ${task.title}`}><Icon name='edit' size={16} /> Edit task</button>
              {canArchive && <button type='button' className='op-button' onClick={() => onArchive(task)} disabled={pending} aria-label={`Archive ${task.title}`}><Icon name='archive' size={16} /> Archive task</button>}
              {isAdmin && archived && <button type='button' className='op-button' onClick={() => onUnarchive(task)} disabled={pending} aria-label={`Restore ${task.title}`}><Icon name='restore' size={16} /> Restore from archive</button>}
              {isAdmin && <button type='button' className='op-button danger' onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Icon name='trash' size={16} /> Delete task</button>}
            </section>
          )}
        </aside>
      </div>
    </>
  )
}

export default TaskDetails
