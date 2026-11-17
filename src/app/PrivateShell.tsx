import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'
import { IdleGuard } from '@/features/auth/IdleGuard'
import { useNoIndex } from '@/shared/hooks/usePageTitle'
import { PageLoading } from './ErrorBoundary'

/**
 * Todo lo que requiere sesión (login, panel y área docente) vive en este
 * fragmento, que se descarga solo al entrar ahí: el sitio público no carga
 * Firebase Auth ni el código del panel.
 */
export default function PrivateShell() {
  useNoIndex()
  return <AuthProvider>
    <IdleGuard />
    <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
  </AuthProvider>
}
