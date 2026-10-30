import React, { useState } from 'react'
import Avatar from '../Layout/Avatar'
import Icon from '../Layout/Icon'
import { formatDateTime } from '../../utils/dates'
import { MAX_ATTACHMENT_BYTES, formatBytes } from '../../utils/files'
import { useAuth } from '../../context/AuthContext'

const AttachmentLink = ({ attachment }) => (
  <a className='attachment-card attachment-compact' href={attachment.url} download={attachment.name} aria-label={`Download ${attachment.name}`}>
    <span className='attachment-icon'><Icon name='paperclip' size={16} /></span>
    <span className='attachment-meta'><strong>{attachment.name}</strong><span>{formatBytes(attachment.size)}</span></span>
    <Icon name='download' size={16} />
  </a>
)

// onAdd({ body, attachment }) and onDelete(commentId) return promises; errors are shown inline.
const Comments = ({ task, nameOf, isAdmin, readOnly, onAdd, onDelete }) => {
  const { user: currentUser } = useAuth()
  const [body, setBody] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [posting, setPosting] = useState(false)
  const comments = task.comments || []

  const pickFile = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (picked.size > MAX_ATTACHMENT_BYTES) {
      setError(`Attachments must be ${formatBytes(MAX_ATTACHMENT_BYTES)} or smaller.`)
      return
    }
    setError('')
    setFile(picked)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim() && !file) return
    setPosting(true)
    setError('')
    try {
      await onAdd({ body, attachment: file })
      setBody('')
      setFile(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setPosting(false)
    }
  }

  const remove = async (comment) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await onDelete(comment.id)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section aria-label='Comments'>
      <h2 className='details-section'>Comments <span className='count'>{comments.length}</span></h2>

      {comments.length === 0 && <p className='muted'>No comments yet.</p>}
      <ol className='comments'>
        {comments.map((comment) => (
          <li key={comment.id} className='comment' aria-label={`Comment by ${nameOf(comment.authorId)}`}>
            <Avatar name={nameOf(comment.authorId)} size='sm' />
            <div className='comment-body'>
              <div className='comment-head'>
                <strong>{nameOf(comment.authorId)}</strong>
                <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
                {(isAdmin || comment.authorId === currentUser.id) && (
                  <button type='button' className='icon-button comment-delete' onClick={() => remove(comment)} aria-label='Delete comment'><Icon name='trash' size={14} /></button>
                )}
              </div>
              {comment.body && <p>{comment.body}</p>}
              {comment.attachment && <AttachmentLink attachment={comment.attachment} />}
            </div>
          </li>
        ))}
      </ol>

      {readOnly ? <p className='muted'>Restore the task to add comments.</p> : (
        <form className='comment-form' onSubmit={submit} aria-label='Add a comment'>
          <label className='sr-only' htmlFor={`comment-${task.id}`}>Comment</label>
          <textarea id={`comment-${task.id}`} className='field' rows={3} maxLength={2000} placeholder='Write a comment…' value={body} onChange={(e) => setBody(e.target.value)} />
          {error && <p className='form-error' role='alert'>{error}</p>}
          <div className='comment-actions'>
            {file ? (
              <span className='attachment-row'>
                <Icon name='paperclip' size={16} />
                <span className='attachment-name'>{file.name}</span>
                <span className='muted'>{formatBytes(file.size)}</span>
                <button type='button' className='link-button danger' onClick={() => setFile(null)}>Remove</button>
              </span>
            ) : (
              <label className='btn btn-ghost btn-sm'>
                <Icon name='paperclip' size={14} /> Attach file
                <input type='file' className='sr-only' aria-label='Attach a file to the comment' onChange={pickFile} />
              </label>
            )}
            <button type='submit' className='btn btn-primary btn-sm' disabled={posting || (!body.trim() && !file)}>{posting ? 'Posting…' : 'Post comment'}</button>
          </div>
        </form>
      )}
    </section>
  )
}

export default Comments
