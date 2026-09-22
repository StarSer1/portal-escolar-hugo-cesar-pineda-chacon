import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { auth } from '@/config/firebase'
import { errorMessage } from '@/shared/errors'
import { useAuth } from '@/features/auth/AuthContext'
import { Icon } from '@/shared/components/Icon'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      const from = location.state?.from
      navigate(typeof from === 'string' && /^\/panel(?:\/|$)/.test(from) ? from : '/panel', { replace: true })
    } catch (caught) { setError(errorMessage(caught)) }
    finally { setBusy(false) }
  }
  if (!loading && user && profile?.active && profile.role === 'admin') return <Navigate to="/panel" replace />
  return <main className="login-page"><section className="login-intro"><Link to="/" className="login-back">← Sitio institucional</Link><div className="school-emblem"><Icon name="book" size={30} /></div><p className="eyebrow">ESCUELA PRIMARIA</p><h1>Un espacio para<br />seguir creciendo.</h1><p>Hugo César Piñeda Chacón</p><span>Gestión académica · Comunidad escolar</span></section><section className="login-card"><p className="eyebrow">BIENVENIDO</p><h2>Iniciar sesión</h2><p>Accede a la administración de tu escuela.</p><form onSubmit={handleSubmit} className="form"><label>Correo electrónico<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Contraseña<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div></label>{error && <p className="error-banner" role="alert">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy ? 'Ingresando…' : 'Entrar al panel'} <Icon name="arrow" size={18} /></button></form><p className="muted small">Acceso exclusivo para personal autorizado.</p></section></main>
}
