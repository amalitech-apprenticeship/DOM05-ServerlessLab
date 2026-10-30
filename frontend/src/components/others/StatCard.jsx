import React from 'react'
import Icon from '../Layout/Icon'

const StatCard = ({ label, value, icon, tone = 'primary', note, children }) => (
  <div className='card stat-card' role='group' aria-label={label}>
    <div className='stat-head'>
      <span className='stat-label'>{label}</span>
      <span className={`stat-icon tone-${tone}`}><Icon name={icon} /></span>
    </div>
    <div className='stat-value'><strong>{value}</strong>{note && <span className={`stat-note tone-${tone}`}>{note}</span>}</div>
    {children && <div className='stat-foot'>{children}</div>}
  </div>
)

export default StatCard
