import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'
import { aboutPhotos, gallery, mapEmbedUrl, mapLinkUrl, school, values } from '../school'
import { Photo } from './Photo'

export function SectionTitle({ title, children, lines = false }: { title: string; children?: ReactNode; lines?: boolean }) {
  return <header className="section-title" data-reveal>
    <h2>{title}</h2>
    {children && <div className={lines ? 'section-sub has-lines' : 'section-sub'}>{children}</div>}
  </header>
}

export function Pending({ children = 'Información por confirmar.' }: { children?: ReactNode }) {
  return <p className="pending">{children}</p>
}

/** Misión, visión e historia en tarjetas escalonadas, como en la portada. */
export function AboutCards() {
  return <div className="about-cards">
    <Link to="/conocenos#mision" className="about-card photo-card tone-orange" data-reveal>
      <span className="photo-frame"><Photo src={aboutPhotos.mission} alt="Alumnos en clase" /></span>
      <span className="photo-card-label">Misión</span>
    </Link>
    <Link to="/conocenos#vision" className="about-card text-card tone-teal" data-reveal style={{ '--delay': '120ms' } as CSSProperties}>
      <h3>Visión</h3>
      <p>{school.vision}</p>
      <span className="text-card-more">Leer más <Icon name="arrow" size={16} /></span>
    </Link>
    <Link to="/conocenos#historia" className="about-card photo-card tone-red" data-reveal style={{ '--delay': '240ms' } as CSSProperties}>
      <span className="photo-frame"><Photo src={aboutPhotos.history} alt="Alumnos en el salón" /></span>
      <span className="photo-card-label">Historia</span>
    </Link>
  </div>
}

const GALLERY_INTERVAL = 4500

/** Carrusel de fotos con la central destacada; cada foto abre un visor ampliado. */
export function Gallery() {
  const count = gallery.length
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [viewer, setViewer] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (paused || viewer !== null || count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setTimeout(() => setActive((value) => (value + 1) % count), GALLERY_INTERVAL)
    return () => window.clearTimeout(timer)
  }, [active, paused, viewer, count])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (viewer !== null && !element.open) element.showModal()
    if (viewer === null && element.open) element.close()
  }, [viewer])

  const offsetOf = (position: number) => {
    let offset = position - active
    if (offset > count / 2) offset -= count
    if (offset < -count / 2) offset += count
    return offset
  }
  const step = (delta: number) => setActive((value) => (value + delta + count) % count)
  const stepViewer = (delta: number) => setViewer((value) => value === null ? value : (value + delta + count) % count)

  return <div className="gallery" data-reveal onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <div className="gallery-stage">
      {gallery.map((photo, position) => {
        const offset = offsetOf(position)
        const hidden = Math.abs(offset) > 1
        return <button key={photo.src} type="button" className={offset === 0 ? 'gallery-item is-center' : 'gallery-item'} data-offset={Math.max(-2, Math.min(2, offset))}
          tabIndex={hidden ? -1 : undefined} aria-hidden={hidden} aria-label={`Ampliar foto: ${photo.alt}`}
          onClick={() => offset === 0 ? setViewer(position) : setActive(position)}>
          <Photo src={photo.src} alt="" />
        </button>
      })}
    </div>
    <div className="gallery-controls">
      <button type="button" className="round-button" onClick={() => step(-1)} aria-label="Foto anterior"><Icon name="chevronLeft" size={20} /></button>
      <div className="gallery-dots">{gallery.map((photo, position) => <button key={photo.src} type="button" aria-label={`Ver foto ${position + 1}`} aria-current={position === active} onClick={() => setActive(position)} />)}</div>
      <button type="button" className="round-button" onClick={() => step(1)} aria-label="Foto siguiente"><Icon name="chevron" size={20} /></button>
    </div>
    <dialog ref={dialog} className="lightbox" aria-label="Foto ampliada" onClose={() => setViewer(null)} onClick={(event) => { if (event.target === dialog.current) setViewer(null) }}
      onKeyDown={(event) => { if (event.key === 'ArrowLeft') stepViewer(-1); if (event.key === 'ArrowRight') stepViewer(1) }}>
      {viewer !== null && <figure>
        <img src={gallery[viewer].src} alt={gallery[viewer].alt} />
        <figcaption>{gallery[viewer].alt}<span>{viewer + 1} / {count}</span></figcaption>
      </figure>}
      <button type="button" className="lightbox-close" onClick={() => setViewer(null)} aria-label="Cerrar"><Icon name="close" size={22} /></button>
      <button type="button" className="lightbox-arrow is-prev" onClick={() => stepViewer(-1)} aria-label="Foto anterior"><Icon name="chevronLeft" size={24} /></button>
      <button type="button" className="lightbox-arrow is-next" onClick={() => stepViewer(1)} aria-label="Foto siguiente"><Icon name="chevron" size={24} /></button>
    </dialog>
  </div>
}

export function ValuesStrip() {
  return <div className="values-band">
    <ul className="values">
      {values.map((value, position) => <li key={value.name} className={`value tone-${value.color}`} data-reveal style={{ '--delay': `${position * 110}ms` } as CSSProperties}>
        <Icon name={value.icon} size={40} />
        <h3>{value.name}</h3>
        <p>{value.text}</p>
      </li>)}
    </ul>
  </div>
}

export function FindUs() {
  const rows = [
    { icon: 'pin', title: 'Dirección', body: <p>{school.address}</p> },
    { icon: 'phone', title: 'Contacto', body: <><p><a href={`tel:${school.phone.replace(/\s/g, '')}`}>{school.phone}</a></p>{school.email && <p><a href={`mailto:${school.email}`}>{school.email}</a></p>}</> },
    { icon: 'clock', title: 'Horarios', body: <>{school.shifts.map((shift) => <p key={shift.name}><strong>{shift.name}</strong> · {shift.days}, {shift.hours}</p>)}</> },
  ]
  return <div className="find-us">
    <div className="map" data-reveal>
      <iframe title={`Mapa: ${school.fullName}`} src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div>
    <div className="find-us-info">
      {rows.map((row, position) => <div key={row.title} className="find-row" data-reveal style={{ '--delay': `${position * 100}ms` } as CSSProperties}>
        <span className="find-icon"><Icon name={row.icon} size={22} /></span>
        <div><h3>{row.title}</h3>{row.body}</div>
      </div>)}
      <a className="pill-button" href={mapLinkUrl} target="_blank" rel="noreferrer" data-reveal>Ver ubicación <Icon name="arrow" size={18} /></a>
    </div>
  </div>
}
