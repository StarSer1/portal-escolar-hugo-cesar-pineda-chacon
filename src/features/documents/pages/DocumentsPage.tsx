import { useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcademic, useGrades } from '@/features/academic/AcademicContext'
import { groupName, today } from '@/features/academic/components/AcademicUI'
import { errorMessage } from '@/shared/errors'
import { Button } from '@/shared/ui/Button'
import { Alert, Badge, EmptyState, PageHeader } from '@/shared/ui/Feedback'
import { Field } from '@/shared/ui/Field'
import { SegmentedControl, TabPanel, Tabs } from '@/shared/ui/Tabs'
import { enrollmentHtml, reportCardsHtml, type Orientation } from '../printHtml'
import { PrintPreview, YearAndGroup } from './DocumentPreview'
import { ALL, DEFAULT_DIRECTOR, DIRECTOR_KEY, useRemembered } from '../preferences'
import { CommitmentLetterTab } from './CommitmentLetterTab'
import { SchedulesTab } from './SchedulesTab'
import { buildEnrollmentReport, buildReportCard, groupStudents, officialSchool, sortGroups, unmappedSubjects, WATERMARK } from '../reports'

type DocumentTab = 'boletas' | 'inscripcion' | 'carta' | 'horarios'
const tabs = [
  { value: 'boletas' as const, label: 'Boletas de evaluación', description: 'Por alumno o grupo completo' },
  { value: 'inscripcion' as const, label: 'Listado de inscripción', description: 'Listado oficial y estadística' },
  { value: 'carta' as const, label: 'Carta compromiso', description: 'Por alumno, con sus tutores' },
  { value: 'horarios' as const, label: 'Horarios de especialistas', description: 'Editable por la dirección' },
]

function ReportCardsTab({ yearId, setYearId }: { yearId: string; setYearId: (id: string) => void }) {
  const { data } = useAcademic()
  const [groupId, setGroupId] = useState('')
  const [studentId, setStudentId] = useState(ALL)
  const [orientation, setOrientation] = useRemembered('boleta.orientacion', 'landscape') as [Orientation, (value: Orientation) => void]
  const [director, setDirector] = useRemembered(DIRECTOR_KEY, DEFAULT_DIRECTOR)
  const [place, setPlace] = useRemembered('boleta.lugar', officialSchool.place)
  const [date, setDate] = useState(today())
  const { grades, loading, error } = useGrades({ schoolYearId: yearId })
  const year = data.schoolYears.find((item) => item.id === yearId)
  const groups = sortGroups(data.groups.filter((item) => item.schoolYearId === yearId))
  const group = groups.find((item) => item.id === groupId)
  const students = group ? groupStudents(data, group) : []
  const chosen = studentId === ALL ? students : students.filter((student) => student.id === studentId)
  const missing = group ? unmappedSubjects(data, group) : []
  const periods = data.gradingPeriods.filter((item) => item.schoolYearId === yearId)
  const html = useMemo(() => year && group && chosen.length
    ? reportCardsHtml(chosen.map((student) => buildReportCard(data, grades, student, group, year)), { orientation, director, place, date })
    : '', [data, grades, year, group, chosen, orientation, director, place, date])

  return <>
    <section className="card">
      <div className="card-heading"><div><h2>Datos de la boleta</h2><p>Cada campo formativo promedia las calificaciones de sus materias en el periodo.</p></div></div>
      <div className="form-grid">
        <YearAndGroup years={data.schoolYears} yearId={yearId} onYear={(id) => { setYearId(id); setGroupId(''); setStudentId(ALL) }} groups={groups} groupId={groupId} onGroup={(id) => { setGroupId(id); setStudentId(ALL) }} />
        <Field label="Alumno">
          <select value={studentId} disabled={!group} onChange={(event) => setStudentId(event.target.value)}>
            <option value={ALL}>Todo el grupo ({students.length} {students.length === 1 ? 'alumno' : 'alumnos'})</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.surnames} {student.names}</option>)}
          </select>
        </Field>
        <div className="field">
          <span className="field-label">Formato de hoja</span>
          <SegmentedControl label="Formato de hoja" value={orientation} onChange={setOrientation} options={[{ value: 'landscape', label: 'Horizontal' }, { value: 'portrait', label: 'Vertical' }]} />
        </div>
        <Field label="Nombre de la directora o del director" hint="Se recuerda en esta computadora.">
          <input value={director} maxLength={120} onChange={(event) => setDirector(event.target.value)} placeholder="Nombre completo" />
        </Field>
        <Field label="Lugar de expedición">
          <input value={place} maxLength={120} onChange={(event) => setPlace(event.target.value)} />
        </Field>
        <Field label="Fecha de expedición">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
      </div>
    </section>
    {WATERMARK && <Alert tone="info">Las boletas se generan con la marca de agua «{WATERMARK}» mientras el sistema está en etapa de prueba. Asistencias, folio y lengua indígena quedan en blanco para llenarse a mano.</Alert>}
    {error && <Alert tone="error" role="alert">No se pudieron consultar las calificaciones: {error}</Alert>}
    {loading && <p className="text-muted" role="status">Consultando las calificaciones del ciclo…</p>}
    {year && periods.length < 3 && <Alert tone="warning">El ciclo tiene {periods.length} de 3 periodos de evaluación registrados. Los periodos faltantes aparecen vacíos.</Alert>}
    {missing.length > 0 && <Alert tone="warning">Estas materias no tienen campo formativo y no aparecen en la boleta: {missing.map((subject) => subject.name).join(', ')}. <Link to="/panel/organizacion?tab=subjects">Asígnalo en Materias</Link>.</Alert>}
    {!group ? <section className="card"><EmptyState icon="file" title="Elige un grupo">Selecciona el ciclo y el grupo para ver sus boletas.</EmptyState></section>
      : !students.length ? <section className="card"><EmptyState icon="students" title="Sin alumnos inscritos">Este grupo no tiene inscripciones activas.</EmptyState></section>
        : <PrintPreview html={html} title={`${chosen.length === 1 ? 'Boleta de' : `${chosen.length} boletas de`} ${groupName(group)}`} label="Imprimir o guardar PDF" />}
  </>
}

