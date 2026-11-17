import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'
import { quickLinks } from '../school'
import { useSite } from '../SiteContent'
import { Photo } from './Photo'

const INTERVAL = 7000

export function HeroCarousel() {
  const { content, ready } = useSite()
  const { slides } = content.home
  const [rawIndex, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const count = slides.length
  // El director puede quitar diapositivas mientras alguien ve la portada.
  const index = count ? rawIndex % count : 0
  const autoplay = !paused && !reduced && count > 1

  useEffect(() => {
    if (!autoplay) return
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % count), INTERVAL)
    return () => window.clearTimeout(timer)
  }, [autoplay, index, count])

  const go = (step: number) => setIndex((current) => (current + step + count) % count)

  // Se cargan solo la diapositiva visible y sus vecinas: menos datos en celulares.
  const near = (position: number) => count < 4 || position === index || position === (index + 1) % count || position === (index - 1 + count) % count

  return <>
    {!ready && <section className="hero is-loading" aria-busy="true" aria-label="Cargando avisos de la escuela" />}
    {ready && count > 0 && <section className="hero" aria-roledescription="carrusel" aria-label="Avisos de la escuela"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {slides.map((slide, position) => <div key={position} className={position === index ? 'hero-slide is-active' : 'hero-slide'}
        role="group" aria-roledescription="diapositiva" aria-label={`${position + 1} de ${count}`} aria-hidden={position !== index}>
        {near(position) && <Photo className="hero-photo" src={slide.image} alt="" eager={position === index} priority={position === 0} sizes="100vw" />}
        <div className="hero-content">
          <p className="hero-tag">{slide.tag}</p>
          <h2 className="hero-title">{slide.title}{slide.subtitle && <span>{slide.subtitle}</span>}</h2>
          <p className="hero-text">{slide.text}</p>
          {slide.actionLabel && slide.actionHref && <SlideAction href={slide.actionHref} hidden={position !== index}>{slide.actionLabel}</SlideAction>}
        </div>
      </div>)}
      {count > 1 && <>
        <button type="button" className="hero-arrow is-prev" onClick={() => go(-1)} aria-label="Anterior"><Icon name="chevronLeft" size={22} /></button>
        <button type="button" className="hero-arrow is-next" onClick={() => go(1)} aria-label="Siguiente"><Icon name="chevron" size={22} /></button>
        <div className="hero-dots">
          {slides.map((slide, position) => <button key={position} type="button" aria-label={`Ir a la diapositiva ${position + 1}`} aria-current={position === index} onClick={() => setIndex(position)}>
            {position === index && autoplay && <i key={index} className="hero-progress" style={{ animationDuration: `${INTERVAL}ms` }} />}
          </button>)}
        </div>
      </>}
    </section>}
    <nav className="quick-links" aria-label="Accesos rápidos">
      <div className="quick-links-inner">
        {quickLinks.map((link) => <Link key={link.href} to={link.href} className={`quick-link tone-${link.tone}`}>
          <Icon name={link.icon} size={30} />
          <span><strong>{link.label}</strong><small>{link.text}</small></span>
        </Link>)}
      </div>
    </nav>
  </>
}

/** Botón de la diapositiva: ruta interna del sitio o dirección externa (ya saneada en SiteContent). */
function SlideAction({ href, hidden, children }: { href: string; hidden: boolean; children: string }) {
  const content = <>{children} <Icon name="arrow" size={18} /></>
  if (!href.startsWith('/')) return <a className="pill-button is-light" href={href} target="_blank" rel="noreferrer" tabIndex={hidden ? -1 : undefined}>{content}</a>
  return <Link className="pill-button is-light" to={href} tabIndex={hidden ? -1 : undefined}>{content}</Link>
}
