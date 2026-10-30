import React from 'react'
import { DEADLINE_LABELS, DEADLINE_STATE } from '../../utils/deadlines'

export const ANY_DEADLINE = 'all'

const OPTIONS = [DEADLINE_STATE.OVERDUE, DEADLINE_STATE.DUE_TODAY, DEADLINE_STATE.DUE_SOON, DEADLINE_STATE.UPCOMING, DEADLINE_STATE.DONE]

const DeadlineSelect = ({ value, onChange, className = 'field field-compact' }) => (
  <label className='field-label'>Deadline
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value={ANY_DEADLINE}>Any deadline</option>
      {OPTIONS.map((state) => <option key={state} value={state}>{DEADLINE_LABELS[state]}</option>)}
    </select>
  </label>
)

export default DeadlineSelect
