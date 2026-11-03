import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'
import { SchoolEmblem } from '@/shared/components/SchoolEmblem'
import { navLinks, school } from './school'
import { Photo } from './components/Photo'
import '@/styles/site.css'

/** Muestra con una transición suave cada elemento marcado con data-reveal al entrar en pantalla. */
function useReveal(root: RefObject<HTMLDivElement | null>, key: string) {
  useEffect(() => {
    const container = root.current
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    container.classList.add('reveal-ready')
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 })
    container.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [root, key])
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname, hash } = useLocation()
  const site = useRef<HTMLDivElement>(null)
  useReveal(site, pathname)

  useEffect(() => {
    setMenuOpen(false)
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  return <div className="site" ref={site}>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className={scrolled ? 'site-header is-scrolled' : 'site-header'}>
      <div className="site-header-inner">
        <Link className="site-brand" to="/" aria-label={`${school.fullName}, inicio`}>
          <SchoolEmblem size={40} />
          <span className="site-brand-name"><small>Escuela Primaria</small>{school.name}</span>
        </Link>
        <nav id="site-nav" className={menuOpen ? 'site-nav is-open' : 'site-nav'} aria-label="Principal">
          <ul>{navLinks.map((link) => <li key={link.href}><NavLink to={link.href} end>{link.label}</NavLink></li>)}</ul>
        </nav>
        <Link className="login-button" to="/iniciar-sesion"><Icon name="lock" size={16} />Login</Link>
        <button type="button" className="menu-button" aria-expanded={menuOpen} aria-controls="site-nav" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuOpen((open) => !open)}>
          <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>
      </div>
    </header>
    <main id="contenido" className="site-main" tabIndex={-1}><Outlet /></main>
    <footer className="site-footer">
      <div className="footer-strip" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="site-footer-inner">
        <div className="footer-brand">
          <SchoolEmblem size={48} />
          <p><strong>Escuela Primaria</strong><br />{school.name}</p>
        </div>
        <div>
          <h2>Secciones</h2>
          <ul>{navLinks.slice(1).map((link) => <li key={link.href}><Link to={link.href}>{link.label}</Link></li>)}</ul>
        </div>
        <div>
          <h2>Contacto</h2>
          <ul className="footer-contact">
            <li><Icon name="phone" size={18} /><a href={`tel:${school.phone.replace(/\s/g, '')}`}>{school.phone}</a></li>
            <li><Icon name="pin" size={18} /><span>{school.address}</span></li>
            {school.email && <li><Icon name="mail" size={18} /><a href={`mailto:${school.email}`}>{school.email}</a></li>}
          </ul>
        </div>
        <div>
          <h2>Personal</h2>
          <ul><li><Link to="/iniciar-sesion">Entrar al Kárdex</Link></li></ul>
        </div>
      </div>
      <p className="footer-bottom">© {new Date().getFullYear()} {school.fullName}</p>
    </footer>
    <button type="button" className={scrolled ? 'to-top is-shown' : 'to-top'} aria-label="Volver arriba" tabIndex={scrolled ? undefined : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
      <Icon name="chevronUp" size={22} />
    </button>
  </div>
}

/** Encabezado de las páginas interiores, sobre una foto de la escuela. */
export function PageHeader({ title, image, children }: { title: string; image: string; children?: ReactNode }) {
  return <section className="page-header-band">
    <Photo className="page-header-photo" src={image} alt="" eager fallback={<span className="page-header-photo" />} />
    <div className="page-header-content">
      <nav className="crumbs" aria-label="Ubicación"><Link to="/">Inicio</Link><Icon name="chevron" size={14} /><span aria-current="page">{title}</span></nav>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  </section>
}
