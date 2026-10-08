import { SchoolEmblem } from '@/shared/components/SchoolEmblem'
import { ButtonLink } from '@/shared/ui/Button'

export function NotFoundPage() {
  return <main className="session-screen">
    <div className="session-card">
      <SchoolEmblem size={48} />
      <h1>No encontramos esta página</h1>
      <p>La dirección no existe o cambió de lugar. Vuelve al portal o entra al sistema académico.</p>
      <div className="row-actions">
        <ButtonLink to="/">Ir al portal</ButtonLink>
        <ButtonLink to="/panel" variant="primary">Ir al panel académico</ButtonLink>
      </div>
    </div>
  </main>
}
