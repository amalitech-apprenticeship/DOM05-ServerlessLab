import React from 'react'
import StatCard from './StatCard'
import { TASK_STATUS } from '../../api/contract'

const count = (tasks, status) => tasks.filter((task) => task.status === status).length

const NumberOfTask = ({ tasks }) => {
  const done = count(tasks, TASK_STATUS.COMPLETED)
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0
  return (
    <div className='stat-grid'>
      <StatCard label='New tasks' value={count(tasks, TASK_STATUS.NEW)} icon='plus' tone='primary'><span>Waiting for you to accept</span></StatCard>
      <StatCard label='In progress' value={count(tasks, TASK_STATUS.IN_PROGRESS)} icon='clock' tone='purple'><span>Currently being worked on</span></StatCard>
      <StatCard label='Completed' value={done} icon='check' tone='success' note={`${completion}%`}>
        <div className='progress-track'><div style={{ width: `${completion}%` }} /></div>
      </StatCard>
      <StatCard label='Needs attention' value={count(tasks, TASK_STATUS.BLOCKED)} icon='alert' tone='danger'><span>Flagged with an issue</span></StatCard>
    </div>
  )
}

export default NumberOfTask
