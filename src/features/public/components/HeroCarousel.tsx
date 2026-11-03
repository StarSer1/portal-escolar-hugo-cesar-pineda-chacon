import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'
import { quickLinks, slides } from '../school'
import { Photo } from './Photo'

const INTERVAL = 7000

export function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const count = slides.length
  const autoplay = !paused && !reduced && count > 1

  useEffect(() => {
    if (!autoplay) return
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % count), INTERVAL)
    return () => window.clearTimeout(timer)
  }, [autoplay, index, count])

  const go = (step: number) => setIndex((current) => (current + step + count) % count)

  return <>
    <section className="hero" aria-roledescription="carrusel" aria-label="Avisos de la escuela"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {slides.map((slide, position) => <div key={slide.title} className={position === index ? 'hero-slide is-active' : 'hero-slide'}
        role="group" aria-roledescription="diapositiva" aria-label={`${position + 1} de ${count}`} aria-hidden={position !== index}>
        <Photo className="hero-photo" src={slide.image} alt="" eager={position === 0} />
        <div className="hero-content">
          <p className="hero-tag">{slide.tag}</p>
          <h1>{slide.title}{slide.subtitle && <span>{slide.subtitle}</span>}</h1>
          <p className="hero-text">{slide.text}</p>
          {slide.action && <Link className="pill-button is-light" to={slide.action.href} tabIndex={position === index ? undefined : -1}>{slide.action.label} <Icon name="arrow" size={18} /></Link>}
        </div>
      </div>)}
      {count > 1 && <>
        <button type="button" className="hero-arrow is-prev" onClick={() => go(-1)} aria-label="Anterior"><Icon name="chevronLeft" size={22} /></button>
        <button type="button" className="hero-arrow is-next" onClick={() => go(1)} aria-label="Siguiente"><Icon name="chevron" size={22} /></button>
        <div className="hero-dots">
          {slides.map((slide, position) => <button key={slide.title} type="button" aria-label={`Ir a la diapositiva ${position + 1}`} aria-current={position === index} onClick={() => setIndex(position)}>
            {position === index && autoplay && <i key={index} className="hero-progress" style={{ animationDuration: `${INTERVAL}ms` }} />}
          </button>)}
        </div>
      </>}
    </section>
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
