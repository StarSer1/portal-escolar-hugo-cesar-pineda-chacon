import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { saveGrade } from '@/features/grades/services/grades.service'
import { useAcademic } from '@/features/academic/AcademicContext'
import { errorMessage } from '@/shared/errors'
import { Icon } from '@/shared/components/Icon'
import type { Grade } from '@/types/models'

export function GradesPage() {
  const { data } = useAcademic()
  const [yearId, setYearId] = useState(data.schoolYears.find((year) => year.status === 'active')?.id || '')
  const [groupId, setGroupId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [enrollmentId, setEnrollmentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [score, setScore] = useState('')
  const [observation, setObservation] = useState('')
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState<Grade | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const groups = data.groups.filter((item) => item.schoolYearId === yearId)
  const group = groups.find((item) => item.id === groupId)
  const periods = data.gradingPeriods.filter((item) => item.schoolYearId === yearId).sort((a, b) => a.order - b.order)
  const period = periods.find((item) => item.id === periodId)
  const subjects = data.subjectPlans.filter((item) => item.curriculumPlanId === group?.curriculumPlanId && item.grade === group.grade && (item.status === 'active' || item.id === editing?.subjectPlanId))
  const enrollments = data.enrollments.filter((item) => item.groupId === groupId && (item.status === 'active' || item.id === editing?.enrollmentId))
  const enrollment = enrollments.find((item) => item.id === enrollmentId)
  const rows = data.grades.filter((item) => item.groupId === groupId && (!periodId || item.periodId === periodId))
  const legacyGrades = data.grades.filter((item) => !data.enrollments.some((enrollment) => enrollment.id === item.enrollmentId)
    || !data.groups.some((group) => group.id === item.groupId) || !data.subjectPlans.some((subject) => subject.id === item.subjectPlanId))
  const studentName = (id: string) => { const student = data.students.find((item) => item.id === id); return student ? `${student.names} ${student.surnames}` : 'Expediente no vinculado' }
  function resetCapture() { setEditing(null); setEnrollmentId(''); setSubjectId(''); setScore(''); setObservation(''); setReason(''); setError(''); setMessage('') }
  function edit(grade: Grade) { setPeriodId(grade.periodId); setEditing(grade); setEnrollmentId(grade.enrollmentId); setSubjectId(grade.subjectPlanId); setScore(String(grade.score)); setObservation(grade.observation || ''); setReason(''); setError(''); setMessage(''); document.getElementById('grade-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
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
  return <>
    <div className="page-heading"><div><p className="eyebrow">APRENDIZAJE Y SEGUIMIENTO</p><h1>Calificaciones</h1><p className="page-description">Captura resultados y consulta el avance de cada grupo.</p></div><span className="badge badge-muted">Escala de 0 a 10</span></div>
    <section className="card"><div className="form-grid grade-filters"><label>Ciclo escolar<select value={yearId} disabled={busy} onChange={(event) => { setYearId(event.target.value); setGroupId(''); setPeriodId(''); resetCapture() }}><option value="">Selecciona un ciclo</option>{data.schoolYears.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Grupo<select value={groupId} disabled={!yearId || busy} onChange={(event) => { setGroupId(event.target.value); resetCapture() }}><option value="">Selecciona un grupo</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.grade}° {item.label} · {item.shift}</option>)}</select></label><label>Periodo de evaluación<select value={periodId} disabled={!yearId || busy} onChange={(event) => { setPeriodId(event.target.value); resetCapture() }}><option value="">Selecciona un periodo</option>{periods.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === 'open' ? 'Abierto' : 'Cerrado'}</option>)}</select></label></div></section>
    {!data.enrollments.length && <div className="notice-banner">Primero registra e inscribe a los alumnos para capturar sus calificaciones. <Link to="/panel/inscripciones">Ir a inscripciones →</Link></div>}
    {period?.status === 'closed' && <div className="notice-banner">El periodo está cerrado. Puedes corregir una calificación existente como administrador, indicando el motivo. La captura de nuevos resultados está bloqueada.</div>}
    <section className="card"><div className="card-heading"><div><h2>{editing ? 'Corregir calificación' : 'Nueva calificación'}</h2><p className="muted">{editing ? 'El valor anterior y el responsable se conservarán en el historial.' : 'Selecciona al alumno y la materia de su plan de estudios.'}</p></div><Icon name="grades" /></div><form id="grade-form" onSubmit={submit} className="form-grid">
      <label>Alumno inscrito<select required disabled={!group || !!editing || busy} value={enrollmentId} onChange={(event) => setEnrollmentId(event.target.value)}><option value="">Selecciona un alumno</option>{enrollments.map((item) => <option key={item.id} value={item.id}>{studentName(item.studentId)}{item.status !== 'active' ? ' · Histórico' : ''}</option>)}</select></label>
      <label>Materia<select required value={subjectId} disabled={!group || !!editing || busy} onChange={(event) => setSubjectId(event.target.value)}><option value="">Selecciona una materia</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Calificación<input required type="number" min="0" max="10" step="0.1" placeholder="Ej. 8.5" value={score} disabled={busy} onChange={(event) => setScore(event.target.value)} /><small className="form-help">Valor redondeado: {score !== '' && Number.isFinite(Number(score)) ? Math.round(Number(score)) : '—'}</small></label>
      <label>Observación (opcional)<textarea maxLength={1000} value={observation} disabled={busy} onChange={(event) => setObservation(event.target.value)} placeholder="Comentario sobre el resultado" /></label>
      {editing && <label className="field-full">Motivo de la corrección<textarea required maxLength={500} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label>}
      <div className="form-actions field-full">{editing && <button type="button" className="btn btn-secondary" disabled={busy} onClick={resetCapture}>Cancelar corrección</button>}<button className="btn btn-primary" disabled={busy || !group || !period || (period.status === 'closed' && !editing)}>{busy ? 'Guardando…' : editing ? 'Guardar corrección' : 'Guardar calificación'}</button></div>
    </form>{error && <p className="error-banner" role="alert">{error}</p>}{message && <p className="success-banner" role="status">{message}</p>}</section>
    <section className="card"><div className="card-heading"><div><h2>Resultados registrados</h2><p className="muted">{group ? `${group.grade}° ${group.label} · ${period?.name || 'Todos los periodos'}` : 'Selecciona un grupo para consultar sus resultados.'}</p></div><span className="badge badge-muted">{rows.length} registros</span></div>{rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Alumno</th><th>Materia</th><th>Periodo</th><th>Capturada</th><th>Redondeada</th><th>Acciones</th></tr></thead><tbody>{rows.map((grade) => <tr key={grade.id}><td>{studentName(grade.studentId)}</td><td>{data.subjectPlans.find((item) => item.id === grade.subjectPlanId)?.name || 'Materia no vinculada'}</td><td>{data.gradingPeriods.find((item) => item.id === grade.periodId)?.name || `Periodo ${grade.periodOrder}`}</td><td>{grade.score}</td><td><span className="grade-value">{grade.roundedScore}</span></td><td><button className="btn btn-small btn-secondary" disabled={busy || !data.enrollments.some((item) => item.id === grade.enrollmentId) || !data.subjectPlans.some((item) => item.id === grade.subjectPlanId)} onClick={() => edit(grade)}>Corregir</button></td></tr>)}</tbody></table></div> : <div className="empty-state compact"><Icon name="grades" size={30} /><h3>Aún no hay resultados para esta selección</h3><p>Las calificaciones guardadas aparecerán aquí.</p></div>}</section>
    {legacyGrades.length > 0 && <section className="card"><div className="card-heading"><div><h2>Registros anteriores sin vincular</h2><p className="muted">Datos conservados del prototipo, disponibles únicamente para consulta.</p></div><span className="badge badge-muted">{legacyGrades.length}</span></div>
      <p className="info-banner">Estos registros aún no tienen todas sus relaciones con expedientes, inscripciones y materias. No se eliminan ni se asignan automáticamente a un alumno. La vinculación histórica requiere una revisión administrativa.</p>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Referencia de alumno</th><th>Referencia de grupo</th><th>Periodo</th><th>Capturada</th><th>Redondeada</th></tr></thead><tbody>{legacyGrades.map((grade) => <tr key={grade.id}><td>{data.students.some((student) => student.id === grade.studentId) ? studentName(grade.studentId) : <span className="text-mono">{grade.studentId}</span>}</td><td><span className="text-mono">{grade.groupId}</span></td><td>{grade.periodOrder}</td><td>{grade.score}</td><td>{grade.roundedScore}</td></tr>)}</tbody></table></div>
    </section>}
  </>
}
