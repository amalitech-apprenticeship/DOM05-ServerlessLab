import React, { useState } from 'react'
import StatCard from '../others/StatCard'
import Icon from '../Layout/Icon'
import StatusPipeline from './StatusPipeline'
import AttentionQueue from './AttentionQueue'
import TeamWorkload from './TeamWorkload'
import LiveActivity from './LiveActivity'
import TaskTracker from './TaskTracker'
import { useAuth } from '../../context/AuthContext'
import { TASK_STATUS } from '../../api/contract'
import { DEADLINE_STATE, getAttentionTasks, getDeadlineState } from '../../utils/deadlines'
import { greeting } from '../../utils/people'

const AdminOverview = ({ tasks, members, nameOf, now, onOpen, onViewBoard, onNewTask }) => {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')

  const counts = Object.fromEntries(Object.values(TASK_STATUS).map((status) => [status, tasks.filter((task) => task.status === status).length]))
  const open = tasks.filter((task) => task.status !== TASK_STATUS.COMPLETED)
  const overdue = open.filter((task) => getDeadlineState(task, now) === DEADLINE_STATE.OVERDUE)
  const unassigned = open.filter((task) => !task.assigneeId)
  const completion = tasks.length ? Math.round((counts[TASK_STATUS.COMPLETED] / tasks.length) * 100) : 0
  const attention = getAttentionTasks(tasks, now)
  const busyMembers = new Set(open.map((task) => task.assigneeId).filter(Boolean)).size

  return (
    <>
      <section className='card hero'>
        <div>
          <p className='eyebrow'><span className='live-dot' /> {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className='hero-title'>{greeting(now)}, {user.name}. Your team has {open.length} active {open.length === 1 ? 'task' : 'tasks'} in flight.</h1>
          <p className='hero-sub'>{overdue.length} overdue, {counts[TASK_STATUS.BLOCKED]} flagged as needing attention and {unassigned.length} waiting for an owner.</p>
        </div>
        <div className='hero-actions'>
          <button type='button' className='btn btn-primary' onClick={onNewTask}><Icon name='plus' size={16} /> New task</button>
          <button type='button' className='btn btn-ghost' onClick={onViewBoard}><Icon name='board' size={16} /> Open task board</button>
        </div>
      </section>

      <div className='stat-grid'>
        <StatCard label='Active tasks' value={open.length} icon='check' tone='primary'>
          <span>{counts[TASK_STATUS.IN_PROGRESS]} in progress</span><span className='text-primary'>{open.length - unassigned.length} assigned</span>
        </StatCard>
        <StatCard label='Completion rate' value={`${completion}%`} icon='gauge' tone='success' note={completion >= 50 ? 'On track' : 'Behind'}>
          <div className='progress-track' role='progressbar' aria-label='Overall completion' aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${completion}%` }} /></div>
        </StatCard>
        <StatCard label='Overdue / at risk' value={overdue.length} icon='alert' tone='danger' note={attention.length ? `${attention.length} flagged` : undefined}>
          <span>{counts[TASK_STATUS.BLOCKED]} need attention</span>
        </StatCard>
        <StatCard label='Team coverage' value={`${busyMembers}/${members.length}`} icon='users' tone='purple' note='members busy'>
          <span>{unassigned.length} unassigned</span>{unassigned.length > 0 && <button type='button' className='table-link' onClick={onViewBoard}>Assign now →</button>}
        </StatCard>
      </div>

      <div className='grid-main'>
        <StatusPipeline tasks={tasks} counts={counts} statusFilter={statusFilter} onStatusFilter={setStatusFilter} />
        <AttentionQueue items={attention} now={now} nameOf={nameOf} onOpen={onOpen} />
      </div>

      <div className='grid-main'>
        <TeamWorkload tasks={tasks} members={members} now={now} />
        <LiveActivity tasks={tasks} nameOf={nameOf} onOpen={onOpen} />
      </div>

      <TaskTracker tasks={tasks} members={members} nameOf={nameOf} now={now} statusFilter={statusFilter} onStatusFilter={setStatusFilter} onOpen={onOpen} />
    </>
  )
}

export default AdminOverview
