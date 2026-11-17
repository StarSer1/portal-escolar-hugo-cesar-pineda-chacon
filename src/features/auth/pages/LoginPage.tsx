import { useId, useState, type FormEvent } from 'react'
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { auth } from '@/config/firebase'
import { errorMessage } from '@/shared/errors'
import { useAuth } from '@/features/auth/AuthContext'
import { Icon } from '@/shared/components/Icon'
import { SchoolEmblem } from '@/shared/components/SchoolEmblem'
import { usePageTitle } from '@/shared/hooks/usePageTitle'
import { Button } from '@/shared/ui/Button'
import { Alert } from '@/shared/ui/Feedback'
import { Field } from '@/shared/ui/Field'

/** Solo se vuelve a páginas internas del área correspondiente (nunca a otro sitio). */
function returnPath(from: unknown, area: '/panel' | '/docente') {
  return typeof from === 'string' && new RegExp(`^${area}(?:/|$)`).test(from) && !from.startsWith('//') ? from : area
}

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const passwordId = useId()
  const { user, profile, loading, error: sessionError } = useAuth()
  const location = useLocation()
  usePageTitle(mode === 'reset' ? 'Recuperar contraseña' : 'Iniciar sesión')

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    // Al iniciar sesión, el perfil se carga y la redirección según el rol ocurre abajo.
    try { await signInWithEmailAndPassword(auth, email.trim(), password) } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false) }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch (caught) {
      // El mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
      const code = typeof caught === 'object' && caught && 'code' in caught ? String(caught.code) : ''
      if (code.includes('network') || code.includes('too-many-requests') || code.includes('invalid-email')) { setError(errorMessage(caught)); setBusy(false); return }
    }
    setNotice('Si el correo pertenece a una cuenta del portal, en unos minutos recibirás un enlace para crear una nueva contraseña. Revisa también la carpeta de correo no deseado.')
    setBusy(false)
  }

  if (!loading && user && profile?.active && profile.role === 'teacher') return <Navigate to={returnPath(location.state?.from, '/docente')} replace />
  if (!loading && user && profile?.active && profile.role === 'admin') return <Navigate to={returnPath(location.state?.from, '/panel')} replace />
  const noAccess = !loading && user && (!profile?.active || !['admin', 'teacher'].includes(profile.role))

  return <main className="login-page">
    <section className="login-intro">
      <Link to="/" className="login-back"><Icon name="arrowLeft" size={18} /> Sitio institucional</Link>
      <SchoolEmblem size={64} />
      <h1>Un espacio para<br />seguir creciendo.</h1>
      <p>Escuela Primaria Hugo César Piñeda Chacón</p>
      <span>Gestión académica · Comunidad escolar</span>
    </section>
    <section className="login-card">
      {noAccess ? <>
        <h2>Cuenta sin acceso activo</h2>
        <Alert tone="warning" role="alert">{sessionError || 'Tu cuenta existe, pero no tiene acceso activo al portal. Solicita a la dirección que revise tu perfil.'}</Alert>
        <Button variant="primary" icon="logout" onClick={() => void signOut(auth)}>Usar otra cuenta</Button>
      </> : mode === 'login' ? <>
        <h2>Iniciar sesión</h2>
        <p>Acceso para dirección y docentes de la escuela.</p>
        <form onSubmit={handleLogin} className="form">
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
          <Button type="submit" variant="primary" className="login-submit" loading={busy || (!!user && loading)}>{busy ? 'Ingresando…' : 'Entrar'}{!busy && <Icon name="arrow" size={18} />}</Button>
        </form>
        <button type="button" className="link-button login-forgot" onClick={() => { setMode('reset'); setError(''); setNotice('') }}>¿Olvidaste tu contraseña?</button>
      </> : <>
        <h2>Recuperar contraseña</h2>
        <p>Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>
        <form onSubmit={handleReset} className="form">
          <Field label="Correo electrónico">
            <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          {error && <Alert tone="error" role="alert">{error}</Alert>}
          {notice && <Alert tone="success" role="status">{notice}</Alert>}
          <Button type="submit" variant="primary" className="login-submit" loading={busy}>Enviar enlace</Button>
        </form>
        <button type="button" className="link-button login-forgot" onClick={() => { setMode('login'); setError(''); setNotice('') }}>Volver a iniciar sesión</button>
      </>}
      <p className="login-note">Acceso exclusivo para personal autorizado.</p>
    </section>
  </main>
}