function EnrollmentTab({ yearId, setYearId }: { yearId: string; setYearId: (id: string) => void }) {
  const { data } = useAcademic()
  const [groupId, setGroupId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { grades } = useGrades({ schoolYearId: yearId })
  const year = data.schoolYears.find((item) => item.id === yearId)
  const groups = sortGroups(data.groups.filter((item) => item.schoolYearId === yearId))
  const general = groupId === ALL
  const chosen = general ? groups : groups.filter((item) => item.id === groupId)
  const reports = useMemo(() => year ? chosen.map((group) => buildEnrollmentReport(data, grades, group, year)) : [], [data, grades, year, chosen])
  const html = useMemo(() => reports.length ? enrollmentHtml(reports, general) : '', [reports, general])
  const students = reports.reduce((sum, report) => sum + report.rows.length, 0)

  async function downloadExcel() {
    setBusy(true); setError('')
    try {
      const { enrollmentFileName, enrollmentWorkbook } = await import('../enrollmentExcel')
      const blob = await enrollmentWorkbook(reports, general)
      const url = URL.createObjectURL(blob)
      const link = Object.assign(document.createElement('a'), { href: url, download: enrollmentFileName(reports, general) })
      document.body.append(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (caught) { setError(errorMessage(caught)) }
    finally { setBusy(false) }
  }

  return <>
    <section className="card">
      <div className="card-heading">
        <div><h2>Listado oficial de inscripción</h2><p>Listado del grupo y registro estadístico por edad y sexo. Las edades se calculan al 30 de septiembre del inicio del ciclo.</p></div>
        {reports.length > 0 && <Badge tone="count">{students} {students === 1 ? 'alumno' : 'alumnos'}</Badge>}
      </div>
      <div className="form-grid">
        <YearAndGroup years={data.schoolYears} yearId={yearId} onYear={(id) => { setYearId(id); setGroupId('') }} groups={groups} groupId={groupId} onGroup={setGroupId} allLabel="Todos los grupos (general)" />
      </div>
      {reports.length > 0 && <div className="form-actions">
        <Button icon="download" loading={busy} onClick={downloadExcel}>{busy ? 'Generando Excel…' : 'Descargar Excel'}</Button>
      </div>}
      {error && <Alert tone="error" role="alert">No se pudo generar el Excel: {error}</Alert>}
    </section>
    {!groupId || !reports.length ? <section className="card"><EmptyState icon="enroll" title={yearId && !groups.length ? 'Este ciclo no tiene grupos' : 'Elige un grupo'}>Selecciona un grupo o «Todos los grupos» para el concentrado general con una hoja por grupo.</EmptyState></section>
      : <PrintPreview html={html} title={general ? `Inscripción general · ${reports.length} grupos` : `Inscripción de ${groupName(chosen[0])}`} label="Imprimir o guardar PDF" />}
  </>
}

export function DocumentsPage() {
  const { data } = useAcademic()
  const [params, setParams] = useSearchParams()
  const id = useId()
  const tab: DocumentTab = tabs.find((item) => item.value === params.get('tab'))?.value ?? 'boletas'
  const [yearId, setYearId] = useState(data.schoolYears.find((year) => year.status === 'active')?.id ?? '')
  return <>
    <PageHeader title="Documentos oficiales" description="Genera boletas, listados de inscripción, cartas compromiso y horarios con la información registrada." />
    <Tabs idBase={id} label="Tipo de documento" tabs={tabs} value={tab} onChange={(value) => setParams(value === 'boletas' ? {} : { tab: value }, { replace: true })} />
    <TabPanel idBase={id} value={tab}>
      <div className="stack">
        {tab === 'boletas' && <ReportCardsTab yearId={yearId} setYearId={setYearId} />}
        {tab === 'inscripcion' && <EnrollmentTab yearId={yearId} setYearId={setYearId} />}
        {tab === 'carta' && <CommitmentLetterTab yearId={yearId} setYearId={setYearId} />}
        {tab === 'horarios' && <SchedulesTab />}
      </div>
    </TabPanel>
  </>
}
