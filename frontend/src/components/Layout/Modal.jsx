import React, { useEffect } from 'react'
import Icon from './Icon'

const Modal = ({ title, onClose, children }) => {
  useEffect(() => {
    const closeOnEscape = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className='modal-backdrop' onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className='modal' role='dialog' aria-modal='true' aria-label={title}>
        <div className='modal-header'>
          <h2>{title}</h2>
          <button type='button' className='icon-button' aria-label='Close' onClick={onClose}><Icon name='close' /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal
