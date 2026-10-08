import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { useAuth } from '@/features/auth/AuthContext'
import { AcademicProvider, useAcademic } from '@/features/academic/AcademicContext'
import { initials, today } from '@/features/academic/components/AcademicUI'
import { focusPeriod } from '@/features/grades/capture'
import { Icon } from '@/shared/components/Icon'
import { SchoolEmblem } from '@/shared/components/SchoolEmblem'
import { Button, IconButton } from '@/shared/ui/Button'
import { Alert, Skeleton } from '@/shared/ui/Feedback'
import { breadcrumbFor, navSections } from './navigation'

function CycleStatus() {
  const { data, loading } = useAcademic()
  if (loading) return null
  const year = data.schoolYears.find((item) => item.status === 'active')
  if (!year) return <Link className="cycle-chip is-missing" to="/panel/organizacion?tab=years"><span className="cycle-chip-dot" aria-hidden="true" />Sin ciclo activo</Link>
  const period = focusPeriod(data.gradingPeriods.filter((item) => item.schoolYearId === year.id), today())
  return (
    <Link className="cycle-chip" to="/panel/organizacion?tab=periods" title="Ver periodos de evaluación">
      <span className="cycle-chip-dot" aria-hidden="true" />
      <span>Ciclo <strong>{year.name}</strong></span>
      {period && <span className="cycle-chip-period">{period.name} · {period.status === 'open' ? 'abierto' : 'cerrado'}</span>}
    </Link>
  )
}

function PanelShell() {
  const { user, profile } = useAuth()
  const { data, loading, error, retry } = useAcademic()
  const [menu, setMenu] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const location = useLocation()
  const trail = breadcrumbFor(location.pathname, location.search)

  useEffect(() => {
    if (!menu) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menu])

  return <div className="panel-shell">
    <a className="skip-link" href="#panel-content">Ir al contenido</a>
    {menu && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setMenu(false)} />}
    <aside className={`sidebar${menu ? ' is-open' : ''}`}>
      <Link className="school-brand" to="/panel" onClick={() => setMenu(false)}>
        <SchoolEmblem size={44} />
        <span className="school-brand-text"><small>Escuela Primaria</small><strong>Hugo César Piñeda Chacón</strong></span>
      </Link>
      <nav aria-label="Panel académico" className="side-nav">
        {navSections.map((section, index) => (
          <div className="nav-section" key={section.label ?? index}>
            {section.label && <p className="nav-section-label" aria-hidden="true">{section.label}</p>}
            {section.items.map((item) => (
              <NavLink key={item.href} end={item.href === '/panel'} to={item.href} onClick={() => setMenu(false)} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.href === '/panel/alumnos' && !loading && <span className="nav-count">{data.students.length}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Link to="/" className="public-link">Visitar sitio institucional <Icon name="external" size={16} /></Link>
      </div>
    </aside>
    <div className="panel-body">
      <header className="topbar">
        <div className="topbar-start">
          <IconButton icon="menu" label="Abrir menú" className="mobile-toggle" aria-expanded={menu} onClick={() => setMenu(!menu)} />
          <nav className="breadcrumb" aria-label="Ruta de navegación">
            <ol>
              <li className="breadcrumb-root"><Link to="/panel">Panel académico</Link></li>
              {trail.map((step, index) => <li key={step} aria-current={index === trail.length - 1 ? 'page' : undefined}>{step}</li>)}
            </ol>
          </nav>
        </div>
        <div className="topbar-end">
          <CycleStatus />
          <div className="topbar-user">
            <span className="avatar" aria-hidden="true">{initials(profile?.displayName || user?.email || 'A')}</span>
            <div className="topbar-user-text"><strong>{profile?.displayName}</strong><small>Administración</small></div>
            <IconButton icon="logout" label="Cerrar sesión" onClick={() => void signOut(auth).catch(() => setLogoutError('No se pudo cerrar la sesión. Inténtalo de nuevo.'))} />
          </div>
        </div>
      </header>
      <main id="panel-content" className="panel-content">
        {logoutError && <Alert tone="error" role="alert">{logoutError}</Alert>}
        {error ? <section className="card load-error">
          <Alert tone="error" role="alert" title="No pudimos cargar el panel" action={<Button variant="primary" icon="refresh" onClick={retry}>Reintentar</Button>}>{error}</Alert>
        </section>
          : loading ? <div className="panel-loading" role="status">
            <span className="sr-only">Cargando información académica…</span>
            <Skeleton className="skeleton-title" />
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-panel" />
            <Skeleton className="skeleton-panel tall" />
          </div>
            : <Outlet />}
      </main>
      <footer className="panel-footer"><span>Escuela Primaria Hugo César Piñeda Chacón</span><span>Panel académico · Administración</span></footer>
    </div>
  </div>
}

export function PanelLayout() { return <AcademicProvider><PanelShell /></AcademicProvider> }
