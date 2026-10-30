import React from 'react'
import TaskCard from '../TaskList/TaskCard'
import Icon from '../Layout/Icon'
import { TASK_STATUS, TASK_STATUS_LABELS } from '../../api/contract'

const COLUMNS = [TASK_STATUS.NEW, TASK_STATUS.TO_DO, TASK_STATUS.IN_PROGRESS, TASK_STATUS.BLOCKED, TASK_STATUS.COMPLETED]

const TaskBoard = ({ tasks, now, nameOf, showAssignee, onOpen, onAdd, renderActions }) => (
  <div className='kanban'>
    {COLUMNS.map((status) => {
      const items = tasks.filter((task) => task.status === status).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      return (
        <section key={status} className='kanban-col' aria-label={`${TASK_STATUS_LABELS[status]} column`}>
          <header className='kanban-head'>
            <span className={`dot dot-${status}`} />
            <h2>{TASK_STATUS_LABELS[status]}</h2>
            <span className={`count count-${status}`}>{items.length}</span>
          </header>
          {onAdd && status === TASK_STATUS.NEW && (
            <button type='button' className='add-card' onClick={onAdd}><Icon name='plus' size={16} /> Add task</button>
          )}
          {items.length === 0 && <p className='kanban-empty'>No tasks</p>}
          {items.map((task) => (
            <TaskCard key={task.id} task={task} now={now} nameOf={nameOf} showAssignee={showAssignee} onOpen={onOpen}>
              {renderActions?.(task)}
            </TaskCard>
          ))}
        </section>
      )
    })}
  </div>
)

export default TaskBoard
