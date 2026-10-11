import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService.js'
import { isNetworkError, TOKEN_KEY, USER_KEY } from '../services/api.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (authService.getStoredToken() ? authService.getStoredUser() : null))
  const [loading, setLoading] = useState(Boolean(authService.getStoredToken()))

  useEffect(() => {
    let active = true
    if (!authService.getStoredToken()) {
      setLoading(false)
      return undefined
    }
    authService
      .fetchMe()
      .then((me) => active && setUser(me))
      .catch((error) => {
        // Offline: keep the cached session so queued reports still work.
        if (!isNetworkError(error) && active) {
          authService.clearSession()
          setUser(null)
        }
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleLogout = () => setUser(null)
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  useEffect(() => {
    let active = true
    const handleStorage = (event) => {
      if (event.key && event.key !== TOKEN_KEY && event.key !== USER_KEY) return
      if (!authService.getStoredToken()) {
        setUser(null)
        setLoading(false)
        return
      }
      setUser(authService.getStoredUser())
      authService.fetchMe().then((me) => {
        if (active) setUser(me)
      }).catch((error) => {
        if (!active || isNetworkError(error)) return
        authService.clearSession()
        setUser(null)
      })
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      active = false
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const loggedIn = await authService.login(email, password)
    setUser(loggedIn)
    return loggedIn
  }, [])

  const municipalLogin = useCallback(async (email, password, officeId) => {
    const loggedIn = await authService.municipalLogin(email, password, officeId)
    setUser(loggedIn)
    return loggedIn
  }, [])

  const register = useCallback(async (payload) => {
    const created = await authService.register(payload)
    setUser(created)
    return created
  }, [])

  const logout = useCallback(() => {
    authService.clearSession()
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    const me = await authService.fetchMe()
    setUser(me)
    return me
  }, [])

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: Boolean(user), login, municipalLogin, register, logout, refresh }),
    [user, loading, login, municipalLogin, register, logout, refresh],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
