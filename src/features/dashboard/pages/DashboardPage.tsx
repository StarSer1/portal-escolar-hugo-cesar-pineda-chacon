import { Link } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { Icon } from '@/shared/components/Icon'

export function DashboardPage() {
  const { data } = useAcademic()
  const cycle = data.schoolYears.find((year) => year.status === 'active')
  const groups = data.groups.filter((group) => group.schoolYearId === cycle?.id && group.status === 'active')
  const enrollments = data.enrollments.filter((item) => item.schoolYearId === cycle?.id && item.status === 'active')
  const periods = data.gradingPeriods.filter((item) => item.schoolYearId === cycle?.id).sort((a, b) => a.order - b.order)
  const date = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const steps = [
    { title: 'Organiza el ciclo escolar', text: 'Define fechas, plan, materias y periodos.', done: !!cycle && periods.length > 0 && data.subjectPlans.length > 0, href: '/panel/organizacion' },
    { title: 'Integra el equipo docente', text: 'General, Educación Física, Inglés y Artes.', done: ['general','physical','english','arts'].every((s) => data.teachers.some((t) => t.specialty === s && t.status === 'active')), href: '/panel/docentes' },
    { title: 'Forma tus grupos', text: 'Relaciona el ciclo, el plan y los cuatro docentes.', done: groups.length > 0, href: '/panel/organizacion?tab=groups' },
    { title: 'Inscribe a tus alumnos', text: 'Completa el expediente y asigna un grupo.', done: enrollments.length > 0, href: '/panel/inscripciones' },
  ]
  const complete = steps.filter((s) => s.done).length
  return <>
    <div className="page-heading"><div><p className="eyebrow">TU ESCUELA, EN UN SOLO LUGAR</p><h1>Resumen académico</h1><p className="page-description date-label">{date}</p></div><Link className="btn btn-primary" to="/panel/alumnos"><Icon name="plus" size={18} /> Registrar alumno</Link></div>
    <section className="welcome-banner"><div><span className="banner-tag">{cycle ? `Ciclo ${cycle.name}` : 'Comencemos juntos'}</span><h2>Cada alumno cuenta.<br />Cada avance también.</h2><p>Administra los expedientes, organiza tus grupos<br className="desktop-break" /> y acompaña el aprendizaje de tu comunidad.</p><Link to="/panel/calificaciones">Ir a calificaciones <Icon name="arrow" size={17} /></Link></div><div className="banner-art" aria-hidden="true"><span className="art-circle" /><div className="art-card"><Icon name="book" size={48} /><i /><i /><i /></div><div className="art-check"><Icon name="check" size={24} /></div><span className="art-spark">✦</span></div></section>
    <div className="stats-grid">{[
      { label: 'Alumnos inscritos', count: enrollments.length, detail: 'En el ciclo activo', icon: 'students', color: 'green' },
      { label: 'Grupos activos', count: groups.length, detail: 'Organización escolar', icon: 'grid', color: 'blue' },
      { label: 'Docentes', count: data.teachers.filter((t) => t.status === 'active').length, detail: 'En el equipo académico', icon: 'book', color: 'gold' },
      { label: 'Calificaciones', count: data.grades.filter((g) => g.schoolYearId === cycle?.id).length, detail: 'Registradas en este ciclo', icon: 'grades', color: 'purple' },
    ].map((stat) => <article className="card stat-card" key={stat.label}><div><p>{stat.label}</p><strong>{stat.count}</strong><small>{stat.detail}</small></div><span className={`stat-icon ${stat.color}`}><Icon name={stat.icon} size={22} /></span></article>)}</div>
    <div className="dashboard-columns"><section className="card"><div className="card-heading"><div><h2>{complete === 4 ? 'Tu organización está lista' : 'Prepara tu ciclo escolar'}</h2><p className="muted">Un buen inicio para todo el equipo.</p></div><span className="badge badge-success">{complete} de 4</span></div><div className="progress-track"><span style={{ width: `${complete * 25}%` }} /></div><div className="setup-list">{steps.map((step, index) => <Link key={step.title} to={step.href} className="setup-step"><span className={`step-number ${step.done ? 'complete' : ''}`}>{step.done ? <Icon name="check" size={16} /> : `0${index + 1}`}</span><div><strong>{step.title}</strong><small>{step.text}</small></div><Icon name="arrow" size={17} /></Link>)}</div></section>
    <section className="card"><div className="card-heading"><div><h2>Periodos de evaluación</h2><p className="muted">{cycle?.name || 'Sin ciclo activo'}</p></div><Icon name="calendar" /></div>{periods.length ? <div className="period-list">{periods.map((period) => <div className="period-row" key={period.id}><div><strong>{period.name}</strong><small>{period.startDate} — {period.endDate}</small></div><span className={`badge ${period.status === 'open' ? 'badge-success' : 'badge-muted'}`}>{period.status === 'open' ? 'Abierto' : 'Cerrado'}</span></div>)}</div> : <div className="empty-state compact"><Icon name="calendar" size={30} /><h3>Tu calendario empieza aquí</h3><p>Configura las fechas de evaluación del ciclo.</p></div>}<Link className="card-link" to="/panel/organizacion?tab=periods">Administrar periodos <Icon name="arrow" size={16} /></Link></section></div>
    <section className="card"><div className="card-heading"><div><h2>Grupos del ciclo</h2><p className="muted">Una vista rápida de tu comunidad escolar.</p></div><Link to="/panel/inscripciones" className="text-link">Ver inscripciones →</Link></div>{groups.length ? <div className="group-grid">{groups.map((group) => <Link to="/panel/inscripciones" className="group-summary" key={group.id}><span className="group-monogram">{group.grade}°</span><div><strong>{group.grade}° {group.label}</strong><small>{enrollments.filter((item) => item.groupId === group.id).length} alumnos · {group.shift}</small></div><Icon name="arrow" size={16} /></Link>)}</div> : <div className="empty-state compact"><p>Aún no hay grupos en el ciclo activo.</p><Link to="/panel/organizacion?tab=groups" className="btn btn-secondary">Configurar grupos</Link></div>}</section>
  </>
}
