import { Link, useSearchParams } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { activeOptions, displayDate, gradeOptions, groupName, PageHeading, RecordManager, specialtyLabels, specialtyOptions, StatusBadge, type FormField } from '../components/AcademicUI'

const sections = [{ key: 'years', label: 'Ciclos escolares' }, { key: 'plans', label: 'Planes de estudio' }, { key: 'subjects', label: 'Materias' }, { key: 'groups', label: 'Grupos' }, { key: 'periods', label: 'Periodos' }]

export function OrganizationPage() {
  const [params, setParams] = useSearchParams()
  const tab = sections.some((section) => section.key === params.get('tab')) ? params.get('tab') : 'years'
  return <>
    <PageHeading title="Organización escolar" description="Define la estructura del ciclo: planes, materias, grupos y periodos de evaluación." eyebrow="Configuración académica" />
    <nav className="tabs" aria-label="Secciones de organización escolar">{sections.map((section) => <button key={section.key} type="button" className={tab === section.key ? 'tab-active' : ''} aria-current={tab === section.key ? 'page' : undefined} onClick={() => setParams({ tab: section.key })}>{section.label}</button>)}</nav>
    <div className="organization-content" key={tab}>{tab === 'years' ? <YearsSection /> : tab === 'plans' ? <PlansSection /> : tab === 'subjects' ? <SubjectsSection /> : tab === 'groups' ? <GroupsSection /> : <PeriodsSection />}</div>
  </>
}

function YearsSection() {
  const { data } = useAcademic()
  return <RecordManager title="Ciclos escolares" singular="Ciclo" description="Conserva cada ciclo como parte del historial. Solo uno puede estar activo al mismo tiempo." collection="schoolYears" records={data.schoolYears.map((record) => ({ ...record }))} searchFields={['name']} fields={[
    { key: 'name', label: 'Nombre del ciclo', required: true, maxLength: 60, full: true, hint: 'Por ejemplo: 2026–2027.' },
    { key: 'startDate', label: 'Inicio del ciclo', type: 'date', required: true, immutable: true, hint: 'La fecha se conserva después del alta para proteger las inscripciones y los periodos.' },
    { key: 'endDate', label: 'Fin del ciclo', type: 'date', required: true, immutable: true, hint: 'Para un calendario distinto crea un ciclo nuevo; estas fechas no se editan.' },
    { key: 'status', label: 'Estado', type: 'select', required: true, defaultValue: data.schoolYears.some((year) => year.status === 'active') ? 'planned' : 'active', options: [{ value: 'planned', label: 'Planeado' }, { value: 'active', label: 'Activo' }, { value: 'closed', label: 'Cerrado' }], hint: 'Cerrar el ciclo bloquea nuevas inscripciones y capturas ordinarias.' },
  ]} validate={(draft, id) => {
    if (draft.endDate <= draft.startDate) return 'La fecha final debe ser posterior al inicio del ciclo.'
    if (data.schoolYears.some((year) => year.id !== id && year.name.toLocaleLowerCase() === draft.name.toLocaleLowerCase())) return 'Ya existe un ciclo con este nombre.'
    if (draft.status === 'active' && data.schoolYears.some((year) => year.id !== id && year.status === 'active')) return 'Ya hay un ciclo activo. Cierra el anterior antes de activar este.'
    const periods = data.gradingPeriods.filter((period) => period.schoolYearId === id)
    if (periods.some((period) => period.startDate < draft.startDate || period.endDate > draft.endDate)) return 'Las fechas del ciclo deben incluir todos sus periodos de evaluación.'
  }} columns={[
    { label: 'Ciclo', render: (record) => <strong>{String(record.name)}</strong> },
    { label: 'Inicio', render: (record) => displayDate(String(record.startDate)) },
    { label: 'Fin', render: (record) => displayDate(String(record.endDate)) },
    { label: 'Grupos', render: (record) => data.groups.filter((group) => group.schoolYearId === record.id).length },
    { label: 'Estado', render: (record) => <StatusBadge value={String(record.status)} /> },
  ]} emptyHint="Crea el primer ciclo con sus fechas. Después agrega el plan, los grupos y los tres periodos de evaluación." />
}

function PlansSection() {
  const { data } = useAcademic()
  return <RecordManager title="Planes de estudio" singular="Plan" description="Cada plan reúne las materias por grado. Una nueva versión permite conservar la estructura de ciclos anteriores." collection="curriculumPlans" records={data.curriculumPlans.map((record) => ({ ...record }))} searchFields={['name', 'version']} fields={[
    { key: 'name', label: 'Nombre del plan', required: true, full: true },
    { key: 'version', label: 'Versión', required: true, maxLength: 30, hint: 'Por ejemplo: 2026 o v1.' },
    { key: 'status', label: 'Estado', type: 'select', required: true, defaultValue: 'active', options: activeOptions },
  ]} validate={(draft, id) => {
    if (data.curriculumPlans.some((plan) => plan.id !== id && plan.name.toLowerCase() === draft.name.toLowerCase() && plan.version.toLowerCase() === draft.version.toLowerCase())) return 'Ya existe ese plan con la misma versión.'
    if (draft.status === 'inactive' && data.groups.some((group) => group.curriculumPlanId === id && group.status === 'active')) return 'Este plan tiene grupos activos. Inactiva sus grupos antes de archivarlo.'
  }} columns={[
    { label: 'Plan de estudios', render: (record) => <strong>{String(record.name)}</strong> },
    { label: 'Versión', render: (record) => String(record.version) },
    { label: 'Materias por grado', render: (record) => data.subjectPlans.filter((subject) => subject.curriculumPlanId === record.id).length },
    { label: 'Estado', render: (record) => <StatusBadge value={String(record.status)} /> },
  ]} emptyHint="Registra el plan que utiliza la escuela. En Materias podrás definir su contenido para los seis grados." />
}

