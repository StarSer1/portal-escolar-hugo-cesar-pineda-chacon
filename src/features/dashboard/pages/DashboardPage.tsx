import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { today } from '@/features/academic/components/AcademicUI'
import { Icon } from '@/shared/components/Icon'
import type { AcademicData, GradingPeriod, Group, SchoolYear } from '@/types/models'

type CaptureState = 'complete' | 'progress' | 'late' | 'none' | 'empty'
interface Pending { key: string; state: CaptureState | 'info'; title: ReactNode; detail: string; href: string }

const DAY = 86_400_000
const at = (value: string) => new Date(`${value}T12:00:00`).getTime()
const formatDate = (value: string, options: Intl.DateTimeFormatOptions) => new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', options)
const shortDate = (value: string) => formatDate(value, { day: 'numeric', month: 'short' })
const longDate = (value: string) => formatDate(value, { day: 'numeric', month: 'long', year: 'numeric' })
const percent = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 0 })
const count = new Intl.NumberFormat('es-MX')
const plural = (value: number, one: string, many: string) => `${count.format(value)} ${value === 1 ? one : many}`
const shortName = (group: Group) => `${group.grade}° ${group.label}`
const badgeFor: Record<CaptureState, string> = { complete: 'badge-success', progress: 'badge-warn', late: 'badge-alert', none: '', empty: '' }
function stateText(state: CaptureState, open: boolean) {
  return { complete: 'Completo', progress: 'En captura', late: open ? 'Atrasado' : 'Incompleto', none: 'Sin iniciar', empty: 'Sin alumnos' }[state]
}
function closingText(period: GradingPeriod, daysLeft: number) {
  if (period.status !== 'open') return `Cerrado el ${formatDate(period.endDate, { day: 'numeric', month: 'long' })}`
  const until = `Abierto hasta el ${formatDate(period.endDate, { day: 'numeric', month: 'long' })}`
  if (daysLeft > 1) return `${until} · faltan ${daysLeft} días`
  if (daysLeft === 1) return `${until} · falta 1 día`
  return daysLeft === 0 ? `${until} · cierra hoy` : `${until} · la fecha de cierre ya pasó`
}

/** Expected captures are active enrollments × active subjects of the group's plan and grade. */
function captureByGroup(data: AcademicData, groups: Group[], period: GradingPeriod | undefined, daysLeft: number | null) {
  return groups.map((group) => {
    const enrollments = new Set(data.enrollments.filter((item) => item.groupId === group.id && item.status === 'active').map((item) => item.id))
    const subjects = new Set(data.subjectPlans.filter((item) => item.curriculumPlanId === group.curriculumPlanId && item.grade === group.grade && item.status === 'active').map((item) => item.id))
    const expected = enrollments.size * subjects.size
    const captured = Math.min(period ? data.grades.filter((grade) => grade.periodId === period.id && enrollments.has(grade.enrollmentId) && subjects.has(grade.subjectPlanId)).length : 0, expected)
    const state: CaptureState = !expected ? 'empty' : captured >= expected ? 'complete' : daysLeft !== null && daysLeft <= 10 ? 'late' : captured ? 'progress' : 'none'
    return { group, students: enrollments.size, expected, captured, share: expected ? captured / expected : 0, state, teacher: data.teachers.find((item) => item.id === group.generalTeacherId)?.name }
  })
}

