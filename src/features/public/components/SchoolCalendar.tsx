import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'
import { calendarPdf, currentCycle, eventKinds, eventsAreExamples, schoolEvents, type EventKind, type SchoolEvent } from '../school'
import { SectionTitle } from './Sections'

const MONTHS = ['Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio']
const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parse = (value: string) => new Date(`${value}T12:00:00`)
const longDate = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
const dayNumber = new Intl.DateTimeFormat('es-MX', { day: 'numeric' })
const monthShort = new Intl.DateTimeFormat('es-MX', { month: 'short' })

export function eventDateLabel(event: SchoolEvent) {
  const start = parse(event.date)
  if (!event.end) return capitalize(longDate.format(start))
  return `Del ${shortDate.format(start)} al ${shortDate.format(parse(event.end))}`
}
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** Cada día del ciclo con sus eventos; los periodos se expanden día por día. */
function useEventsByDay() {
  return useMemo(() => {
    const map = new Map<string, SchoolEvent[]>()
    for (const event of schoolEvents) {
      const last = parse(event.end ?? event.date)
      for (let day = parse(event.date); day <= last; day.setDate(day.getDate() + 1)) {
        const key = iso(day)
        map.set(key, [...(map.get(key) ?? []), event])
      }
    }
    return map
  }, [])
}

interface Selection { date: string; pinned: boolean }

