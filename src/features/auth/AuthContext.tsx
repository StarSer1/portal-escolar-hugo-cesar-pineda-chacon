import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { auth, db } from '@/config/firebase'
import { SchoolEmblem } from '@/shared/components/SchoolEmblem'
import { Button } from '@/shared/ui/Button'

function CheckingAccess() {
  return <main className="session-screen" role="status"><div className="session-card"><span className="spinner" aria-hidden="true" />Verificando acceso…</div></main>
}

/** Shown when the account exists but lacks the permission for this area. */
function AccessDenied({ title, message }: { title: string; message: string }) {
  return <main className="session-screen">
    <div className="session-card">
      <SchoolEmblem size={48} />
      <h1>{title}</h1>
      <p>{message}</p>
      <Button variant="primary" icon="logout" onClick={() => void signOut(auth)}>Volver a iniciar sesión</Button>
    </div>
  </main>
}

interface Session {
  user: User | null
  profile: { displayName: string; role: string; active: boolean; teacherId?: string; email?: string } | null
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
          teacherId: typeof value.teacherId === 'string' ? value.teacherId : undefined,
          email: typeof value.email === 'string' ? value.email : undefined,
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
  if (loading) return <CheckingAccess />
  if (!user) return <Navigate to="/iniciar-sesion" state={{ from: location.pathname }} replace />
  if (profile?.role === 'teacher') return <Navigate to="/docente" replace />
  if (error || !profile?.active || profile.role !== 'admin') return <AccessDenied title="Acceso al panel administrativo" message={error || 'Tu cuenta no tiene acceso administrativo activo. Solicita al director que revise tu perfil.'} />
  return <Outlet />
}

export function RequireTeacher() {
  const { user, profile, loading, error } = useAuth()
  if (loading) return <CheckingAccess />
  if (!user) return <Navigate to="/iniciar-sesion" replace />
  if (profile?.active && profile.role === 'admin') return <Navigate to="/panel" replace />
  if (error || !profile?.active || profile.role !== 'teacher' || !profile.teacherId) return <AccessDenied title="Acceso docente no disponible" message={error || 'Tu cuenta no tiene acceso docente activo. Solicita al director que revise tu perfil y las asignaciones.'} />
  return <Outlet />
}