function CycleLine({ cycle, periods, now }: { cycle: SchoolYear; periods: GradingPeriod[]; now: string }) {
  const start = at(cycle.startDate)
  const span = Math.max(at(cycle.endDate) - start, DAY)
  const position = (value: string) => Math.min(Math.max((at(value) - start) / span, 0), 1) * 100
  const status = (period: GradingPeriod) => period.status === 'open' ? 'open' : period.startDate > now ? 'future' : 'past'
  const label = { open: 'Abierto', future: 'Próximo', past: 'Cerrado' }
  const boxes = periods.map((period) => { const left = position(period.startDate); return { period, left, width: Math.max(position(period.endDate) - left, 1) } })
  return <div className="cycle-line">
    <div className="cycle-track" aria-hidden="true">
      {boxes.map(({ period, left, width }) => {
        const elapsed = Math.min(Math.max((at(now) - at(period.startDate)) / Math.max(at(period.endDate) - at(period.startDate), DAY), 0), 1)
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
  const now = today()
  const cycle = data.schoolYears.find((year) => year.status === 'active')
  const groups = data.groups.filter((group) => group.schoolYearId === cycle?.id && group.status === 'active').sort((a, b) => a.grade - b.grade || a.label.localeCompare(b.label))
  const enrollments = data.enrollments.filter((item) => item.schoolYearId === cycle?.id && item.status === 'active')
  const teachers = data.teachers.filter((teacher) => teacher.status === 'active')
  const periods = data.gradingPeriods.filter((item) => item.schoolYearId === cycle?.id).sort((a, b) => a.order - b.order)
  const period = periods.find((item) => item.status === 'open') ?? [...periods].reverse().find((item) => item.startDate <= now) ?? periods[0]
  const open = period?.status === 'open'
  const daysLeft = period ? Math.round((at(period.endDate) - at(now)) / DAY) : null
  const capture = captureByGroup(data, groups, period, daysLeft)
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

  const totalWeeks = cycle ? Math.ceil((at(cycle.endDate) - at(cycle.startDate) + DAY) / (7 * DAY)) : 0
  const week = cycle ? Math.floor((at(now) - at(cycle.startDate)) / (7 * DAY)) + 1 : 0

  return <>
    <header className="page-heading"><div><h1>Resumen académico</h1><p className="page-description">{date.charAt(0).toUpperCase() + date.slice(1)}</p></div><Link className="btn btn-primary" to="/panel/alumnos?nuevo=1"><Icon name="plus" size={18} /> Registrar alumno</Link></header>
    {complete < steps.length && <section className="card" aria-labelledby="setup-title"><div className="card-heading"><div><h2 id="setup-title">Prepara tu ciclo escolar</h2><p>Completa estos pasos para empezar a capturar calificaciones.</p></div><span className="badge badge-count">{complete} de {steps.length}</span></div>
      <ol className="setup-list">{steps.map((step, index) => <li key={step.title}><Link to={step.href} className="setup-step"><span className={`step-number${step.done ? ' complete' : ''}`}>{step.done ? <Icon name="check" size={18} /> : index + 1}</span><span><strong>{step.title}</strong><small>{step.done ? 'Listo' : step.text}</small></span><Icon name="chevron" size={18} /></Link></li>)}</ol></section>}
    {cycle && <>
      <section className="card overview" aria-labelledby="overview-title">
        <h2 id="overview-title" className="overview-lead"><span className="figure">{count.format(enrollments.length)}</span> {enrollments.length === 1 ? 'alumno inscrito' : 'alumnos inscritos'} en <span className="figure">{groups.length}</span> {groups.length === 1 ? 'grupo' : 'grupos'}, con <span className="figure">{teachers.length}</span> {teachers.length === 1 ? 'docente activo' : 'docentes activos'}.</h2>
        <p className="overview-lead overview-week">{now < cycle.startDate ? `El ciclo inicia el ${longDate(cycle.startDate)}.` : now > cycle.endDate ? `El ciclo terminó el ${longDate(cycle.endDate)}.` : <>Semana <span className="figure">{week}</span> de {totalWeeks} del ciclo escolar.</>}</p>
        <p className="overview-meta"><span>Ciclo escolar <strong className="nowrap">{cycle.name}</strong></span><span>Del {longDate(cycle.startDate)} al {longDate(cycle.endDate)}</span><span className="badge badge-success">Vigente</span></p>
        {periods.length > 0 && <CycleLine cycle={cycle} periods={periods} now={now} />}
      </section>
      <div className="summary-grid">
        <section className="card drawer" aria-labelledby="drawer-title">
          <header className="drawer-front">
            <div><h2 id="drawer-title">Avance de calificaciones</h2>{expected > 0 && <p><strong>{percent.format(captured / expected)}</strong> capturado: {count.format(captured)} de {count.format(expected)} calificaciones</p>}</div>
            {period && <p className="drawer-label"><strong>{period.name}</strong><span>{closingText(period, daysLeft ?? 0)}</span></p>}
            <ul className="drawer-legend" aria-label="Significado de las señales"><li className="legend-complete">Completo</li><li className="legend-progress">En captura</li><li className="legend-none">Sin iniciar</li><li className="legend-late">{open ? 'Atrasado' : 'Incompleto'}</li></ul>
          </header>
          {!period ? <div className="drawer-empty"><p>Configura los periodos de evaluación del ciclo para seguir la captura de calificaciones.</p><Link className="btn btn-secondary" to="/panel/organizacion?tab=periods">Configurar periodos</Link></div>
            : !groups.length ? <div className="drawer-empty"><p>Aún no hay grupos activos en el ciclo <span className="nowrap">{cycle.name}</span>.</p><Link className="btn btn-secondary" to="/panel/organizacion?tab=groups">Configurar grupos</Link></div>
              : <>
                <div className="edge-axis" aria-hidden="true"><span>Grupo</span><span>Docente titular</span><span className="edge-axis-scale">{[0, 0.5, 1].map((value) => <span key={value} style={{ left: `${value * 100}%` }}>{percent.format(value)}</span>)}</span><span className="edge-axis-value">Avance</span></div>
                <ul className="drawer-list">{capture.map((item) => <li key={item.group.id}><Link className="edge-row" data-state={item.state} to={gradesHref(item.group)} style={{ '--pct': `${(item.share * 100).toFixed(1)}%` } as CSSProperties}>
                  <span className="edge-index">{shortName(item.group)}</span>
                  <span className="edge-main"><strong>{item.teacher ?? 'Sin docente titular'}</strong><small>{plural(item.students, 'alumno', 'alumnos')} · {item.expected ? `${count.format(item.captured)} de ${count.format(item.expected)} calificaciones` : 'sin alumnos inscritos'}</small></span>
                  <span className="edge-scale" aria-hidden="true"><span className="scale-track" /><span className="scale-fill" /><span className="signal-rail"><span className="signal-clip" /></span></span>
                  <span className="edge-value"><strong>{item.expected ? percent.format(item.share) : '—'}</strong><span className={`badge ${badgeFor[item.state]}`}>{stateText(item.state, open)}</span></span>
                </Link></li>)}</ul>
              </>}
        </section>
        <section className="card signals" aria-labelledby="pending-title"><div className="card-heading"><h2 id="pending-title">Pendientes</h2>{pending.length > 0 && <span className="badge badge-count">{pending.length}</span>}</div>
          <ul className="signals-list">{pending.length ? pending.map((item) => <li key={item.key}><Link className="signal-item" data-state={item.state} to={item.href}><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="chevron" size={18} /></Link></li>)
            : <li><div className="signal-item" data-state="complete"><span><strong>Todo en orden</strong><small>No hay pendientes en el ciclo activo.</small></span></div></li>}</ul>
        </section>
      </div>
    </>}
  </>
}
