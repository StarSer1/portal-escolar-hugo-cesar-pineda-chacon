import { useId, useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { auth } from '@/config/firebase'
import { errorMessage } from '@/shared/errors'
import { useAuth } from '@/features/auth/AuthContext'
import { Icon } from '@/shared/components/Icon'
import { SchoolEmblem } from '@/shared/components/SchoolEmblem'
import { Button } from '@/shared/ui/Button'
import { Alert } from '@/shared/ui/Feedback'
import { Field } from '@/shared/ui/Field'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const passwordId = useId()
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
  if (!loading && user && profile?.role === 'teacher') return <Navigate to="/docente" replace />
  if (!loading && user && profile?.active && profile.role === 'admin') return <Navigate to="/panel" replace />
  return <main className="login-page">
    <section className="login-intro">
      <Link to="/" className="login-back"><Icon name="arrowLeft" size={18} /> Sitio institucional</Link>
      <SchoolEmblem size={64} />
      <h1>Un espacio para<br />seguir creciendo.</h1>
      <p>Escuela Primaria Hugo César Piñeda Chacón</p>
      <span>Gestión académica · Comunidad escolar</span>
    </section>
    <section className="login-card">
      <h2>Iniciar sesión</h2>
      <p>Accede a la administración de tu escuela.</p>
      <form onSubmit={handleSubmit} className="form">
        <Field label="Correo electrónico">
          <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <div className="field">
          <label htmlFor={passwordId}>Contraseña</label>
          <div className="password-field">
            <input id={passwordId} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
          </div>
        </div>
        {error && <Alert tone="error" role="alert">{error}</Alert>}
        <Button type="submit" variant="primary" className="login-submit" loading={busy}>{busy ? 'Ingresando…' : 'Entrar al panel'}{!busy && <Icon name="arrow" size={18} />}</Button>
      </form>
      <p className="login-note">Acceso exclusivo para personal autorizado.</p>
    </section>
  </main>
}
