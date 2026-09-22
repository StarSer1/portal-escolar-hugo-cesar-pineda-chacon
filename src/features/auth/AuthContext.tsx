import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { auth, db } from '@/config/firebase'

interface Session {
  user: User | null
  profile: { displayName: string; role: string; active: boolean } | null
  loading: boolean
  error: string
}
const AuthContext = createContext<Session>({ user: null, profile: null, loading: true, error: '' })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, profile: null, loading: true, error: '' })
  useEffect(() => {
    let unsubscribeProfile = () => {}
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile()
      setSession({ user, profile: null, loading: !!user, error: '' })
      if (user) unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        const value = snapshot.data()
        setSession({ user, loading: false, error: '', profile: value ? {
          displayName: String(value.displayName || user.email || 'Administrador'),
          role: String(value.role || ''), active: value.active === true,
        } : null })
      }, () => setSession({ user, profile: null, loading: false, error: 'No pudimos verificar tu acceso. Revisa la conexión y vuelve a iniciar sesión.' }))
    })
    return () => { unsubscribe(); unsubscribeProfile() }
  }, [])
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export function RequireAdmin() {
  const { user, profile, loading, error } = useAuth()
  const location = useLocation()
  if (loading) return <main className="session-screen" role="status"><div className="loading-dot" />Verificando acceso…</main>
  if (!user) return <Navigate to="/iniciar-sesion" state={{ from: location.pathname }} replace />
  if (error || !profile?.active || profile.role !== 'admin') return <main className="session-screen">
    <h1>Acceso al panel administrativo</h1><p>{error || 'Tu cuenta no tiene acceso administrativo activo. Solicita al director que revise tu perfil.'}</p>
    <button className="btn btn-primary" onClick={() => void signOut(auth)}>Volver a iniciar sesión</button>
  </main>
  return <Outlet />
}
