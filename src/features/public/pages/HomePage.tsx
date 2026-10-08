import { Link } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'
import { SchoolEmblem } from '@/shared/components/SchoolEmblem'
import { ButtonLink } from '@/shared/ui/Button'

/**
 * Public entry point. States only what this build actually offers: the sign-in
 * door for staff. Institutional content is pending per PRODUCT.md.
 */
export function HomePage() {
  return <div className="public-page">
    <header className="public-header">
      <Link className="public-brand" to="/"><SchoolEmblem size={40} /><span><small>Escuela Primaria</small><strong>Hugo César Piñeda Chacón</strong></span></Link>
      <ButtonLink to="/iniciar-sesion" variant="primary" size="sm">Iniciar sesión</ButtonLink>
    </header>
    <main className="public-main">
      <section className="public-hero">
        <h1>Portal institucional</h1>
        <p>Información institucional y acceso al sistema académico de la escuela.</p>
        <ButtonLink to="/iniciar-sesion" variant="primary">Entrar al sistema académico <Icon name="arrow" size={18} /></ButtonLink>
      </section>
      <section className="public-cards" aria-label="Accesos del portal">
        <article>
          <span className="public-card-icon"><Icon name="layers" size={22} /></span>
          <h2>Para la dirección</h2>
          <p>Expedientes, tutores, docentes, organización del ciclo, inscripciones y calificaciones, con historial completo de cada movimiento.</p>
        </article>
        <article>
          <span className="public-card-icon"><Icon name="teacher" size={22} /></span>
          <h2>Para docentes</h2>
          <p>Consulta de los grupos asignados en el ciclo activo y captura de calificaciones de tu especialidad en los periodos abiertos.</p>
        </article>
      </section>
    </main>
    <footer className="public-footer">
      <span>Escuela Primaria Hugo César Piñeda Chacón</span>
      <span>Acceso exclusivo para personal autorizado</span>
    </footer>
  </div>
}
