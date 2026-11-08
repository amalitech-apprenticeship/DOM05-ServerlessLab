import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Icon from '../Layout/Icon'
import { APP_NAME, Brand } from '../Layout/Logo'
import { userMessage } from '../../utils/errors'

const FEATURES = [
  { icon: 'board', text: 'Assign work and track every status live' },
  { icon: 'clock', text: 'Deadline reminders before anything slips' },
  { icon: 'bell', text: 'Instant updates for admins and teams' },
]

const Preview = () => (
  <div className='login-preview' aria-hidden='true'>
    <div className='preview-card preview-card-main'>
      <div className='preview-row'><span className='preview-tag'>Design</span><span className='preview-pill'>In progress</span></div>
      <strong>Launch checklist review</strong>
      <div className='preview-progress'><span style={{ width: '68%' }} /></div>
      <div className='preview-row preview-foot'><span>Due in 2 days</span><span className='preview-avatars'><i>M</i><i>P</i><i>A</i></span></div>
    </div>
    <div className='preview-card preview-card-float'>
      <span className='preview-check'><Icon name='check' size={16} /></span>
      <div><strong>Task completed</strong><span>Priya closed “API rate limits”</span></div>
    </div>
    <div className='preview-card preview-card-stat'>
      <span>Completion</span><strong>87%</strong>
    </div>
  </div>
)

export const Login = () => {
    const { login, completeNewPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    // First sign-in with a temporary password: Cognito requires choosing a new one.
    const [needsNewPassword, setNeedsNewPassword] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const submitHandler = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        setError('')
        try {
          await login(email, password)
        } catch (err) {
          if (err.code === 'NEW_PASSWORD_REQUIRED') {
            setNeedsNewPassword(true)
            setPassword('')
            setShowPassword(false)
          } else {
            setError(userMessage(err, 'Sign in failed.'))
          }
          setSubmitting(false)
        }
    }

    const newPasswordHandler = async (e) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
          setError('The passwords don’t match.')
          return
        }
        setSubmitting(true)
        setError('')
        try {
          await completeNewPassword(newPassword)
        } catch (err) {
          setError(userMessage(err, 'Could not set your new password.'))
          setSubmitting(false)
        }
    }

    const backToSignIn = () => {
        setNeedsNewPassword(false)
        setNewPassword('')
        setConfirmPassword('')
        setError('')
    }

    const passwordToggle = (
        <button type='button' className='input-toggle' onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword} title={showPassword ? 'Hide' : 'Show'}>
            <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
            <span className='sr-only'>{showPassword ? 'Hide' : 'Show'} characters</span>
        </button>
    )
    const errorMessage = error && <p className='form-error login-error' role='alert'><Icon name='alert' size={16} /> {error}</p>

  return (
    <div className='login-shell'>
        <section className='login-hero'>
            <Brand inverse size={40} />
            <div className='login-hero-copy'>
                <h2>Plan the work. Assign it. Watch it ship.</h2>
                <p>{APP_NAME} keeps admins and teams in sync, from the first assignment to the final check-off.</p>
                <ul className='login-features'>
                    {FEATURES.map((feature) => <li key={feature.text}><span><Icon name={feature.icon} size={16} /></span>{feature.text}</li>)}
                </ul>
            </div>
            <Preview />
        </section>

        <main className='login-panel'>
            <div className='login-card'>
                <div className='login-card-brand'><Brand size={36} /></div>
                {needsNewPassword ? (
                <>
                <div className='login-intro'>
                    <h1 className='login-title'>Choose a new password</h1>
                    <p className='muted'>You signed in with a temporary password. Choose your own to finish signing in as {email}.</p>
                </div>
                <form onSubmit={newPasswordHandler} className='login-form'>
                    <label className='field-label'>New password
                        <span className='input-icon'>
                            <Icon name='lock' size={18} />
                            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className='field' type={showPassword ? 'text' : 'password'} autoComplete='new-password' placeholder='Enter a new password' aria-describedby='password-rules' />
                            {passwordToggle}
                        </span>
                        <span id='password-rules' className='field-hint'>At least 8 characters, with uppercase, lowercase, a number and a symbol.</span>
                    </label>
                    <label className='field-label'>Confirm new password
                        <span className='input-icon'>
                            <Icon name='lock' size={18} />
                            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className='field' type={showPassword ? 'text' : 'password'} autoComplete='new-password' placeholder='Enter it again' />
                        </span>
                    </label>
                    {errorMessage}
                    <button className='btn btn-primary btn-block btn-lg' type='submit' disabled={submitting}>{submitting ? 'Saving…' : 'Set password and sign in'}{!submitting && <Icon name='arrowRight' size={18} />}</button>
                    <button className='btn btn-ghost btn-block' type='button' onClick={backToSignIn} disabled={submitting}>Back to sign in</button>
                </form>
                </>
                ) : (
                <>
                <div className='login-intro'>
                    <h1 className='login-title'>Welcome back</h1>
                    <p className='muted'>Sign in to your {APP_NAME} workspace.</p>
                </div>
                <form onSubmit={submitHandler} className='login-form'>
                    <label className='field-label'>Email address
                        <span className='input-icon'>
                            <Icon name='mail' size={18} />
                            <input value={email} onChange={(e) => setEmail(e.target.value)} required className='field' type='email' autoComplete='email' placeholder='you@company.com' />
                        </span>
                    </label>
                    <label className='field-label'>Password
                        <span className='input-icon'>
                            <Icon name='lock' size={18} />
                            <input value={password} onChange={(e) => setPassword(e.target.value)} required className='field' type={showPassword ? 'text' : 'password'} autoComplete='current-password' placeholder='Enter your password' />
                            {passwordToggle}
                        </span>
                    </label>
                    {errorMessage}
                    <button className='btn btn-primary btn-block btn-lg' type='submit' disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}{!submitting && <Icon name='arrowRight' size={18} />}</button>
                </form>
                </>
                )}
                <p className='login-help'><Icon name='users' size={16} /> Need an account? Ask your workspace admin to add you.</p>
            </div>
            <p className='login-legal'>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        </main>
    </div>
  )
}
export default Login
