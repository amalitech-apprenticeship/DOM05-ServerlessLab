import React, { useState } from 'react'
import { TASK_PRIORITY, TASK_PRIORITY_LABELS } from '../../api/contract'
import Icon from '../Layout/Icon'
import { MAX_ATTACHMENT_BYTES, formatBytes } from '../../utils/files'

const emptyForm = { title: '', description: '', category: '', dueDate: '', priority: TASK_PRIORITY.MEDIUM, assigneeId: '' }

const toForm = (task) =>
  task ? { title: task.title, description: task.description, category: task.category, dueDate: task.dueDate, priority: task.priority || TASK_PRIORITY.MEDIUM } : emptyForm

// attachment: undefined = unchanged, File = add/replace, null = remove.
const toPayload = ({ assigneeId, dueDate, priority, ...fields }, attachment, isEditing, canEditAdminFields) => {
  const payload = canEditAdminFields ? { ...fields, dueDate, priority, ...(attachment !== undefined && { attachment }) } : fields
  return isEditing ? payload : { ...payload, assigneeId: assigneeId || null }
}

// Edits `task` when given, otherwise creates. Assignee is only chosen on create.
// With canEditAdminFields={false} due date and priority are read-only and left out of the payload.
const CreateTask = ({ task, members = [], categories = [], canEditAdminFields = true, onSubmit, onCancel }) => {
  const [form, setForm] = useState(() => toForm(task))
  const [attachment, setAttachment] = useState(undefined)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isEditing = Boolean(task)

  const setField = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }))
  const currentAttachment = attachment === undefined ? task?.attachment || null : attachment

  const pickFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`Attachments must be ${formatBytes(MAX_ATTACHMENT_BYTES)} or smaller.`)
      return
    }
    setError('')
    setAttachment(file)
  }

  const submitHandler = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(toPayload(form, attachment, isEditing, canEditAdminFields))
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submitHandler} className='task-form' aria-label={isEditing ? 'Edit task' : 'Create task'}>
      <label className='field-label span-2'>Task title
        <input value={form.title} onChange={setField('title')} className='field' type='text' placeholder='e.g. Make a UI design' maxLength={120} required autoFocus />
      </label>
      <label className='field-label'>Due date
        <input value={form.dueDate} onChange={setField('dueDate')} className='field' type='date' required={canEditAdminFields} disabled={!canEditAdminFields} />
      </label>
      <label className='field-label'>Priority
        <select value={form.priority} onChange={setField('priority')} className='field' disabled={!canEditAdminFields}>
          {Object.values(TASK_PRIORITY).map((priority) => <option key={priority} value={priority}>{TASK_PRIORITY_LABELS[priority]}</option>)}
        </select>
      </label>
      {!canEditAdminFields && <p className='field-hint span-2'>Only admins can change the due date and priority.</p>}
      <label className='field-label span-2'>Category
        <input value={form.category} onChange={setField('category')} className='field' type='text' placeholder='Design, Dev, Research' list='task-categories' />
        <datalist id='task-categories'>{categories.map((name) => <option key={name} value={name} />)}</datalist>
      </label>
      {!isEditing && (
        <label className='field-label span-2'>Assign to
          <select value={form.assigneeId} onChange={setField('assigneeId')} className='field'>
            <option value=''>Unassigned</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </label>
      )}
      <label className='field-label span-2'>Description
        <textarea value={form.description} onChange={setField('description')} className='field' rows={4} placeholder='What needs to be done?' />
      </label>
      {canEditAdminFields && (
        <div className='field-label span-2'>
          <span>Attachment <span className='field-hint'>(optional, up to {formatBytes(MAX_ATTACHMENT_BYTES)})</span></span>
          {currentAttachment ? (
            <div className='attachment-row'>
              <Icon name='paperclip' size={16} />
              <span className='attachment-name'>{currentAttachment.name}</span>
              <span className='muted'>{formatBytes(currentAttachment.size)}</span>
              <button type='button' className='link-button danger' onClick={() => setAttachment(null)}>Remove</button>
            </div>
          ) : (
            <label className='file-drop'>
              <Icon name='paperclip' size={16} /> Choose a file
              <input type='file' className='sr-only' aria-label='Attachment' onChange={pickFile} />
            </label>
          )}
        </div>
      )}
      {error && <p className='form-error span-2' role='alert'>{error}</p>}
      <div className='form-buttons span-2'>
        <button type='button' onClick={onCancel} className='btn btn-ghost'>Cancel</button>
        <button type='submit' className='btn btn-primary' disabled={submitting}>{isEditing ? 'Save changes' : 'Create task'}</button>
      </div>
    </form>
  )
}

export default CreateTask
