import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setAuthHooks } from '../services/api'

// Token lives in sessionStorage: cleared when the tab closes, never in the bundle.
// Trade-off (see README): readable by JS, so XSS would expose it. We mitigate by
// rendering all user text escaped, short token expiry, and no third-party scripts.
const KEY = 'archintx_token'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(KEY))
  const [notice, setNotice] = useState('')

  const logout = useCallback((message = '') => {
    sessionStorage.removeItem(KEY)
    setToken(null)
    setNotice(typeof message === 'string' ? message : '')
  }, [])

  useEffect(() => {
    setAuthHooks({
      getToken: () => sessionStorage.getItem(KEY),
      onExpire: () => logout('Your session expired. Please sign in again.'),
    })
  }, [logout])

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password)
    sessionStorage.setItem(KEY, data.access_token)
    setToken(data.access_token)
    setNotice('')
  }, [])

  const value = useMemo(() => ({ token, isAuthenticated: !!token, login, logout, notice }), [token, login, logout, notice])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
