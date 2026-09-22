import { useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { useAuth } from '@/features/auth/AuthContext'
import { AcademicProvider, useAcademic } from '@/features/academic/AcademicContext'
import { Icon } from '@/shared/components/Icon'

const links = [
  ['Resumen', '/panel', 'grid'], ['Alumnos', '/panel/alumnos', 'students'], ['Tutores', '/panel/tutores', 'shield'],
  ['Docentes', '/panel/docentes', 'book'], ['Organización escolar', '/panel/organizacion', 'calendar'],
  ['Inscripciones', '/panel/inscripciones', 'students'], ['Calificaciones', '/panel/calificaciones', 'grades'], ['Actividad', '/panel/actividad', 'clock'],
]
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
      <Link className="school-brand" to="/panel" onClick={() => setMenu(false)}><span className="school-emblem"><Icon name="book" size={25} /></span><span>Hugo César<span>Piñeda Chacón</span><small>ESCUELA PRIMARIA</small></span></Link>
      <p className="nav-label">GESTIÓN ACADÉMICA</p>
      <nav aria-label="Panel académico">{links.map(([name, href, icon]) => <NavLink key={href} end={href === '/panel'} to={href} onClick={() => setMenu(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon name={icon} /><span>{name}</span>{href === '/panel/alumnos' && <small>{data.students.length}</small>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="school-year"><span className="status-dot" /><div><small>CICLO ACTIVO</small><strong>{year?.name || 'Por configurar'}</strong></div></div><Link to="/" className="public-link">Visitar sitio institucional <Icon name="arrow" size={16} /></Link></div>
    </aside>
    <div className="panel-body">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-toggle" aria-label="Abrir menú" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="menu" /></button><span>Panel académico</span><span className="breadcrumb-separator">/</span><strong>{current}</strong></div><div className="topbar-user"><span className="avatar">{(user?.email || 'A').slice(0, 2).toUpperCase()}</span><div><strong>{profile?.displayName}</strong><small>Administración</small></div><button className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => void signOut(auth).catch(() => setLogoutError('No se pudo cerrar la sesión. Inténtalo de nuevo.'))}><Icon name="logout" size={18} /></button></div></header>
      <main id="panel-content" className="panel-content">
        {logoutError && <div className="error-banner" role="alert">{logoutError}</div>}
        {error ? <div className="card load-error" role="alert"><h2>No pudimos cargar el panel</h2><p>{error}</p><button className="btn btn-primary" onClick={retry}>Reintentar</button></div> : loading ? <div className="card loading-state" role="status"><div className="loading-dot" /> Cargando información académica…</div> : <Outlet />}
      </main><footer className="panel-footer"><span>Escuela Primaria Hugo César Piñeda Chacón</span><span>Panel académico · Administración</span></footer>
    </div>
  </div>
}
export function PanelLayout() { return <AcademicProvider><PanelShell /></AcademicProvider> }
