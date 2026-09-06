import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '@/config/firebase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    try { await signInWithEmailAndPassword(auth, email, password); navigate('/panel') }
    catch (caught) {
      const code = typeof caught === 'object' && caught !== null && 'code' in caught ? String(caught.code) : 'error-desconocido'
      setError(`No fue posible iniciar sesión: ${code}`)
    }
  }
  return <main><h1>Iniciar sesión</h1><form onSubmit={handleSubmit} className="form"><label>Correo<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{error && <p role="alert">{error}</p>}<button>Entrar</button></form></main>
}
