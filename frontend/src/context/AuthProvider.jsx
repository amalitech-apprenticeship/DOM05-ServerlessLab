import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useApi } from '../api/ApiContext'
import { AuthContext } from './AuthContext'

const AuthProvider = ({ children }) => {
  const api = useApi()
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.auth
      .getSession()
      .then((session) => !cancelled && setUser(session?.user || null))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setReady(true))
    return () => {
      cancelled = true
    }
  }, [api])

  const login = useCallback(async (email, password) => {
    const session = await api.auth.login(email, password)
    setUser(session.user)
    return session.user
  }, [api])

  const logout = useCallback(async () => {
    try {
      await api.auth.logout()
    } finally {
      setUser(null)
    }
  }, [api])

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
