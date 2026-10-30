import React, { useState } from 'react'
import BoardFilters from './BoardFilters'
import TaskBoard from './TaskBoard'
import TaskCard from '../TaskList/TaskCard'
import Icon from '../Layout/Icon'
import { TASK_STATUS } from '../../api/contract'
import { formatDateTime } from '../../utils/dates'
import { DEADLINE_STATE, getDeadlineState } from '../../utils/deadlines'
import { ANY_DEADLINE } from '../others/DeadlineSelect'

// `archived` enables the archive view; render* props add per-card or list controls.
const BoardPage = ({ tasks, archived, now, nameOf, members, isAdmin, onOpen, onAdd, renderActions, renderArchivedActions, renderList }) => {
  const [category, setCategory] = useState(null)
  const [assignee, setAssignee] = useState(null)
  const [deadline, setDeadline] = useState(ANY_DEADLINE)
  const [mode, setMode] = useState('kanban')
  const [showArchived, setShowArchived] = useState(false)

  const source = showArchived ? archived : tasks
  const categories = [...new Set(source.map((task) => task.category))].sort()
  const visible = source
    .filter((task) => !category || task.category === category)
    .filter((task) => !assignee || task.assigneeId === assignee)
    .filter((task) => deadline === ANY_DEADLINE || getDeadlineState(task, now) === deadline)
  const open = visible.filter((task) => task.status !== TASK_STATUS.COMPLETED).length
  const overdue = visible.filter((task) => getDeadlineState(task, now) === DEADLINE_STATE.OVERDUE).length

  return (
    <>
      <div className='page-head'>
        <div>
          <nav className='breadcrumb' aria-label='Breadcrumb'>
            <span>Workspace</span><span aria-hidden='true'>›</span>
            {showArchived
              ? <><button type='button' onClick={() => setShowArchived(false)}>Task board</button><span aria-hidden='true'>›</span><span className='crumb-current'>Archive</span></>
              : <span className='crumb-current'>Task board</span>}
          </nav>
          <h1 className='page-title'>{showArchived ? 'Archived tasks' : isAdmin ? 'Team task board' : 'My task board'}</h1>
          <div className='chip-row mt-3'>
            {showArchived
              ? <span className='pill'>{visible.length} archived</span>
              : <>
                <span className='pill pill-primary'><span className='dot dot-in_progress' /> {open} open</span>
                <span className={`pill ${overdue ? 'pill-danger' : ''}`}>{overdue} overdue</span>
              </>}
          </div>
        </div>
        <div className='page-actions'>
          {archived && (
            <button type='button' className='btn btn-ghost' aria-pressed={showArchived} onClick={() => setShowArchived(!showArchived)}>
              <Icon name={showArchived ? 'board' : 'archive'} size={16} /> {showArchived ? 'Back to board' : `Archived (${archived.length})`}
            </button>
          )}
          {renderList && !showArchived && (
            <div className='segmented' role='group' aria-label='Board layout'>
              <button type='button' aria-pressed={mode === 'kanban'} onClick={() => setMode('kanban')}><Icon name='board' size={16} /> Kanban</button>
              <button type='button' aria-pressed={mode === 'list'} onClick={() => setMode('list')}><Icon name='list' size={16} /> List</button>
            </div>
          )}
          {onAdd && !showArchived && <button type='button' className='btn btn-primary' onClick={onAdd}><Icon name='plus' size={16} /> Quick add task</button>}
        </div>
      </div>

      <BoardFilters
        categories={categories}
        category={category}
        onCategory={setCategory}
        members={isAdmin ? members : null}
        assignee={assignee}
        onAssignee={setAssignee}
        deadline={deadline}
        onDeadline={setDeadline}
      />

      {showArchived ? (
        <section aria-label='Archived tasks'>
          {visible.length === 0
            ? <div className='card empty-state'><Icon name='archive' size={28} /><h2>Nothing archived</h2><p className='muted'>Archive completed tasks from the board or task details to tidy them away.</p></div>
            : (
              <div className='archive-grid'>
                {visible.map((task) => (
                  <TaskCard key={task.id} task={task} now={now} nameOf={nameOf} showAssignee={isAdmin} onOpen={onOpen}>
                    <p className='archived-note'><Icon name='archive' size={14} /> Archived {formatDateTime(task.archivedAt)}</p>
                    {renderArchivedActions?.(task)}
                  </TaskCard>
                ))}
              </div>
            )}
        </section>
      ) : mode === 'list' && renderList
        ? renderList(visible)
        : <TaskBoard tasks={visible} now={now} nameOf={nameOf} showAssignee={isAdmin} onOpen={onOpen} onAdd={onAdd} renderActions={renderActions} />}
    </>
  )
}

export default BoardPage
