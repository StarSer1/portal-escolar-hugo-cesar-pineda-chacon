import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireTeacher } from '@/features/auth/AuthContext'
import { TeacherPanelPage } from '@/features/teacher/TeacherPanelPage'

/** Rutas de /docente. */
export default function TeacherArea() {
  return <Routes>
    <Route element={<RequireTeacher />}>
      <Route index element={<TeacherPanelPage />} />
      <Route path="*" element={<Navigate to="/docente" replace />} />
    </Route>
  </Routes>
}
