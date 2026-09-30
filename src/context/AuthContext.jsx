import { createContext, useContext } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ user, onLogout, children }) {
  return (
    <AuthContext.Provider value={{ user, logout: onLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
