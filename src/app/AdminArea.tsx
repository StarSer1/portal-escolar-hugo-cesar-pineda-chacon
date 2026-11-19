import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin } from '@/features/auth/AuthContext'
import { PanelLayout } from '@/app/PanelLayout'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { StudentsPage } from '@/features/academic/pages/StudentsPage'
import { GuardiansPage } from '@/features/academic/pages/GuardiansPage'
import { TeachersPage } from '@/features/academic/pages/TeachersPage'
import { OrganizationPage } from '@/features/academic/pages/OrganizationPage'
import { EnrollmentsPage } from '@/features/academic/pages/EnrollmentsPage'
import { GradesPage } from '@/features/grades/pages/GradesPage'
import { DocumentsPage } from '@/features/documents/pages/DocumentsPage'
import { ActivityPage } from '@/features/academic/pages/ActivityPage'
import { SiteEditorPage } from '@/features/public/admin/SiteEditorPage'

/** Rutas de /panel (solo dirección). */
export default function AdminArea() {
  return <Routes>
    <Route element={<RequireAdmin />}>
      <Route element={<PanelLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="alumnos" element={<StudentsPage />} />
        <Route path="tutores" element={<GuardiansPage />} />
        <Route path="docentes" element={<TeachersPage />} />
        <Route path="organizacion" element={<OrganizationPage />} />
        <Route path="inscripciones" element={<EnrollmentsPage />} />
        <Route path="calificaciones" element={<GradesPage />} />
        <Route path="documentos" element={<DocumentsPage />} />
        <Route path="actividad" element={<ActivityPage />} />
        <Route path="sitio" element={<SiteEditorPage />} />
        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Route>
    </Route>
  </Routes>
}
