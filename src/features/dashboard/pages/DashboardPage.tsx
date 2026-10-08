import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useAcademic } from '@/features/academic/AcademicContext'
import { auditActions, auditActor, auditDate, auditModules, auditRecordName, auditTones } from '@/features/academic/audit'
import { today } from '@/features/academic/components/AcademicUI'
import { captureFor, captureStateLabel, captureTone, dayStamp, daysUntil, focusPeriod } from '@/features/grades/capture'
import { Icon } from '@/shared/components/Icon'
import { ButtonLink } from '@/shared/ui/Button'
import { Badge, EmptyState, PageHeader } from '@/shared/ui/Feedback'
import type { GradingPeriod, Group, SchoolYear } from '@/types/models'

interface Pending { key: string; state: string; title: ReactNode; detail: string; href: string }

const DAY = 86_400_000
const NBSP = String.fromCharCode(160)
const formatDate = (value: string, options: Intl.DateTimeFormatOptions) => new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', options)
const shortDate = (value: string) => formatDate(value, { day: 'numeric', month: 'short' })
// The year travels with the word before it, so it never wraps alone.
const longDate = (value: string) => formatDate(value, { day: 'numeric', month: 'long', year: 'numeric' }).replace(/ (\d{4})$/, `${NBSP}$1`)
const percent = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 0 })
const count = new Intl.NumberFormat('es-MX')
const plural = (value: number, one: string, many: string) => `${count.format(value)} ${value === 1 ? one : many}`
const shortName = (group: Group) => `${group.grade}° ${group.label}`

function periodNote(period: GradingPeriod, daysLeft: number) {
  const close = shortDate(period.endDate)
  if (period.status !== 'open') return { title: `${period.name} · Cerrado`, detail: `Cerró el ${close}` }
  const detail = daysLeft > 1 ? `Cierra el ${close} · faltan ${daysLeft} días` : daysLeft === 1 ? `Cierra el ${close} · falta 1 día` : daysLeft === 0 ? 'Cierra hoy' : `La fecha de cierre (${close}) ya pasó`
  return { title: `${period.name} · Abierto`, detail }
}

/** "Hoy, 9:42", "Ayer, 13:20" or "3 oct, 10:31". */
function feedTime(date: Date | null, now: string) {
  if (!date) return 'Sin fecha'
  const time = date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const diff = Math.round((dayStamp(now) - dayStamp(day)) / DAY)
  if (diff === 0) return `Hoy, ${time}`
  if (diff === 1) return `Ayer, ${time}`
  return `${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}, ${time}`
}

function CycleLine({ cycle, periods, now }: { cycle: SchoolYear; periods: GradingPeriod[]; now: string }) {
  const start = dayStamp(cycle.startDate)
  const span = Math.max(dayStamp(cycle.endDate) - start, DAY)
  const position = (value: string) => Math.min(Math.max((dayStamp(value) - start) / span, 0), 1) * 100
  const status = (period: GradingPeriod) => period.status === 'open' ? 'open' : period.startDate > now ? 'future' : 'past'
  const label = { open: 'Abierto', future: 'Próximo', past: 'Cerrado' }
  const boxes = periods.map((period) => { const left = position(period.startDate); return { period, left, width: Math.max(position(period.endDate) - left, 1) } })
  return <div className="cycle-line">
    <div className="cycle-track" aria-hidden="true">
      {boxes.map(({ period, left, width }) => {
        const elapsed = Math.min(Math.max((dayStamp(now) - dayStamp(period.startDate)) / Math.max(dayStamp(period.endDate) - dayStamp(period.startDate), DAY), 0), 1)
        return <span key={period.id} className={`cycle-segment is-${status(period)}`} style={{ left: `${left}%`, width: `${width}%` }}>{status(period) === 'open' && <span className="cycle-elapsed" style={{ width: `${elapsed * 100}%` }} />}</span>
      })}
      {now >= cycle.startDate && now <= cycle.endDate && <span className="cycle-today" style={{ left: `${position(now)}%` }}><span>Hoy</span></span>}
    </div>
    {/* Labels sit under their own segment: the margin is the gap since the previous period. */}
    <ol className="cycle-periods" aria-label="Periodos de evaluación del ciclo">{boxes.map(({ period, left, width }, index) => {
      const previous = index ? boxes[index - 1].left + boxes[index - 1].width : 0
      return <li key={period.id} style={{ marginLeft: `${Math.max(left - previous, 0)}%`, width: `${width}%` }}><strong>{period.name}</strong><small>{shortDate(period.startDate)} – {shortDate(period.endDate)} · {label[status(period)]}</small></li>
    })}</ol>
  </div>
}

