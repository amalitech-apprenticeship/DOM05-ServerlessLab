import React from 'react'
import { Brand } from '../Layout/Logo'
import Icon from '../Layout/Icon'

const ConfigError = ({ message }) => (
  <div className='config-error'>
    <div className='card config-error-card' role='alert'>
      <Brand />
      <h1><Icon name='alert' /> App not configured</h1>
      <p>{message}</p>
    </div>
  </div>
)

export default ConfigError
