import React from 'react'
import { TASK_STATUS, TASK_STATUS_LABELS } from '../../api/contract'

const StatusPipeline = ({ tasks, counts, statusFilter, onStatusFilter }) => (
  <section className='card panel' aria-label='Status tracker'>
    <div className='panel-head'>
      <div><h2 className='panel-title'>Status tracker</h2><p className='muted'>Where every task sits in the workflow right now</p></div>
    </div>

    <div className='stacked-bar' role='img' aria-label={Object.values(TASK_STATUS).map((status) => `${TASK_STATUS_LABELS[status]} ${counts[status]}`).join(', ')}>
      {Object.values(TASK_STATUS).map((status) =>
        counts[status] > 0 && <span key={status} className={`bar-${status}`} style={{ flexGrow: counts[status] }} />
      )}
    </div>

    <div className='pipeline'>
      {Object.values(TASK_STATUS).map((status) => {
        const share = tasks.length ? Math.round((counts[status] / tasks.length) * 100) : 0
        return (
          <button
            key={status}
            type='button'
            className='pipeline-item'
            aria-pressed={statusFilter === status}
            aria-label={`${TASK_STATUS_LABELS[status]}: ${counts[status]}`}
            onClick={() => onStatusFilter(statusFilter === status ? 'all' : status)}
          >
            <span className='pipeline-name'><span className={`dot dot-${status}`} />{TASK_STATUS_LABELS[status]}</span>
            <strong>{counts[status]}</strong>
            <span className='muted'>{share}% of tasks</span>
          </button>
        )
      })}
    </div>
    <p className='panel-foot muted'>Select a status to filter the task tracker.</p>
  </section>
)

export default StatusPipeline
