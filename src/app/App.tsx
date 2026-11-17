import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { HomePage } from '@/features/public/pages/HomePage'
import { AboutPage, CalendarPage, ContactPage, DocumentsPage, StudentsInfoPage } from '@/features/public/pages/SitePages'
import { PublicLayout } from '@/features/public/PublicLayout'
import { SiteContentProvider } from '@/features/public/SiteContent'
import { NotFoundPage } from '@/shared/pages/NotFoundPage'
import { ErrorBoundary } from './ErrorBoundary'

// Solo se descargan al entrar al login, al panel o al área docente.
const PrivateShell = lazy(() => import('./PrivateShell'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const AdminArea = lazy(() => import('./AdminArea'))
const TeacherArea = lazy(() => import('./TeacherArea'))

export function App() {
  return <ErrorBoundary><Routes>
    <Route element={<SiteContentProvider><PublicLayout /></SiteContentProvider>}>
      <Route path="/" element={<HomePage />} />
      <Route path="/conocenos" element={<AboutPage />} />
      <Route path="/estudiantes" element={<StudentsInfoPage />} />
      <Route path="/calendario" element={<CalendarPage />} />
      <Route path="/documentos" element={<DocumentsPage />} />
      <Route path="/contactanos" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
    <Route element={<PrivateShell />}>
      <Route path="/iniciar-sesion" element={<LoginPage />} />
      <Route path="/docente/*" element={<TeacherArea />} />
      <Route path="/panel/*" element={<AdminArea />} />
    </Route>
  </Routes></ErrorBoundary>
}
