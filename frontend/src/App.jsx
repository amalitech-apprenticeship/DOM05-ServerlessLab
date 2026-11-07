import React from 'react'
import Login from './components/Auth/Login'
import EmployeeDashboard from './components/Dashboard/EmployeeDashboard'
import AdminDashboard from './components/Dashboard/AdminDashboard'
import { SessionSkeleton } from './components/others/LoadingSkeletons'
import { useAuth } from './context/AuthContext'
import { ROLES } from './api/contract'

const App = () => {
  const { user, ready } = useAuth()

  if (!ready) return <SessionSkeleton />
  if (!user) return <Login />
  return user.role === ROLES.ADMIN ? <AdminDashboard /> : <EmployeeDashboard />
}

export default App
