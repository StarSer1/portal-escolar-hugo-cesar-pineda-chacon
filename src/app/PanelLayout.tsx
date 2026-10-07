import { useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { useAuth } from '@/features/auth/AuthContext'
import { AcademicProvider, useAcademic } from '@/features/academic/AcademicContext'
import { Icon } from '@/shared/components/Icon'
import { SchoolEmblem } from '@/shared/components/SchoolEmblem'

const links = [
  ['Resumen', '/panel', 'home'], ['Alumnos', '/panel/alumnos', 'student'], ['Tutores', '/panel/tutores', 'students'],
  ['Docentes', '/panel/docentes', 'teacher'], ['Organización escolar', '/panel/organizacion', 'layers'],
  ['Inscripciones', '/panel/inscripciones', 'enroll'], ['Calificaciones', '/panel/calificaciones', 'grades'], ['Actividad', '/panel/actividad', 'history'],
]
function initials(name: string) { return name.split(/\s+/).filter((word) => word && !word.endsWith('.')).slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase() }

function PanelShell() {
  const { user, profile } = useAuth()
  const { data, loading, error, retry } = useAcademic()
  const [menu, setMenu] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const location = useLocation()
  const current = links.find(([, href]) => href === location.pathname)?.[0] || 'Panel académico'
  const year = data.schoolYears.find((item) => item.status === 'active')
  return <div className="panel-shell">
    <a className="skip-link" href="#panel-content">Ir al contenido</a>
    {menu && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? 'is-open' : ''}`}>
      <Link className="school-brand" to="/panel" onClick={() => setMenu(false)}><SchoolEmblem size={48} /><span className="school-brand-text"><small>Escuela Primaria</small><strong>Hugo César Piñeda Chacón</strong></span></Link>
      <nav aria-label="Panel académico">{links.map(([name, href, icon]) => <NavLink key={href} end={href === '/panel'} to={href} onClick={() => setMenu(false)} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><Icon name={icon} /><span>{name}</span>{href === '/panel/alumnos' && !loading && <span className="nav-count">{data.students.length}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className={`school-year${loading ? ' is-loading' : year ? '' : ' is-missing'}`}><small>Ciclo activo</small>{loading ? <span className="school-year-placeholder" aria-hidden="true" /> : <strong>{year?.name || 'Por configurar'}</strong>}</div><Link to="/" className="public-link">Visitar sitio institucional <Icon name="external" size={16} /></Link></div>
    </aside>
    <div className="panel-body">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-toggle" aria-label="Abrir menú" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="menu" /></button><span>Panel académico</span><span className="breadcrumb-separator" aria-hidden="true">/</span><strong>{current}</strong></div><div className="topbar-user"><span className="avatar" aria-hidden="true">{initials(profile?.displayName || user?.email || 'A')}</span><div><strong>{profile?.displayName}</strong><small>Administración</small></div><button className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => void signOut(auth).catch(() => setLogoutError('No se pudo cerrar la sesión. Inténtalo de nuevo.'))}><Icon name="logout" /></button></div></header>
      <main id="panel-content" className="panel-content">
        {logoutError && <div className="error-banner" role="alert">{logoutError}</div>}
        {error ? <div className="card load-error" role="alert"><h2>No pudimos cargar el panel</h2><p>{error}</p><button className="btn btn-primary" onClick={retry}><Icon name="refresh" size={18} /> Reintentar</button></div>
          : loading ? <div className="panel-loading" role="status"><span className="sr-only">Cargando información académica…</span><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line" /><span className="skeleton skeleton-panel" /><span className="skeleton skeleton-panel tall" /></div>
            : <Outlet />}
      </main><footer className="panel-footer"><span>Escuela Primaria Hugo César Piñeda Chacón</span><span>Panel académico · Administración</span></footer>
    </div>
  </div>
}
export function PanelLayout() { return <AcademicProvider><PanelShell /></AcademicProvider> }
