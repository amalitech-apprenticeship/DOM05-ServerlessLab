import React, { useState } from 'react'

const MemberForm = ({ member, onSubmit, onCancel }) => {
  const [form, setForm] = useState({ name: member?.name || '', email: member?.email || '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isEditing = Boolean(member)

  const setField = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }))

  const submitHandler = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submitHandler} className='task-form' aria-label={isEditing ? 'Edit team member' : 'Add team member'}>
      <label className='field-label span-2'>Full name
        <input value={form.name} onChange={setField('name')} className='field' type='text' placeholder='e.g. Marcus Vance' maxLength={80} required autoFocus />
      </label>
      <label className='field-label span-2'>Email address
        <input value={form.email} onChange={setField('email')} className='field' type='email' placeholder='name@company.com' required />
      </label>
      {!isEditing && <p className='muted span-2 form-hint'>They’ll be able to sign in, see the tasks assigned to them and update their status.</p>}
      {error && <p className='form-error span-2' role='alert'>{error}</p>}
      <div className='form-buttons span-2'>
        <button type='button' onClick={onCancel} className='btn btn-ghost'>Cancel</button>
        <button type='submit' className='btn btn-primary' disabled={submitting}>{isEditing ? 'Save changes' : 'Add member'}</button>
      </div>
    </form>
  )
}

export default MemberForm
