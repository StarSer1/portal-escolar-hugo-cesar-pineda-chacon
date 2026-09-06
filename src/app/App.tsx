import { Route, Routes } from 'react-router-dom'
import { HomePage } from '@/features/public/pages/HomePage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { GradesPage } from '@/features/grades/pages/GradesPage'
import { NotFoundPage } from '@/shared/pages/NotFoundPage'

export function App() {
  return <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/iniciar-sesion" element={<LoginPage />} />
    <Route path="/panel" element={<DashboardPage />} />
    <Route path="/panel/calificaciones" element={<GradesPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
}
