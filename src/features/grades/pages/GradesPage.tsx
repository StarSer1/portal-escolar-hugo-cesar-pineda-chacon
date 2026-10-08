import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { saveGrade } from '@/features/grades/services/grades.service'
import { captureFor, captureStateLabel, captureTone, daysUntil } from '@/features/grades/capture'
import { useAcademic } from '@/features/academic/AcademicContext'
import { groupName, matchesQuery, today } from '@/features/academic/components/AcademicUI'
import { errorMessage } from '@/shared/errors'
import { Button } from '@/shared/ui/Button'
import { DataTable, type Column } from '@/shared/ui/DataTable'
import { Alert, Badge, EmptyState, PageHeader } from '@/shared/ui/Feedback'
import { Field, FilterSelect, SearchField, Toolbar } from '@/shared/ui/Field'
import type { Grade } from '@/types/models'

const percent = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 0 })

export function GradesPage() {
  const { data } = useAcademic()
  const [params] = useSearchParams()
  // Links from the summary arrive with ?grupo=…&periodo=… already chosen.
  const linkedGroup = data.groups.find((item) => item.id === params.get('grupo'))
  const linkedPeriod = data.gradingPeriods.find((item) => item.id === params.get('periodo') && item.schoolYearId === linkedGroup?.schoolYearId)
  const [yearId, setYearId] = useState(linkedGroup?.schoolYearId ?? data.schoolYears.find((year) => year.status === 'active')?.id ?? '')
  const [groupId, setGroupId] = useState(linkedGroup?.id ?? '')
  const [periodId, setPeriodId] = useState(linkedPeriod?.id ?? '')
  const [enrollmentId, setEnrollmentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [score, setScore] = useState('')
  const [observation, setObservation] = useState('')
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState<Grade | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')

  const groups = data.groups.filter((item) => item.schoolYearId === yearId).sort((a, b) => a.grade - b.grade || a.label.localeCompare(b.label))
  const group = groups.find((item) => item.id === groupId)
  const periods = data.gradingPeriods.filter((item) => item.schoolYearId === yearId).sort((a, b) => a.order - b.order)
  const period = periods.find((item) => item.id === periodId)
  const subjects = data.subjectPlans.filter((item) => item.curriculumPlanId === group?.curriculumPlanId && item.grade === group.grade && (item.status === 'active' || item.id === editing?.subjectPlanId))
  const enrollments = data.enrollments.filter((item) => item.groupId === groupId && (item.status === 'active' || item.id === editing?.enrollmentId))
  const enrollment = enrollments.find((item) => item.id === enrollmentId)
  const capture = group && period ? captureFor(data, group, period, daysUntil(period, today())) : undefined
  const studentName = (id: string) => { const student = data.students.find((item) => item.id === id); return student ? `${student.names} ${student.surnames}` : 'Expediente no vinculado' }
  const subjectName = (id: string) => data.subjectPlans.find((item) => item.id === id)?.name || 'Materia no vinculada'
  const periodName = (grade: Grade) => data.gradingPeriods.find((item) => item.id === grade.periodId)?.name || `Periodo ${grade.periodOrder}`
  const rows = data.grades.filter((item) => item.groupId === groupId && (!periodId || item.periodId === periodId))
  const visibleRows = rows.filter((item) => (!subjectFilter || item.subjectPlanId === subjectFilter) && matchesQuery(query, studentName(item.studentId)))
  const rowSubjects = Array.from(new Set(rows.map((item) => item.subjectPlanId))).map((id) => ({ value: id, label: subjectName(id) })).sort((a, b) => a.label.localeCompare(b.label, 'es'))
  const legacyGrades = data.grades.filter((item) => !data.enrollments.some((record) => record.id === item.enrollmentId)
    || !data.groups.some((record) => record.id === item.groupId) || !data.subjectPlans.some((record) => record.id === item.subjectPlanId))

  function resetCapture() { setEditing(null); setEnrollmentId(''); setSubjectId(''); setScore(''); setObservation(''); setReason(''); setError(''); setMessage('') }
  function edit(grade: Grade) {
    setPeriodId(grade.periodId); setEditing(grade); setEnrollmentId(grade.enrollmentId); setSubjectId(grade.subjectPlanId); setScore(String(grade.score)); setObservation(grade.observation || ''); setReason(''); setError(''); setMessage('')
    document.getElementById('grade-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setError('')
    if (!group || !period || !enrollment || !subjectId || score.trim() === '') { setError('Selecciona ciclo, grupo, periodo, alumno y materia.'); return }
    const existing = data.grades.find((item) => item.enrollmentId === enrollmentId && item.subjectPlanId === subjectId && item.periodId === periodId)
    if (existing && !editing) { setError('Esta calificación ya existe. Usa Corregir en la tabla para conservar el historial.'); return }
    if (editing && !reason.trim()) { setError('Escribe el motivo de la corrección.'); return }
    setBusy(true)
    try {
      const result = await saveGrade({ studentId: enrollment.studentId, enrollmentId, groupId, schoolYearId: yearId, subjectPlanId: subjectId, periodId, periodOrder: period.order, score: Number(score), observation, correctionReason: reason, expectedVersion: editing?.version ?? 0 })
      resetCapture(); setMessage(`Calificación guardada correctamente: ${result.roundedScore}.`)
    } catch (caught) { setError(errorMessage(caught)) }
    finally { setBusy(false) }
  }

  const columns: Column<Grade>[] = [
    { key: 'student', header: 'Alumno', sortValue: (grade) => studentName(grade.studentId), cell: (grade) => <strong className="cell-name">{studentName(grade.studentId)}</strong> },
    { key: 'subject', header: 'Materia', sortValue: (grade) => subjectName(grade.subjectPlanId), cell: (grade) => subjectName(grade.subjectPlanId) },
    // The period column is redundant once the toolbar above pins one period.
    ...(periodId ? [] : [{ key: 'period', header: 'Periodo', priority: 'low' as const, sortValue: (grade: Grade) => grade.periodOrder, cell: (grade: Grade) => <span className="nowrap">{periodName(grade)}</span> }]),
    { key: 'score', header: 'Capturada', align: 'end', sortValue: (grade) => grade.score, cell: (grade) => <span className="tabular">{grade.score}</span> },
    { key: 'rounded', header: 'Redondeada', align: 'end', sortValue: (grade) => grade.roundedScore, cell: (grade) => <span className="grade-value">{grade.roundedScore}</span> },
  ]

  return <>
    <PageHeader title="Calificaciones" description="Captura resultados por grupo y periodo, y consulta lo registrado." actions={<Badge tone="count">Escala de 0 a 10</Badge>} />
    <section className="card context-bar" aria-label="Selección de ciclo, grupo y periodo">
      <div className="context-fields">
        <Field label="Ciclo escolar">
          <select value={yearId} disabled={busy} onChange={(event) => { setYearId(event.target.value); setGroupId(''); setPeriodId(''); resetCapture() }}>
            <option value="">Selecciona un ciclo</option>
            {data.schoolYears.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Grupo">
          <select value={groupId} disabled={!yearId || busy} onChange={(event) => { setGroupId(event.target.value); resetCapture() }}>
            <option value="">Selecciona un grupo</option>
            {groups.map((item) => <option key={item.id} value={item.id}>{item.grade}° {item.label} · {item.shift}</option>)}
          </select>
        </Field>
        <Field label="Periodo de evaluación">
          <select value={periodId} disabled={!yearId || busy} onChange={(event) => { setPeriodId(event.target.value); resetCapture() }}>
            <option value="">Selecciona un periodo</option>
            {periods.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === 'open' ? 'Abierto' : 'Cerrado'}</option>)}
          </select>
        </Field>
      </div>
      {group && <div className="context-summary">
        {capture ? <>
          <div className="context-progress" data-state={capture.state} style={{ '--pct': `${(capture.share * 100).toFixed(1)}%` } as CSSProperties}>
            <span className="context-progress-label"><strong>{capture.expected ? percent.format(capture.share) : '—'}</strong> capturado · {capture.captured} de {capture.expected} calificaciones del {period!.name.toLowerCase()}</span>
            <span className="edge-scale" aria-hidden="true"><span className="scale-track" /><span className="scale-fill" /><span className="signal-rail"><span className="signal-clip" /></span></span>
          </div>
          <Badge tone={captureTone[capture.state]}>{captureStateLabel(capture, period!.status === 'open')}</Badge>
        </> : <p className="text-muted">Elige un periodo para ver el avance de captura de {groupName(group)}.</p>}
      </div>}
    </section>
    {!data.enrollments.length && <Alert tone="warning">Primero registra e inscribe a los alumnos para capturar sus calificaciones. <Link to="/panel/inscripciones">Ir a inscripciones</Link>.</Alert>}
    {period?.status === 'closed' && <Alert tone="warning">El periodo está cerrado. Puedes corregir una calificación existente como administrador, indicando el motivo. La captura de nuevos resultados está bloqueada.</Alert>}
    {!group ? <section className="card"><EmptyState icon="grades" title="Elige un grupo para empezar">Selecciona el ciclo, el grupo y el periodo. Aquí podrás capturar resultados y consultar lo registrado.</EmptyState></section>
      : <div className="grades-layout">
        <section className={`card capture-card${editing ? ' is-editing' : ''}`} aria-labelledby="capture-title">
          <div className="card-heading"><div><h2 id="capture-title">{editing ? 'Corregir calificación' : 'Nueva calificación'}</h2><p>{editing ? 'El valor anterior y el responsable se conservarán en el historial.' : 'Todos los campos son obligatorios salvo la observación.'}</p></div></div>
          <form id="grade-form" onSubmit={submit} className="form-grid capture-form">
            <Field label="Alumno inscrito" full>
              <select required disabled={!group || !!editing || busy} value={enrollmentId} onChange={(event) => setEnrollmentId(event.target.value)}>
                <option value="">Selecciona un alumno</option>
                {enrollments.map((item) => <option key={item.id} value={item.id}>{studentName(item.studentId)}{item.status !== 'active' ? ' · Histórico' : ''}</option>)}
              </select>
            </Field>
            <Field label="Materia" full>
              <select required value={subjectId} disabled={!group || !!editing || busy} onChange={(event) => setSubjectId(event.target.value)}>
                <option value="">Selecciona una materia</option>
                {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="Calificación" full hint={`Escala de 0 a 10. Valor redondeado: ${score !== '' && Number.isFinite(Number(score)) ? Math.round(Number(score)) : '—'}`}>
              <input required type="number" min="0" max="10" step="0.1" placeholder="Ej. 8.5" inputMode="decimal" className="score-input" value={score} disabled={busy} onChange={(event) => setScore(event.target.value)} />
            </Field>
            <Field label="Observación (opcional)" full>
              <textarea maxLength={1000} value={observation} disabled={busy} onChange={(event) => setObservation(event.target.value)} placeholder="Comentario sobre el resultado" />
            </Field>
            {editing && <Field label="Motivo de la corrección" full>
              <textarea required maxLength={500} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} />
            </Field>}
            <div className="form-actions field-full">
              {editing && <Button disabled={busy} onClick={resetCapture}>Cancelar corrección</Button>}
              <Button type="submit" variant="primary" loading={busy} disabled={!group || !period || (period.status === 'closed' && !editing)}>{busy ? 'Guardando…' : editing ? 'Guardar corrección' : 'Guardar calificación'}</Button>
            </div>
          </form>
          {error && <Alert tone="error" role="alert">{error}</Alert>}
          {message && <Alert tone="success" role="status">{message}</Alert>}
        </section>
        <section className="card table-card" aria-labelledby="results-title">
          <div className="card-heading"><div><h2 id="results-title">Resultados registrados</h2><p>{groupName(group)} · {period?.name || 'Todos los periodos'}</p></div></div>
          {rows.length > 0 && <Toolbar count={`${visibleRows.length} ${visibleRows.length === 1 ? 'registro' : 'registros'}`}>
            <SearchField label="Buscar alumno en resultados" placeholder="Buscar alumno…" value={query} onChange={setQuery} />
            {rowSubjects.length > 1 && <FilterSelect label="Filtrar por materia" allLabel="Todas las materias" options={rowSubjects} value={subjectFilter} onChange={setSubjectFilter} />}
          </Toolbar>}
          <DataTable
            caption="Resultados registrados"
            rows={visibleRows}
            columns={columns}
            rowKey={(grade) => grade.id}
            initialSort={{ key: 'student', direction: 'asc' }}
            resetKey={[groupId, periodId, query, subjectFilter].join('|')}
            actions={(grade) => <Button size="sm" icon="pencil" disabled={busy || !data.enrollments.some((item) => item.id === grade.enrollmentId) || !data.subjectPlans.some((item) => item.id === grade.subjectPlanId)} onClick={() => edit(grade)}>Corregir</Button>}
            empty={<EmptyState compact icon={rows.length ? 'search' : 'grades'} title={rows.length ? 'Sin coincidencias' : 'Aún no hay resultados para esta selección'}>{rows.length ? 'Cambia la búsqueda o la materia.' : 'Las calificaciones guardadas aparecerán aquí.'}</EmptyState>}
          />
        </section>
      </div>}
    {legacyGrades.length > 0 && <section className="card table-card" aria-labelledby="legacy-title">
      <div className="card-heading"><div><h2 id="legacy-title">Registros anteriores sin vincular</h2><p>Datos conservados del prototipo, disponibles únicamente para consulta.</p></div><Badge tone="count">{legacyGrades.length}</Badge></div>
      <Alert tone="info">Estos registros aún no tienen todas sus relaciones con expedientes, inscripciones y materias. No se eliminan ni se asignan automáticamente a un alumno. La vinculación histórica requiere una revisión administrativa.</Alert>
      <DataTable
        caption="Registros anteriores sin vincular"
        rows={legacyGrades}
        rowKey={(grade) => grade.id}
        columns={[
          { key: 'student', header: 'Referencia de alumno', cell: (grade) => data.students.some((student) => student.id === grade.studentId) ? studentName(grade.studentId) : <span className="text-mono">{grade.studentId}</span> },
          { key: 'group', header: 'Referencia de grupo', cell: (grade) => <span className="text-mono">{grade.groupId}</span> },
          { key: 'period', header: 'Periodo', align: 'end', cell: (grade) => grade.periodOrder },
          { key: 'score', header: 'Capturada', align: 'end', cell: (grade) => grade.score },
          { key: 'rounded', header: 'Redondeada', align: 'end', cell: (grade) => grade.roundedScore },
        ]}
        empty={null}
      />
    </section>}
  </>
}