function SubjectsSection() {
  const { data } = useAcademic()
  return <>
    {!data.curriculumPlans.length && <p className="info-banner">Primero registra un plan en la pestaña Planes de estudio.</p>}
    <RecordManager title="Materias" singular="Materia" description="Asocia cada materia con un plan, un grado y la especialidad docente que la evalúa." collection="subjectPlans" records={data.subjectPlans.map((record) => ({ ...record }))} searchFields={['name']} fields={[
      { key: 'name', label: 'Nombre de la materia', required: true, full: true },
      { key: 'curriculumPlanId', label: 'Plan de estudios', type: 'select', required: true, immutable: true, options: (draft) => data.curriculumPlans.filter((plan) => plan.status === 'active' || plan.id === draft.curriculumPlanId).map((plan) => ({ value: plan.id, label: `${plan.name} · ${plan.version}` })) },
      { key: 'grade', label: 'Grado', type: 'select', required: true, immutable: true, options: gradeOptions },
      { key: 'specialty', label: 'Especialidad responsable', type: 'select', required: true, immutable: true, options: specialtyOptions, hint: 'Plan, grado y especialidad se conservan al editar para proteger el historial.' },
      { key: 'status', label: 'Estado', type: 'select', required: true, defaultValue: 'active', options: activeOptions },
    ]} validate={(draft, id) => {
      if (data.subjectPlans.some((subject) => subject.id !== id && subject.curriculumPlanId === draft.curriculumPlanId && subject.grade === Number(draft.grade) && subject.name.toLowerCase() === draft.name.toLowerCase())) return 'Esta materia ya está registrada para ese plan y grado.'
    }} columns={[
      { label: 'Materia', render: (record) => <strong>{String(record.name)}</strong> },
      { label: 'Plan', render: (record) => data.curriculumPlans.find((plan) => plan.id === record.curriculumPlanId)?.name ?? 'Plan no disponible' },
      { label: 'Grado', render: (record) => `${String(record.grade)}°` },
      { label: 'Responsable', render: (record) => specialtyLabels[String(record.specialty)] },
      { label: 'Estado', render: (record) => <StatusBadge value={String(record.status)} /> },
    ]} emptyHint="Agrega las materias de cada grado, incluidas Educación Física, Inglés y Artes. Las de formación general pueden compartir docente." />
  </>
}

function GroupsSection() {
  const { data } = useAcademic()
  const teacherFields: FormField[] = specialtyOptions.map(({ value, label }) => ({
    key: `${value}TeacherId`, label, type: 'select', required: true,
    options: (draft) => data.teachers.filter((teacher) => teacher.specialty === value && (teacher.status === 'active' || teacher.id === draft[`${value}TeacherId`])).map((teacher) => ({ value: teacher.id, label: teacher.name })),
  }))
  return <>
    {specialtyOptions.some((specialty) => !data.teachers.some((teacher) => teacher.specialty === specialty.value && teacher.status === 'active')) && <p className="info-banner">Para crear un grupo necesitas personal activo en las cuatro especialidades. <Link to="/panel/docentes">Ir a Docentes</Link>.</p>}
    <RecordManager title="Grupos" singular="Grupo" description="Organiza a los alumnos por ciclo, grado y turno, con sus cuatro docentes responsables." collection="groups" records={data.groups.map((record) => ({ ...record }))} searchFields={['label', 'grade', 'shift']} fields={[
      { key: 'schoolYearId', label: 'Ciclo escolar', type: 'select', required: true, immutable: true, options: (draft) => data.schoolYears.filter((year) => year.status !== 'closed' || year.id === draft.schoolYearId).map((year) => ({ value: year.id, label: year.name })), defaultValue: data.schoolYears.find((year) => year.status === 'active')?.id },
      { key: 'curriculumPlanId', label: 'Plan de estudios', type: 'select', required: true, immutable: true, options: (draft) => data.curriculumPlans.filter((plan) => plan.status === 'active' || plan.id === draft.curriculumPlanId).map((plan) => ({ value: plan.id, label: `${plan.name} · ${plan.version}` })) },
      { key: 'grade', label: 'Grado', type: 'select', required: true, immutable: true, options: gradeOptions },
      { key: 'label', label: 'Clave del grupo', required: true, uppercase: true, maxLength: 20, hint: 'Por ejemplo: A o B.' },
      { key: 'shift', label: 'Turno', type: 'select', required: true, defaultValue: 'matutino', options: [{ value: 'matutino', label: 'Matutino' }, { value: 'vespertino', label: 'Vespertino' }] },
      { key: 'status', label: 'Estado', type: 'select', required: true, defaultValue: 'active', options: activeOptions },
      ...teacherFields,
    ]} validate={(draft, id) => {
      if (data.groups.some((group) => group.id !== id && group.schoolYearId === draft.schoolYearId && group.grade === Number(draft.grade) && group.label.toLowerCase() === draft.label.toLowerCase() && group.shift === draft.shift)) return 'Ya existe ese grupo en el mismo ciclo, grado y turno.'
      if (new Set(teacherFields.map((field) => draft[field.key])).size !== 4) return 'Selecciona cuatro docentes distintos, uno para cada especialidad.'
      if (draft.status === 'inactive' && data.enrollments.some((enrollment) => enrollment.groupId === id && enrollment.status === 'active' && data.schoolYears.some((year) => year.id === enrollment.schoolYearId && year.status !== 'closed'))) return 'Este grupo tiene inscripciones activas. Traslada o da de baja a los alumnos antes de inactivarlo.'
    }} columns={[
      { label: 'Grupo', render: (record) => <strong>{groupName({ grade: Number(record.grade), label: String(record.label), shift: String(record.shift) })}</strong> },
      { label: 'Ciclo', render: (record) => data.schoolYears.find((year) => year.id === record.schoolYearId)?.name ?? 'Ciclo no disponible' },
      { label: 'Docente general', render: (record) => data.teachers.find((teacher) => teacher.id === record.generalTeacherId)?.name ?? 'Sin docente' },
      { label: 'Alumnos', render: (record) => data.enrollments.filter((enrollment) => enrollment.groupId === record.id && enrollment.status === 'active').length },
      { label: 'Estado', render: (record) => <StatusBadge value={String(record.status)} /> },
    ]} emptyHint="Selecciona un ciclo, un plan de estudios y los cuatro docentes. Después podrás inscribir alumnos en el grupo." />
  </>
}

