import { useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { organizationTabs } from '@/app/navigation'
import type { Column } from '@/shared/ui/DataTable'
import { Alert, PageHeader } from '@/shared/ui/Feedback'
import { TabPanel, Tabs } from '@/shared/ui/Tabs'
import { activeOptions, displayDate, gradeOptions, groupName, RecordManager, specialtyLabels, specialtyOptions, StatusBadge, type FormField, type ManagedRecord } from '../components/AcademicUI'

type Section = typeof organizationTabs[number]['value']
const descriptions: Record<Section, string> = {
  years: 'Fechas del ciclo y cuál está activo.',
  plans: 'Planes y versiones vigentes.',
  subjects: 'Materias por plan, grado y especialidad.',
  groups: 'Grupos con sus cuatro docentes.',
  periods: 'Ventanas de captura del ciclo.',
}

export function OrganizationPage() {
  const { data } = useAcademic()
  const [params, setParams] = useSearchParams()
  const tabsId = useId()
  const tab: Section = organizationTabs.some((item) => item.value === params.get('tab')) ? params.get('tab') as Section : 'years'
  const activeYear = data.schoolYears.find((year) => year.status === 'active')
  const counts: Record<Section, number> = {
    years: data.schoolYears.length,
    plans: data.curriculumPlans.length,
    subjects: data.subjectPlans.length,
    groups: data.groups.filter((group) => !activeYear || group.schoolYearId === activeYear.id).length,
    periods: data.gradingPeriods.filter((period) => !activeYear || period.schoolYearId === activeYear.id).length,
  }
  return <>
    <PageHeader title="Organización escolar" description="Define la estructura del ciclo: planes, materias, grupos y periodos de evaluación." />
    <div className="org-layout">
      <Tabs
        idBase={tabsId}
        label="Secciones de organización escolar"
        orientation="vertical"
        value={tab}
        onChange={(value) => setParams({ tab: value })}
        tabs={organizationTabs.map((item) => ({ value: item.value, label: item.label, count: counts[item.value], description: descriptions[item.value] }))}
      />
      <TabPanel idBase={tabsId} value={tab}>
        <div className="organization-content" key={tab}>
          {tab === 'years' ? <YearsSection /> : tab === 'plans' ? <PlansSection /> : tab === 'subjects' ? <SubjectsSection /> : tab === 'groups' ? <GroupsSection /> : <PeriodsSection />}
        </div>
      </TabPanel>
    </div>
  </>
}

function useCycleFilter() {
  const { data } = useAcademic()
  const activeYear = data.schoolYears.find((year) => year.status === 'active')
  return {
    key: 'cycle', label: 'Filtrar por ciclo escolar', allLabel: 'Todos los ciclos', defaultValue: activeYear?.id ?? '',
    options: data.schoolYears.map((year) => ({ value: year.id, label: `${year.name}${year.status === 'active' ? ' (activo)' : ''}` })),
    match: (record: ManagedRecord, value: string) => record.schoolYearId === value,
  }
}

function YearsSection() {
  const { data } = useAcademic()
  const columns: Column<ManagedRecord>[] = [
    { key: 'name', header: 'Ciclo', sortValue: (record) => String(record.name), cell: (record) => <strong>{String(record.name)}</strong> },
    { key: 'start', header: 'Inicio', sortValue: (record) => String(record.startDate), cell: (record) => displayDate(String(record.startDate)) },
    { key: 'end', header: 'Fin', sortValue: (record) => String(record.endDate), cell: (record) => displayDate(String(record.endDate)) },
    { key: 'groups', header: 'Grupos', align: 'end', sortValue: (record) => data.groups.filter((group) => group.schoolYearId === record.id).length, cell: (record) => data.groups.filter((group) => group.schoolYearId === record.id).length },
    { key: 'status', header: 'Estado', sortValue: (record) => String(record.status), cell: (record) => <StatusBadge value={String(record.status)} /> },
  ]
  return <RecordManager nested title="Ciclos escolares" singular="Ciclo" description="Cada ciclo se conserva como parte del historial. Solo uno puede estar activo al mismo tiempo." collection="schoolYears" records={data.schoolYears.map((record) => ({ ...record }))} searchFields={['name']} columns={columns} initialSort={{ key: 'start', direction: 'desc' }} fields={[
    { key: 'name', label: 'Nombre del ciclo', required: true, maxLength: 60, full: true, placeholder: '2026–2027', section: 'Ciclo' },
    { key: 'startDate', label: 'Inicio del ciclo', type: 'date', required: true, immutable: true, hint: 'Se conserva después del alta para proteger las inscripciones y los periodos.', section: 'Fechas' },
    { key: 'endDate', label: 'Fin del ciclo', type: 'date', required: true, immutable: true, hint: 'Para un calendario distinto crea un ciclo nuevo.', section: 'Fechas' },
    { key: 'status', label: 'Estado', type: 'select', required: true, defaultValue: data.schoolYears.some((year) => year.status === 'active') ? 'planned' : 'active', options: [{ value: 'planned', label: 'Planeado' }, { value: 'active', label: 'Activo' }, { value: 'closed', label: 'Cerrado' }], hint: 'Cerrar el ciclo bloquea nuevas inscripciones y capturas ordinarias.', section: 'Estado' },
  ]} validate={(draft, id) => {
    if (draft.endDate <= draft.startDate) return 'La fecha final debe ser posterior al inicio del ciclo.'
    if (data.schoolYears.some((year) => year.id !== id && year.name.toLocaleLowerCase() === draft.name.toLocaleLowerCase())) return 'Ya existe un ciclo con este nombre.'
    if (draft.status === 'active' && data.schoolYears.some((year) => year.id !== id && year.status === 'active')) return 'Ya hay un ciclo activo. Cierra el anterior antes de activar este.'
    const periods = data.gradingPeriods.filter((period) => period.schoolYearId === id)
    if (periods.some((period) => period.startDate < draft.startDate || period.endDate > draft.endDate)) return 'Las fechas del ciclo deben incluir todos sus periodos de evaluación.'
  }} emptyHint="Crea el primer ciclo con sus fechas. Después agrega el plan, los grupos y los tres periodos de evaluación." />
}

function PlansSection() {
  const { data } = useAcademic()
  const subjectsOf = (id: string) => data.subjectPlans.filter((subject) => subject.curriculumPlanId === id)
  const columns: Column<ManagedRecord>[] = [
    { key: 'name', header: 'Plan de estudios', sortValue: (record) => String(record.name), cell: (record) => <strong>{String(record.name)}</strong> },
    { key: 'version', header: 'Versión', sortValue: (record) => String(record.version), cell: (record) => <span className="text-mono">{String(record.version)}</span> },
    { key: 'subjects', header: 'Materias registradas', align: 'end', sortValue: (record) => subjectsOf(record.id).length, cell: (record) => subjectsOf(record.id).length },
    { key: 'grades', header: 'Grados cubiertos', cell: (record) => { const grades = Array.from(new Set(subjectsOf(record.id).map((subject) => subject.grade))).sort(); return grades.length ? `${grades.map((grade) => `${grade}°`).join(', ')}` : <span className="text-muted">Sin materias</span> } },
    { key: 'status', header: 'Estado', sortValue: (record) => String(record.status), cell: (record) => <StatusBadge value={String(record.status)} /> },
  ]
  return <RecordManager nested title="Planes de estudio" singular="Plan" description="Cada plan reúne las materias por grado. Una nueva versión conserva la estructura de ciclos anteriores." collection="curriculumPlans" records={data.curriculumPlans.map((record) => ({ ...record }))} searchFields={['name', 'version']} columns={columns} initialSort={{ key: 'name', direction: 'asc' }} fields={[
    { key: 'name', label: 'Nombre del plan', required: true, full: true },
    { key: 'version', label: 'Versión', required: true, maxLength: 30, placeholder: '2026 o v1' },
    { key: 'status', label: 'Estado', type: 'select', required: true, defaultValue: 'active', options: activeOptions },
  ]} validate={(draft, id) => {
    if (data.curriculumPlans.some((plan) => plan.id !== id && plan.name.toLowerCase() === draft.name.toLowerCase() && plan.version.toLowerCase() === draft.version.toLowerCase())) return 'Ya existe ese plan con la misma versión.'
    if (draft.status === 'inactive' && data.groups.some((group) => group.curriculumPlanId === id && group.status === 'active')) return 'Este plan tiene grupos activos. Inactiva sus grupos antes de archivarlo.'
  }} emptyHint="Registra el plan que utiliza la escuela. En Materias podrás definir su contenido para los seis grados." />
}

function SubjectsSection() {
  const { data } = useAcademic()
  const planName = (id: unknown) => data.curriculumPlans.find((plan) => plan.id === id)?.name ?? 'Plan no disponible'
  const columns: Column<ManagedRecord>[] = [
    { key: 'name', header: 'Materia', sortValue: (record) => String(record.name), cell: (record) => <strong>{String(record.name)}</strong> },
    { key: 'grade', header: 'Grado', sortValue: (record) => Number(record.grade) * 1000 + String(record.name).charCodeAt(0), cell: (record) => `${String(record.grade)}°` },
    { key: 'specialty', header: 'Responsable', sortValue: (record) => specialtyLabels[String(record.specialty)], cell: (record) => specialtyLabels[String(record.specialty)] },
    { key: 'plan', header: 'Plan', priority: 'low', cell: (record) => planName(record.curriculumPlanId) },
    { key: 'status', header: 'Estado', sortValue: (record) => String(record.status), cell: (record) => <StatusBadge value={String(record.status)} /> },
  ]
  return <>
    {!data.curriculumPlans.length && <Alert tone="info">Primero registra un plan en la sección Planes de estudio.</Alert>}
    <RecordManager nested title="Materias" singular="Materia" description="Asocia cada materia con un plan, un grado y la especialidad docente que la evalúa." collection="subjectPlans" records={data.subjectPlans.map((record) => ({ ...record }))} searchFields={['name']} columns={columns} initialSort={{ key: 'grade', direction: 'asc' }}
      filters={[
        { key: 'grade', label: 'Filtrar por grado', allLabel: 'Todos los grados', options: gradeOptions, match: (record, value) => String(record.grade) === value },
        { key: 'specialty', label: 'Filtrar por especialidad', allLabel: 'Todas las especialidades', options: specialtyOptions, match: (record, value) => record.specialty === value },
        ...(data.curriculumPlans.length > 1 ? [{ key: 'plan', label: 'Filtrar por plan', allLabel: 'Todos los planes', options: data.curriculumPlans.map((plan) => ({ value: plan.id, label: `${plan.name} · ${plan.version}` })), match: (record: ManagedRecord, value: string) => record.curriculumPlanId === value }] : []),
      ]}
      fields={[
        { key: 'name', label: 'Nombre de la materia', required: true, full: true, section: 'Materia' },
        { key: 'curriculumPlanId', label: 'Plan de estudios', type: 'select', required: true, immutable: true, options: (draft) => data.curriculumPlans.filter((plan) => plan.status === 'active' || plan.id === draft.curriculumPlanId).map((plan) => ({ value: plan.id, label: `${plan.name} · ${plan.version}` })), section: 'Ubicación en el plan' },
        { key: 'grade', label: 'Grado', type: 'select', required: true, immutable: true, options: gradeOptions, section: 'Ubicación en el plan' },
        { key: 'specialty', label: 'Especialidad responsable', type: 'select', required: true, immutable: true, options: specialtyOptions, hint: 'Plan, grado y especialidad se conservan al editar para proteger el historial.', section: 'Ubicación en el plan' },
        { key: 'status', label: 'Estado', type: 'select', required: true, defaultValue: 'active', options: activeOptions, section: 'Estado' },
      ]} validate={(draft, id) => {
        if (data.subjectPlans.some((subject) => subject.id !== id && subject.curriculumPlanId === draft.curriculumPlanId && subject.grade === Number(draft.grade) && subject.name.toLowerCase() === draft.name.toLowerCase())) return 'Esta materia ya está registrada para ese plan y grado.'
      }} emptyHint="Agrega las materias de cada grado, incluidas Educación Física, Inglés y Artes. Las de formación general pueden compartir docente." />
  </>
}

function GroupsSection() {
  const { data } = useAcademic()
  const cycleFilter = useCycleFilter()
  const teacher = (id: unknown) => data.teachers.find((item) => item.id === id)?.name
  const teacherFields: FormField[] = specialtyOptions.map(({ value, label }) => ({
    key: `${value}TeacherId`, label, type: 'select', required: true, section: 'Docentes responsables',
    options: (draft) => data.teachers.filter((item) => item.specialty === value && (item.status === 'active' || item.id === draft[`${value}TeacherId`])).map((item) => ({ value: item.id, label: item.name })),
  }))
  const columns: Column<ManagedRecord>[] = [
    { key: 'group', header: 'Grupo', sortValue: (record) => Number(record.grade) * 100 + String(record.label).charCodeAt(0), cell: (record) => <strong className="nowrap">{groupName({ grade: Number(record.grade), label: String(record.label), shift: String(record.shift) })}</strong> },
    { key: 'general', header: 'Docente general', sortValue: (record) => teacher(record.generalTeacherId) ?? '', cell: (record) => teacher(record.generalTeacherId) ?? <span className="text-muted">Sin docente</span> },
    { key: 'specialists', header: 'Especialidades', priority: 'low', cell: (record) => <dl className="mini-list"><div><dt>EF</dt><dd>{teacher(record.physicalTeacherId) ?? '—'}</dd></div><div><dt>Inglés</dt><dd>{teacher(record.englishTeacherId) ?? '—'}</dd></div><div><dt>Artes</dt><dd>{teacher(record.artsTeacherId) ?? '—'}</dd></div></dl> },
    { key: 'students', header: 'Alumnos', align: 'end', sortValue: (record) => data.enrollments.filter((enrollment) => enrollment.groupId === record.id && enrollment.status === 'active').length, cell: (record) => data.enrollments.filter((enrollment) => enrollment.groupId === record.id && enrollment.status === 'active').length },
    { key: 'cycle', header: 'Ciclo', priority: 'low', cell: (record) => <span className="nowrap">{data.schoolYears.find((year) => year.id === record.schoolYearId)?.name ?? 'Ciclo no disponible'}</span> },
    { key: 'status', header: 'Estado', sortValue: (record) => String(record.status), cell: (record) => <StatusBadge value={String(record.status)} /> },
  ]
  return <>
    {specialtyOptions.some((specialty) => !data.teachers.some((item) => item.specialty === specialty.value && item.status === 'active')) && <Alert tone="info">Para crear un grupo necesitas personal activo en las cuatro especialidades. <Link to="/panel/docentes">Ir a Docentes</Link>.</Alert>}
    <RecordManager nested title="Grupos" singular="Grupo" description="Organiza a los alumnos por ciclo, grado y turno, con sus cuatro docentes responsables." collection="groups" records={data.groups.map((record) => ({ ...record }))} searchFields={['label', 'grade', 'shift']} searchPlaceholder="Buscar grupo, grado o turno…" columns={columns} initialSort={{ key: 'group', direction: 'asc' }} filters={[cycleFilter]} fields={[
      { key: 'schoolYearId', label: 'Ciclo escolar', type: 'select', required: true, immutable: true, options: (draft) => data.schoolYears.filter((year) => year.status !== 'closed' || year.id === draft.schoolYearId).map((year) => ({ value: year.id, label: year.name })), defaultValue: data.schoolYears.find((year) => year.status === 'active')?.id, section: 'Datos del grupo' },
      { key: 'curriculumPlanId', label: 'Plan de estudios', type: 'select', required: true, immutable: true, options: (draft) => data.curriculumPlans.filter((plan) => plan.status === 'active' || plan.id === draft.curriculumPlanId).map((plan) => ({ value: plan.id, label: `${plan.name} · ${plan.version}` })), section: 'Datos del grupo' },
      { key: 'grade', label: 'Grado', type: 'select', required: true, immutable: true, options: gradeOptions, section: 'Datos del grupo' },
      { key: 'label', label: 'Clave del grupo', required: true, uppercase: true, maxLength: 20, placeholder: 'A o B', section: 'Datos del grupo' },
      { key: 'shift', label: 'Turno', type: 'select', required: true, defaultValue: 'matutino', options: [{ value: 'matutino', label: 'Matutino' }, { value: 'vespertino', label: 'Vespertino' }], section: 'Datos del grupo' },
      { key: 'status', label: 'Estado', type: 'select', required: true, defaultValue: 'active', options: activeOptions, section: 'Datos del grupo' },
      ...teacherFields,
    ]} validate={(draft, id) => {
      if (data.groups.some((group) => group.id !== id && group.schoolYearId === draft.schoolYearId && group.grade === Number(draft.grade) && group.label.toLowerCase() === draft.label.toLowerCase() && group.shift === draft.shift)) return 'Ya existe ese grupo en el mismo ciclo, grado y turno.'
      if (new Set(teacherFields.map((field) => draft[field.key])).size !== 4) return 'Selecciona cuatro docentes distintos, uno para cada especialidad.'
      if (draft.status === 'inactive' && data.enrollments.some((enrollment) => enrollment.groupId === id && enrollment.status === 'active' && data.schoolYears.some((year) => year.id === enrollment.schoolYearId && year.status !== 'closed'))) return 'Este grupo tiene inscripciones activas. Traslada o da de baja a los alumnos antes de inactivarlo.'
    }} emptyHint="Selecciona un ciclo, un plan de estudios y los cuatro docentes. Después podrás inscribir alumnos en el grupo." />
  </>
}

function PeriodsSection() {
  const { data } = useAcademic()
  const cycleFilter = useCycleFilter()
  const columns: Column<ManagedRecord>[] = [
    { key: 'name', header: 'Periodo', sortValue: (record) => `${String(record.schoolYearId)}-${String(record.order)}`, cell: (record) => <div className="cell-stack"><strong>{String(record.name)}</strong><small>Periodo {String(record.order)} de 3</small></div> },
    { key: 'dates', header: 'Vigencia', sortValue: (record) => String(record.startDate), cell: (record) => <span className="nowrap">{displayDate(String(record.startDate))} — {displayDate(String(record.endDate))}</span> },
    { key: 'cycle', header: 'Ciclo', priority: 'low', cell: (record) => data.schoolYears.find((year) => year.id === record.schoolYearId)?.name ?? 'Ciclo no disponible' },
    { key: 'status', header: 'Captura', sortValue: (record) => String(record.status), cell: (record) => <StatusBadge value={String(record.status)} /> },
  ]
  return <RecordManager nested title="Periodos de evaluación" singular="Periodo" description="Tres periodos por ciclo. Un periodo cerrado conserva sus calificaciones y requiere motivo para una corrección administrativa." collection="gradingPeriods" records={data.gradingPeriods.map((record) => ({ ...record }))} searchFields={['name']} columns={columns} initialSort={{ key: 'name', direction: 'asc' }} filters={[cycleFilter]} fields={[
    { key: 'schoolYearId', label: 'Ciclo escolar', type: 'select', required: true, immutable: true, defaultValue: data.schoolYears.find((year) => year.status === 'active')?.id, options: (draft) => data.schoolYears.filter((year) => year.status !== 'closed' || year.id === draft.schoolYearId).map((year) => ({ value: year.id, label: year.name })), section: 'Periodo' },
    { key: 'order', label: 'Número de periodo', type: 'select', required: true, immutable: true, options: [1, 2, 3].map((value) => ({ value: String(value), label: `Periodo ${value}` })), section: 'Periodo' },
    { key: 'name', label: 'Nombre', required: true, maxLength: 80, full: true, placeholder: 'Primer periodo', section: 'Periodo' },
    { key: 'startDate', label: 'Fecha inicial', type: 'date', required: true, section: 'Vigencia' },
    { key: 'endDate', label: 'Fecha final', type: 'date', required: true, section: 'Vigencia' },
    { key: 'status', label: 'Estado de captura', type: 'select', required: true, defaultValue: 'open', options: [{ value: 'open', label: 'Abierto' }, { value: 'closed', label: 'Cerrado' }], hint: 'El cierre es manual: las fechas por sí solas no cierran la captura.', section: 'Captura' },
  ]} validate={(draft, id) => {
    if (draft.endDate < draft.startDate) return 'La fecha final no puede ser anterior al inicio.'
    const year = data.schoolYears.find((record) => record.id === draft.schoolYearId)
    if (year && (draft.startDate < year.startDate || draft.endDate > year.endDate)) return 'El periodo debe quedar dentro de las fechas del ciclo escolar.'
    if (data.gradingPeriods.some((period) => period.id !== id && period.schoolYearId === draft.schoolYearId && period.order === Number(draft.order))) return 'Ya existe ese número de periodo en el ciclo.'
    if (data.gradingPeriods.some((period) => period.id !== id && period.schoolYearId === draft.schoolYearId && draft.startDate <= period.endDate && draft.endDate >= period.startDate)) return 'Las fechas se cruzan con otro periodo del mismo ciclo. Usa rangos separados.'
  }} emptyHint="Registra los periodos 1, 2 y 3 del ciclo escolar, con sus fechas y estado de captura." />
}
