import React from 'react'
import Avatar from '../Layout/Avatar'
import DeadlineSelect from '../others/DeadlineSelect'

const BoardFilters = ({ categories, category, onCategory, members, assignee, onAssignee, deadline, onDeadline }) => (
  <div className='card filter-bar'>
    {members && (
      <div className='filter-group'>
        <span className='filter-label'>Assignees</span>
        <div className='avatar-filter'>
          {members.map((member) => (
            <button
              key={member.id}
              type='button'
              className='avatar-toggle'
              aria-pressed={assignee === member.id}
              aria-label={`Only ${member.name}`}
              onClick={() => onAssignee(assignee === member.id ? null : member.id)}
            >
              <Avatar name={member.name} size='sm' />
            </button>
          ))}
        </div>
      </div>
    )}
    <div className='filter-group'>
      <span className='filter-label'>Categories</span>
      <div className='chip-row'>
        {categories.map((name) => (
          <button key={name} type='button' className='chip' aria-pressed={category === name} onClick={() => onCategory(category === name ? null : name)}>
            {name}
          </button>
        ))}
      </div>
    </div>
    <div className='filter-group filter-push'>
      <DeadlineSelect value={deadline} onChange={onDeadline} />
    </div>
  </div>
)

export default BoardFilters
