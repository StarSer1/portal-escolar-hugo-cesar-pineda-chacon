import { Link } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'
import { usePageTitle } from '@/shared/hooks/usePageTitle'

/** Página no encontrada, dentro del diseño del sitio público. */
export function NotFoundPage() {
  usePageTitle('Página no encontrada')
  return <section className="section not-found">
    <p className="not-found-code" aria-hidden="true">404</p>
    <h1>No encontramos esta página</h1>
    <p>La dirección no existe o cambió de lugar. Puedes volver al inicio o usar el menú de arriba.</p>
    <Link className="pill-button" to="/"><Icon name="home" size={18} />Ir al inicio</Link>
  </section>
}
