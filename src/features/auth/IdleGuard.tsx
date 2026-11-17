import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { Button } from '@/shared/ui/Button'
import { useAuth } from './AuthContext'

/*
 * Cierre de sesión por inactividad, pensado para las computadoras compartidas
 * de la escuela. La actividad en cualquier pestaña del portal cuenta (se
 * comparte por localStorage).
 */
const WARN_AFTER = 25 * 60_000
const LOGOUT_AFTER = 30 * 60_000
const activityKey = 'portal-ultima-actividad'
const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

function storedActivity() {
  try { return Number(localStorage.getItem(activityKey)) || 0 } catch { return 0 }
}
function storeActivity(time: number) {
  try { localStorage.setItem(activityKey, String(time)) } catch { /* sin almacenamiento */ }
}

export function IdleGuard() {
  const { user } = useAuth()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const local = useRef(0)

  useEffect(() => {
    if (!user) return
    const mark = () => {
      const now = Date.now()
      if (now - local.current < 5_000) return
      local.current = now
      storeActivity(now)
    }
    local.current = 0
    mark()
    events.forEach((name) => window.addEventListener(name, mark, { passive: true }))
    const timer = window.setInterval(() => {
      const idle = Date.now() - Math.max(storedActivity(), local.current)
      if (idle >= LOGOUT_AFTER) { void signOut(auth); setSecondsLeft(null) }
      else if (idle >= WARN_AFTER) setSecondsLeft(Math.ceil((LOGOUT_AFTER - idle) / 1000))
      else setSecondsLeft(null)
    }, 1_000)
    return () => { events.forEach((name) => window.removeEventListener(name, mark)); window.clearInterval(timer) }
  }, [user])

  if (!user || secondsLeft === null) return null
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')
  function keepWorking() {
    local.current = Date.now()
    storeActivity(local.current)
    setSecondsLeft(null)
  }
  return <div className="idle-warning" role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-text">
    <div className="idle-card">
      <h2 id="idle-title">¿Sigues ahí?</h2>
      <p id="idle-text">Por seguridad, tu sesión se cerrará en <strong>{minutes}:{seconds}</strong> por inactividad. Los cambios que no hayas guardado se perderán.</p>
      <div className="row-actions">
        <Button onClick={() => void signOut(auth)}>Cerrar sesión</Button>
        <Button variant="primary" autoFocus onClick={keepWorking}>Seguir trabajando</Button>
      </div>
    </div>
  </div>
}
