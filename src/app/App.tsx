import { Route, Routes } from 'react-router-dom'
import { HomePage } from '@/features/public/pages/HomePage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { GradesPage } from '@/features/grades/pages/GradesPage'
import { NotFoundPage } from '@/shared/pages/NotFoundPage'
import { AuthProvider, RequireAdmin } from '@/features/auth/AuthContext'
import { PanelLayout } from '@/app/PanelLayout'
import { StudentsPage } from '@/features/academic/pages/StudentsPage'
import { GuardiansPage } from '@/features/academic/pages/GuardiansPage'
import { TeachersPage } from '@/features/academic/pages/TeachersPage'
import { OrganizationPage } from '@/features/academic/pages/OrganizationPage'
import { EnrollmentsPage } from '@/features/academic/pages/EnrollmentsPage'
import { ActivityPage } from '@/features/academic/pages/ActivityPage'

export function App() {
  return <AuthProvider><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/iniciar-sesion" element={<LoginPage />} />
    <Route element={<RequireAdmin />}>
      <Route path="/panel" element={<PanelLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="alumnos" element={<StudentsPage />} />
        <Route path="tutores" element={<GuardiansPage />} />
        <Route path="docentes" element={<TeachersPage />} />
        <Route path="organizacion" element={<OrganizationPage />} />
        <Route path="inscripciones" element={<EnrollmentsPage />} />
        <Route path="calificaciones" element={<GradesPage />} />
        <Route path="actividad" element={<ActivityPage />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></AuthProvider>
}