export function DashboardPage() {
  const { data } = useAcademic()
  const { user, profile } = useAuth()
  const now = today()
  const cycle = data.schoolYears.find((year) => year.status === 'active')
  const groups = data.groups.filter((group) => group.schoolYearId === cycle?.id && group.status === 'active').sort((a, b) => a.grade - b.grade || a.label.localeCompare(b.label))
  const enrollments = data.enrollments.filter((item) => item.schoolYearId === cycle?.id && item.status === 'active')
  const teachers = data.teachers.filter((teacher) => teacher.status === 'active')
  const periods = data.gradingPeriods.filter((item) => item.schoolYearId === cycle?.id).sort((a, b) => a.order - b.order)
  const period = focusPeriod(periods, now)
  const open = period?.status === 'open'
  const daysLeft = period ? daysUntil(period, now) : null
  const capture = groups.map((group) => captureFor(data, group, period, daysLeft))
  const note = period ? periodNote(period, daysLeft ?? 0) : null
  const captured = capture.reduce((sum, item) => sum + item.captured, 0)
  const expected = capture.reduce((sum, item) => sum + item.expected, 0)
  const gradesHref = (group?: Group) => group ? `/panel/calificaciones?grupo=${group.id}${period ? `&periodo=${period.id}` : ''}` : '/panel/calificaciones'
  const date = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const steps = [
    { title: 'Organiza el ciclo escolar', text: 'Define fechas, plan, materias y periodos.', done: !!cycle && periods.length > 0 && data.subjectPlans.length > 0, href: '/panel/organizacion' },
    { title: 'Integra el equipo docente', text: 'General, Educación Física, Inglés y Artes.', done: ['general', 'physical', 'english', 'arts'].every((specialty) => teachers.some((teacher) => teacher.specialty === specialty)), href: '/panel/docentes' },
    { title: 'Forma tus grupos', text: 'Relaciona el ciclo, el plan y los cuatro docentes.', done: groups.length > 0, href: '/panel/organizacion?tab=groups' },
    { title: 'Inscribe a tus alumnos', text: 'Completa el expediente y asigna un grupo.', done: enrollments.length > 0, href: '/panel/inscripciones' },
  ]
  const complete = steps.filter((step) => step.done).length

  const pending: Pending[] = []
  const late = capture.filter((item) => item.state === 'late')
  const notStarted = capture.filter((item) => item.state === 'none')
  if (period && late.length) pending.push({
    key: 'late', state: 'late', href: gradesHref(late.length === 1 ? late[0].group : undefined),
    title: late.length === 1 ? `${shortName(late[0].group)} ${open ? 'va atrasado en la captura' : 'quedó con captura incompleta'}` : `${late.length} grupos ${open ? 'atrasados en la captura' : 'con captura incompleta'}`,
    detail: `${late.map((item) => shortName(item.group)).join(', ')} · ${period.name}.`,
  })
  if (notStarted.length) pending.push({
    key: 'not-started', state: 'none', href: gradesHref(notStarted.length === 1 ? notStarted[0].group : undefined),
    title: notStarted.length === 1 ? `${shortName(notStarted[0].group)} no ha iniciado la captura` : `${notStarted.length} grupos sin iniciar la captura`,
    detail: notStarted.length === 1 ? `Docente titular: ${notStarted[0].teacher ?? 'sin asignar'}.` : `${notStarted.map((item) => shortName(item.group)).join(', ')}.`,
  })
  const enrolled = new Set(enrollments.map((item) => item.studentId))
  const unenrolled = cycle ? data.students.filter((student) => student.status === 'active' && !enrolled.has(student.id)).length : 0
  if (cycle && unenrolled) pending.push({ key: 'unenrolled', state: 'progress', href: '/panel/inscripciones', title: <>{plural(unenrolled, 'alumno', 'alumnos')} sin inscripción en <span className="nowrap">{cycle.name}</span></>, detail: 'Inscríbelos en un grupo del ciclo.' })
  const linked = new Set(data.studentGuardians.map((item) => item.studentId))
  const withoutGuardian = data.students.filter((student) => student.status === 'active' && !linked.has(student.id)).length
  if (withoutGuardian) pending.push({ key: 'guardians', state: 'info', href: '/panel/alumnos', title: `${plural(withoutGuardian, 'alumno', 'alumnos')} sin tutor vinculado`, detail: 'Vincúlalos desde su expediente.' })
  const withoutAccess = teachers.filter((teacher) => !teacher.authUid).length
  if (withoutAccess) pending.push({ key: 'access', state: 'info', href: '/panel/docentes', title: `${plural(withoutAccess, 'docente', 'docentes')} sin acceso al portal`, detail: 'Habilita su cuenta desde Docentes.' })

  const recent = [...data.auditLogs].sort((a, b) => (auditDate(b.createdAt)?.getTime() ?? 0) - (auditDate(a.createdAt)?.getTime() ?? 0)).slice(0, 6)
  const totalWeeks = cycle ? Math.ceil((dayStamp(cycle.endDate) - dayStamp(cycle.startDate) + DAY) / (7 * DAY)) : 0
  const week = cycle ? Math.floor((dayStamp(now) - dayStamp(cycle.startDate)) / (7 * DAY)) + 1 : 0

  return <>
    <PageHeader
      title="Resumen académico"
      description={date.charAt(0).toUpperCase() + date.slice(1)}
      actions={<>
        <ButtonLink variant="secondary" icon="enroll" to="/panel/inscripciones?nuevo=1">Inscribir alumno</ButtonLink>
        <ButtonLink variant="primary" icon="plus" to="/panel/alumnos?nuevo=1">Registrar alumno</ButtonLink>
      </>}
    />
    {complete < steps.length && <section className="card" aria-labelledby="setup-title">
      <div className="card-heading"><div><h2 id="setup-title">Prepara tu ciclo escolar</h2><p>Completa estos pasos para empezar a capturar calificaciones.</p></div><Badge tone="count">{complete} de {steps.length}</Badge></div>
      <ol className="setup-list">{steps.map((step, index) => <li key={step.title}>
        <Link to={step.href} className="setup-step">
          <span className={`step-number${step.done ? ' complete' : ''}`}>{step.done ? <Icon name="check" size={18} /> : index + 1}</span>
          <span><strong>{step.title}</strong><small>{step.done ? 'Listo' : step.text}</small></span>
          <Icon name="chevron" size={18} />
        </Link>
      </li>)}</ol>
    </section>}
    {cycle && <>
      <section className="card overview" aria-labelledby="overview-title">
        <h2 id="overview-title" className="overview-lead"><span className="figure">{count.format(enrollments.length)}</span> {enrollments.length === 1 ? 'alumno inscrito' : 'alumnos inscritos'} en <span className="figure">{groups.length}</span> {groups.length === 1 ? 'grupo' : 'grupos'}, con <span className="figure">{teachers.length}</span> {teachers.length === 1 ? 'docente activo' : 'docentes activos'}.</h2>
        <p className="overview-lead overview-week">{now < cycle.startDate ? `El ciclo inicia el ${longDate(cycle.startDate)}.` : now > cycle.endDate ? `El ciclo terminó el ${longDate(cycle.endDate)}.` : <>Semana <span className="figure">{week}</span> de {totalWeeks} del ciclo escolar.</>}</p>
        <p className="overview-meta"><span>Ciclo escolar <strong className="nowrap">{cycle.name}</strong></span><span>Del {longDate(cycle.startDate)} al {longDate(cycle.endDate)}</span><Badge tone="success">Vigente</Badge></p>
        {periods.length > 0 && <CycleLine cycle={cycle} periods={periods} now={now} />}
      </section>
      <div className="summary-grid">
        <section className="card drawer" aria-labelledby="drawer-title">
          <header className="drawer-front">
            <div><h2 id="drawer-title">Avance de calificaciones</h2>{expected > 0 && <p><strong>{percent.format(captured / expected)}</strong> capturado: {count.format(captured)} de {count.format(expected)} calificaciones</p>}</div>
            {note && <p className="drawer-label"><strong>{note.title}</strong><span>{note.detail}</span></p>}
          </header>
          {!period ? <div className="drawer-empty"><p>Configura los periodos de evaluación del ciclo para seguir la captura de calificaciones.</p><ButtonLink to="/panel/organizacion?tab=periods">Configurar periodos</ButtonLink></div>
            : !groups.length ? <div className="drawer-empty"><p>Aún no hay grupos activos en el ciclo <span className="nowrap">{cycle.name}</span>.</p><ButtonLink to="/panel/organizacion?tab=groups">Configurar grupos</ButtonLink></div>
              : <>
                <div className="edge-axis" aria-hidden="true"><span>Grupo</span><span>Docente titular</span><span className="edge-axis-scale">{[0, 0.5, 1].map((value) => <span key={value} style={{ left: `${value * 100}%` }}>{percent.format(value)}</span>)}</span><span className="edge-axis-value">Avance</span></div>
                <ul className="drawer-list">{capture.map((item) => <li key={item.group.id}>
                  <Link className="edge-row" data-state={item.state} to={gradesHref(item.group)} style={{ '--pct': `${(item.share * 100).toFixed(1)}%` } as CSSProperties}>
                    <span className="edge-index">{shortName(item.group)}</span>
                    <span className="edge-main"><strong>{item.teacher ?? 'Sin docente titular'}</strong><small>{!item.students ? 'Sin alumnos inscritos' : `${plural(item.students, 'alumno', 'alumnos')} · ${item.expected ? `${count.format(item.captured)} de ${count.format(item.expected)}` : 'sin materias activas'}`}</small></span>
                    <span className="edge-scale" aria-hidden="true"><span className="scale-track" /><span className="scale-fill" /><span className="signal-rail"><span className="signal-clip" /></span></span>
                    <span className="edge-value"><strong>{item.expected ? percent.format(item.share) : '—'}</strong><Badge tone={captureTone[item.state]}>{captureStateLabel(item, open)}</Badge></span>
                  </Link>
                </li>)}</ul>
                <ul className="drawer-legend" aria-label="Significado de las señales"><li className="legend-complete">Completo</li><li className="legend-progress">En captura</li><li className="legend-none">Sin iniciar</li><li className="legend-late">{open ? 'Atrasado' : 'Incompleto'}</li></ul>
              </>}
        </section>
        <div className="summary-side">
          <section className="card signals" aria-labelledby="pending-title">
            <div className="card-heading"><h2 id="pending-title">Pendientes</h2>{pending.length > 0 && <Badge tone="count">{pending.length}</Badge>}</div>
            <ul className="signals-list">{pending.length ? pending.map((item) => <li key={item.key}>
              <Link className="signal-item" data-state={item.state} to={item.href}><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="chevron" size={18} /></Link>
            </li>) : <li><div className="signal-item" data-state="complete"><span><strong>Todo en orden</strong><small>No hay pendientes en el ciclo activo.</small></span></div></li>}</ul>
          </section>
          <section className="card feed-card" aria-labelledby="feed-title">
            <div className="card-heading"><h2 id="feed-title">Actividad reciente</h2><Link className="text-link" to="/panel/actividad">Ver todo <Icon name="arrow" size={16} /></Link></div>
            {recent.length ? <ol className="feed">{recent.map((audit) => {
              const actor = auditActor(audit, data, user?.uid, profile?.displayName)
              return <li key={audit.id} data-state={auditTones[audit.action] ?? 'muted'}>
                <p className="feed-title"><strong>{auditActions[audit.action] ?? audit.action}</strong> · {auditRecordName(audit, data)}</p>
                <p className="feed-meta"><time>{feedTime(auditDate(audit.createdAt), now)}</time> · {actor.raw ? 'Otra cuenta' : actor.name} · {auditModules[audit.entityType]?.label ?? audit.entityType}</p>
              </li>
            })}</ol> : <EmptyState compact icon="history" title="Sin movimientos todavía">Aquí verás altas, inscripciones y calificaciones conforme se registren.</EmptyState>}
          </section>
        </div>
      </div>
    </>}
  </>
}
