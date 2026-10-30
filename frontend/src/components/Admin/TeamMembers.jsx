import React, { useState } from 'react'
import Avatar from '../Layout/Avatar'
import Icon from '../Layout/Icon'
import Modal from '../Layout/Modal'
import MemberForm from './MemberForm'
import { TASK_STATUS } from '../../api/contract'
import { formatDateTime } from '../../utils/dates'

const CreatedCredentials = ({ result, onDone }) => {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${result.user.email}\n${result.temporaryPassword}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className='credentials' role='region' aria-label='New member credentials'>
      <p><strong>{result.user.name}</strong> has been added to the team and can be assigned tasks now.</p>
      {result.temporaryPassword ? (
        <>
          <p className='muted'>Share this temporary password with them securely. It won’t be shown again.</p>
          <dl className='credential-box'>
            <div><dt>Email</dt><dd>{result.user.email}</dd></div>
            <div><dt>Temporary password</dt><dd><code>{result.temporaryPassword}</code></dd></div>
          </dl>
        </>
      ) : <p className='muted'>An invitation has been sent to {result.user.email}.</p>}
      <div className='form-buttons'>
        {result.temporaryPassword && <button type='button' className='btn btn-ghost' onClick={copy}>{copied ? 'Copied' : 'Copy details'}</button>}
        <button type='button' className='btn btn-primary' onClick={onDone}>Done</button>
      </div>
    </div>
  )
}

// `members` includes deactivated members (with deactivatedAt).
const TeamMembers = ({ members, tasks, loading, error, onCreate, onUpdate, onDeactivate, onReactivate }) => {
  const [modal, setModal] = useState(null) // null | { member } | { created }
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [openFilter, setOpenFilter] = useState('any')
  const [doneFilter, setDoneFilter] = useState('any')
  const [statusFilter, setStatusFilter] = useState('active')

  const close = () => setModal(null)
  const tasksOf = (member) => tasks.filter((task) => task.assigneeId === member.id)
  const openCount = (member) => tasksOf(member).filter((task) => task.status !== TASK_STATUS.COMPLETED).length
  const doneCount = (member) => tasksOf(member).length - openCount(member)
  const matchesCount = (filter, count) => filter === 'any' || (filter === 'some' ? count > 0 : count === 0)
  const activeCount = members.filter((member) => !member.deactivatedAt).length
  const visible = members
    .filter((member) => statusFilter === 'all' || (statusFilter === 'active') === !member.deactivatedAt)
    .filter((member) => member.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
    .filter((member) => matchesCount(openFilter, openCount(member)))
    .filter((member) => matchesCount(doneFilter, doneCount(member)))

  const save = async (form) => {
    if (modal.member) {
      await onUpdate(modal.member.id, form)
      close()
    } else {
      setModal({ created: await onCreate(form) })
    }
  }

  const deactivate = async (member) => {
    const open = openCount(member)
    const warning = open ? ` Their ${open} open ${open === 1 ? 'task' : 'tasks'} will be unassigned.` : ''
    if (!window.confirm(`Deactivate ${member.name}? They will lose access immediately and can't be assigned work.${warning}`)) return
    try {
      const result = await onDeactivate(member.id)
      setActionError('')
      setNotice(`${member.name} was deactivated.${result.unassignedTasks ? ` ${result.unassignedTasks} open ${result.unassignedTasks === 1 ? 'task is' : 'tasks are'} now unassigned.` : ''}`)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const reactivate = async (member) => {
    try {
      await onReactivate(member.id)
      setActionError('')
      setNotice(`${member.name} was reactivated and can sign in again.`)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const modalTitle = modal?.created ? 'Team member added' : modal?.member ? 'Edit team member' : 'Add team member'

  return (
    <>
      <div className='page-head'>
        <div>
          <nav className='breadcrumb' aria-label='Breadcrumb'><span>Workspace</span><span aria-hidden='true'>›</span><span className='crumb-current'>Team members</span></nav>
          <h1 className='page-title'>Team members</h1>
          <p className='muted mt-2'>People who can be assigned tasks. {activeCount} active, {members.length - activeCount} deactivated.</p>
        </div>
        <div className='page-actions'>
          <button type='button' className='btn btn-primary' onClick={() => setModal({ member: null })}><Icon name='plus' size={16} /> Add team member</button>
        </div>
      </div>

      {(error || actionError) && <p className='banner-error' role='alert'>{error || actionError}</p>}
      {notice && <p className='banner-info' role='status'>{notice}</p>}

      <div className='card filter-bar' role='group' aria-label='Filter team members'>
        <label className='search search-inline'>
          <Icon name='search' />
          <span className='sr-only'>Filter by name</span>
          <input type='search' value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder='Filter by name…' />
        </label>
        <label className='field-label'>Status
          <select className='field field-compact' value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value='active'>Active</option>
            <option value='deactivated'>Deactivated</option>
            <option value='all'>All</option>
          </select>
        </label>
        <label className='field-label'>Open tasks
          <select className='field field-compact' value={openFilter} onChange={(e) => setOpenFilter(e.target.value)}>
            <option value='any'>Any</option>
            <option value='some'>Has open tasks</option>
            <option value='none'>No open tasks</option>
          </select>
        </label>
        <label className='field-label'>Completed
          <select className='field field-compact' value={doneFilter} onChange={(e) => setDoneFilter(e.target.value)}>
            <option value='any'>Any</option>
            <option value='some'>Has completed tasks</option>
            <option value='none'>None completed</option>
          </select>
        </label>
        <span className='muted filter-push'>{visible.length} of {members.length} shown</span>
      </div>

      <div className='card table-card'>
        <div className='overflow-auto'>
          <table className='data-table table-middle' aria-label='Team members'>
            <thead><tr><th>Member</th><th>Email</th><th>Open tasks</th><th>Completed</th><th>Added</th><th><span className='sr-only'>Actions</span></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} className='muted'>Loading team…</td></tr>}
              {!loading && members.length === 0 && <tr><td colSpan={6} className='muted'>No team members yet. Add one to start assigning work.</td></tr>}
              {!loading && members.length > 0 && visible.length === 0 && <tr><td colSpan={6} className='muted'>No team members match these filters.</td></tr>}
              {visible.map((member) => (
                <tr key={member.id} className={member.deactivatedAt ? 'row-muted' : ''}>
                  <td><span className='kcard-assignee'><Avatar name={member.name} /><strong>{member.name}</strong>{member.deactivatedAt && <span className='pill'>Deactivated</span>}</span></td>
                  <td>{member.email}</td>
                  <td>{openCount(member)}</td>
                  <td>{doneCount(member)}</td>
                  <td className='nowrap'>{member.createdAt ? formatDateTime(member.createdAt) : '—'}</td>
                  <td className='row-actions'>
                    <button type='button' className='icon-button' onClick={() => setModal({ member })} aria-label={`Edit ${member.name}`}><Icon name='edit' size={16} /></button>
                    {member.deactivatedAt
                      ? <button type='button' className='btn btn-sm btn-ghost' onClick={() => reactivate(member)} aria-label={`Reactivate ${member.name}`}><Icon name='restore' size={14} /> Reactivate</button>
                      : <button type='button' className='icon-button danger' onClick={() => deactivate(member)} aria-label={`Deactivate ${member.name}`} title='Deactivate'><Icon name='userOff' size={16} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modalTitle} onClose={close}>
          {modal.created
            ? <CreatedCredentials result={modal.created} onDone={close} />
            : <MemberForm member={modal.member} onSubmit={save} onCancel={close} />}
        </Modal>
      )}
    </>
  )
}

export default TeamMembers