function CalendarGrid({ selection, onSelect, focusKind }: { selection: Selection | null; onSelect: (value: Selection | null) => void; focusKind: EventKind | null }) {
  const cycle = currentCycle()
  const today = iso(new Date())
  const byDay = useEventsByDay()
  const container = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number; above: boolean } | null>(null)

  useLayoutEffect(() => {
    const box = container.current
    const target = selection && box?.querySelector<HTMLElement>(`[data-date="${selection.date}"]`)
    if (!box || !target) { setPosition(null); return }
    const outer = box.getBoundingClientRect()
    const cell = target.getBoundingClientRect()
    const width = Math.min(300, outer.width - 16)
    const center = cell.left - outer.left + cell.width / 2
    const left = Math.max(width / 2 + 8, Math.min(outer.width - width / 2 - 8, center))
    const above = cell.bottom - outer.top + 200 > outer.height
    setPosition({ left, top: above ? cell.top - outer.top - 10 : cell.bottom - outer.top + 10, above })
  }, [selection])

  useEffect(() => {
    if (!selection?.pinned) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !(event.target as HTMLElement).closest('.cal-day.has-event, .cal-popover, .upcoming')) onSelect(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [selection, onSelect])

  const selectedEvents = selection ? byDay.get(selection.date) ?? [] : []

  return <div className="cal" ref={container} data-focus={focusKind ?? undefined}>
    {MONTHS.map((name, slot) => {
      const year = slot < 5 ? cycle.start : cycle.end
      const month = (slot + 7) % 12
      const first = new Date(year, month, 1).getDay()
      const days = new Date(year, month + 1, 0).getDate()
      return <section key={name} className="cal-month" aria-label={`${name} ${year}`}>
        <h3>{name} <span>{year}</span></h3>
        <div className="cal-grid">
          {WEEKDAYS.map((day, column) => <abbr key={column} className="cal-weekday" title={['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][column]}>{day}</abbr>)}
          {Array.from({ length: first }, (_, blank) => <span key={`b${blank}`} aria-hidden="true" />)}
          {Array.from({ length: days }, (_, index) => {
            const date = iso(new Date(year, month, index + 1))
            const weekday = (first + index) % 7
            const events = byDay.get(date)
            const kind = events?.[0].kind
            const classes = ['cal-day', (weekday === 0 || weekday === 6) && 'is-weekend', date === today && 'is-today', events && `has-event k-${kind}`,
              events?.some((event) => event.end && event.date !== date) && 'range-mid', selection?.date === date && 'is-selected'].filter(Boolean).join(' ')
            if (!events) return <span key={date} className={classes}>{index + 1}</span>
            return <button key={date} type="button" className={classes} data-date={date}
              aria-label={`${index + 1} de ${name}: ${events.map((event) => event.title).join(', ')}`}
              aria-describedby={selection?.date === date ? 'cal-popover' : undefined}
              onMouseEnter={() => { if (!selection?.pinned) onSelect({ date, pinned: false }) }}
              onMouseLeave={() => { if (!selection?.pinned) onSelect(null) }}
              onFocus={() => { if (!selection?.pinned) onSelect({ date, pinned: false }) }}
              onBlur={() => { if (!selection?.pinned) onSelect(null) }}
              onClick={() => onSelect(selection?.date === date && selection.pinned ? null : { date, pinned: true })}>
              {index + 1}
            </button>
          })}
        </div>
      </section>
    })}
    {selection && position && selectedEvents.length > 0 && <div id="cal-popover" role="status" className={position.above ? 'cal-popover is-above' : 'cal-popover'}
      style={{ left: position.left, top: position.top }}>
      <p className="cal-popover-date">{capitalize(longDate.format(parse(selection.date)))}</p>
      {selectedEvents.map((event) => <div key={event.title} className={`cal-popover-event tone-${eventKinds[event.kind].tone}`}>
        <span className="kind-chip">{eventKinds[event.kind].label}</span>
        <strong>{event.title}</strong>
        {event.end && <small>{eventDateLabel(event)}</small>}
        <p>{event.detail}</p>
      </div>)}
      {selection.pinned && <button type="button" className="cal-popover-close" onClick={() => onSelect(null)} aria-label="Cerrar"><Icon name="close" size={16} /></button>}
    </div>}
  </div>
}

function UpcomingEvents({ limit, onPick }: { limit?: number; onPick: (date: string) => void }) {
  const today = iso(new Date())
  const upcoming = schoolEvents.filter((event) => (event.end ?? event.date) >= today).slice(0, limit)
  return <ol className="upcoming">
    {upcoming.map((event) => {
      const start = parse(event.date)
      return <li key={`${event.date}-${event.title}`}>
        <button type="button" className={`upcoming-item tone-${eventKinds[event.kind].tone}`} onClick={() => onPick(event.date >= today ? event.date : today)}>
          <span className="upcoming-date"><strong>{dayNumber.format(start)}</strong><small>{monthShort.format(start).replace('.', '')}</small></span>
          <span className="upcoming-text"><strong>{event.title}</strong><small>{event.end ? eventDateLabel(event) : eventKinds[event.kind].label}</small></span>
        </button>
      </li>
    })}
    {!upcoming.length && <li className="pending">No hay más fechas en este ciclo.</li>}
  </ol>
}

export function SchoolCalendar({ full = false }: { full?: boolean }) {
  const cycle = currentCycle()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [focusKind, setFocusKind] = useState<EventKind | null>(null)
  const kinds = Object.keys(eventKinds) as EventKind[]

  return <>
    <SectionTitle title="Calendario Escolar" lines>{cycle.label}</SectionTitle>
    <div className={full ? 'calendar-layout is-full' : 'calendar-layout'} data-reveal>
      <div className="calendar-frame">
        <div className="cal-legend" role="group" aria-label="Tipos de fecha">
          {kinds.map((kind) => <button key={kind} type="button" className={`legend-chip tone-${eventKinds[kind].tone}`} aria-pressed={focusKind === kind}
            onMouseEnter={() => setFocusKind(kind)} onMouseLeave={() => setFocusKind(null)} onClick={() => setFocusKind((value) => value === kind ? null : kind)}>
            <i aria-hidden="true" />{eventKinds[kind].label}
          </button>)}
          <span className="legend-chip is-today-chip"><i aria-hidden="true" />Hoy</span>
        </div>
        <CalendarGrid selection={selection} onSelect={setSelection} focusKind={focusKind} />
        <p className="cal-hint"><Icon name="info" size={16} />Pasa el cursor o toca una fecha marcada para ver de qué se trata.</p>
      </div>
      <aside className="calendar-aside">
        <h3>Próximas fechas</h3>
        <UpcomingEvents limit={full ? undefined : 5} onPick={(date) => {
          setSelection({ date, pinned: true })
          document.querySelector(`[data-date="${date}"]`)?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        }} />
        {eventsAreExamples && <p className="example-note">Fechas de ejemplo. La dirección publicará aquí las fechas oficiales del ciclo.</p>}
        {!full && <Link className="pill-button" to="/calendario">Ver calendario completo <Icon name="arrow" size={18} /></Link>}
        {calendarPdf && <a className="pill-button is-outline" href={calendarPdf} download><Icon name="download" size={18} />Calendario oficial (PDF)</a>}
      </aside>
    </div>
  </>
}
