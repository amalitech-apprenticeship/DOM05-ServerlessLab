import React from 'react'
import Icon from './Icon'
import Avatar from './Avatar'
import { Brand } from './Logo'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../api/contract'

const AppShell = ({ nav, active, onNavigate, search, onSearch, actions, notifications, children }) => {
  const { user, logout } = useAuth()
  const isAdmin = user.role === ROLES.ADMIN

  return (
    <div className='app-shell'>
      <aside className='sidebar'>
        <Brand tagline='Task workspace' />
        <div className='workspace-pill'><Icon name='building' size={16} /> {isAdmin ? 'Admin workspace' : 'Team workspace'}</div>

        <nav className='side-nav' aria-label='Main'>
          {nav.map((item) => (
            <button
              key={item.id}
              type='button'
              className='nav-item'
              aria-current={active === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className='nav-badge'>{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className='sidebar-footer'>
          <button type='button' className='nav-item' onClick={logout} aria-label='Log out'><Icon name='logout' /><span>Log out</span></button>
        </div>
      </aside>

      <div className='main-column'>
        <header className='topbar'>
          <label className='search'>
            <Icon name='search' />
            <span className='sr-only'>Search tasks</span>
            <input type='search' value={search} onChange={(e) => onSearch(e.target.value)} placeholder='Search tasks, categories, or team members…' />
          </label>
          <div className='topbar-actions'>
            {actions}
            {notifications}
            <div className='user-chip'>
              <Avatar name={user.name} />
              <div><strong>{user.name}</strong><span>{isAdmin ? 'Admin' : 'Team member'}</span></div>
            </div>
          </div>
        </header>
        <main className='content'>{children}</main>
      </div>
    </div>
  )
}

export default AppShell