function PeriodsSection() {
  const { data } = useAcademic()
  return <RecordManager title="Periodos de evaluación" singular="Periodo" description="Configura tres periodos por ciclo. Un periodo cerrado conserva sus calificaciones y requiere motivo para una corrección administrativa." collection="gradingPeriods" records={data.gradingPeriods.map((record) => ({ ...record }))} searchFields={['name']} fields={[
    { key: 'schoolYearId', label: 'Ciclo escolar', type: 'select', required: true, immutable: true, defaultValue: data.schoolYears.find((year) => year.status === 'active')?.id, options: (draft) => data.schoolYears.filter((year) => year.status !== 'closed' || year.id === draft.schoolYearId).map((year) => ({ value: year.id, label: year.name })) },
    { key: 'order', label: 'Número de periodo', type: 'select', required: true, immutable: true, options: [1, 2, 3].map((value) => ({ value: String(value), label: `Periodo ${value}` })) },
    { key: 'name', label: 'Nombre', required: true, maxLength: 80, full: true, hint: 'Por ejemplo: Primer periodo.' },
    { key: 'startDate', label: 'Fecha inicial', type: 'date', required: true },
    { key: 'endDate', label: 'Fecha final', type: 'date', required: true },
    { key: 'status', label: 'Estado de captura', type: 'select', required: true, defaultValue: 'open', options: [{ value: 'open', label: 'Abierto' }, { value: 'closed', label: 'Cerrado' }], hint: 'El cierre es manual: las fechas por sí solas no cierran la captura.' },
  ]} validate={(draft, id) => {
    if (draft.endDate < draft.startDate) return 'La fecha final no puede ser anterior al inicio.'
    const year = data.schoolYears.find((record) => record.id === draft.schoolYearId)
    if (year && (draft.startDate < year.startDate || draft.endDate > year.endDate)) return 'El periodo debe quedar dentro de las fechas del ciclo escolar.'
    if (data.gradingPeriods.some((period) => period.id !== id && period.schoolYearId === draft.schoolYearId && period.order === Number(draft.order))) return 'Ya existe ese número de periodo en el ciclo.'
    if (data.gradingPeriods.some((period) => period.id !== id && period.schoolYearId === draft.schoolYearId && draft.startDate <= period.endDate && draft.endDate >= period.startDate)) return 'Las fechas se cruzan con otro periodo del mismo ciclo. Usa rangos separados.'
  }} columns={[
    { label: 'Periodo', render: (record) => <div className="cell-stack"><strong>{String(record.name)}</strong><small>Periodo {String(record.order)} de 3</small></div> },
    { label: 'Ciclo', render: (record) => data.schoolYears.find((year) => year.id === record.schoolYearId)?.name ?? 'Ciclo no disponible' },
    { label: 'Vigencia', render: (record) => `${displayDate(String(record.startDate))} — ${displayDate(String(record.endDate))}` },
    { label: 'Captura', render: (record) => <StatusBadge value={String(record.status)} /> },
  ]} emptyHint="Registra los periodos 1, 2 y 3 del ciclo escolar, con sus fechas y estado de captura." />
}
