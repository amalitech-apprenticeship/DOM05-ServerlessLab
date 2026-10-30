import React from 'react'
import Icon from '../Layout/Icon'
import { TASK_PRIORITY, TASK_PRIORITY_LABELS } from '../../api/contract'

const PriorityBadge = ({ priority = TASK_PRIORITY.MEDIUM }) => (
  <span className={`priority-pill priority-${priority}`} title='Priority'>
    <Icon name='flag' size={12} /> {TASK_PRIORITY_LABELS[priority]}
  </span>
)

export default PriorityBadge
