import { Link } from 'react-router-dom'

export function DashboardPage() {
  return <main><h1>Panel académico</h1><p>Primer módulo disponible para pruebas.</p>
    <Link to="/panel/calificaciones">Capturar calificaciones</Link>
  </main>
}
