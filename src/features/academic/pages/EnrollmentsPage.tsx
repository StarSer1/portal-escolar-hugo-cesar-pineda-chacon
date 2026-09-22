import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { enrollStudent, withdrawEnrollment } from '@/features/academic/services/academic.service'
import type { Enrollment } from '@/types/models'
import { DataState, displayDate, EmptyState, errorMessage, fullName, groupName, matchesQuery, Modal, PageHeading, StatusBadge, today } from '../components/AcademicUI'

export function EnrollmentsPage() {
  const { data, loading, error: dataError } = useAcademic()
  const [params] = useSearchParams()
  const linkedStudent = params.get('alumno') ?? ''
  const [yearId, setYearId] = useState(data.schoolYears.find((year) => year.status === 'active')?.id ?? '')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState<'enroll' | 'withdraw' | null>(null)
  const [selected, setSelected] = useState<Enrollment | null>(null)
  const [studentId, setStudentId] = useState(linkedStudent)
  const [groupId, setGroupId] = useState('')
  const [date, setDate] = useState(today())
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const activeYear = data.schoolYears.find((year) => year.status === 'active')
  const selectedGroup = data.groups.find((group) => group.id === groupId)
  const selectedYear = data.schoolYears.find((year) => year.id === (mode === 'withdraw' ? selected?.schoolYearId : selectedGroup?.schoolYearId))
  const previous = data.enrollments.find((enrollment) => enrollment.studentId === studentId && enrollment.schoolYearId === selectedGroup?.schoolYearId && enrollment.status === 'active')
  const previousGroup = data.groups.find((group) => group.id === previous?.groupId)
  const visible = data.enrollments.filter((enrollment) => {
    const student = data.students.find((item) => item.id === enrollment.studentId)
    const group = data.groups.find((item) => item.id === enrollment.groupId)
    return (!yearId || enrollment.schoolYearId === yearId) && (!status || enrollment.status === status)
      && (!linkedStudent || enrollment.studentId === linkedStudent)
      && matchesQuery(query, student && fullName(student), student?.matricula, group && groupName(group))
  }).sort((a, b) => b.startDate.localeCompare(a.startDate))

  function open(next: 'enroll' | 'withdraw', enrollment: Enrollment | null = null) {
    setMode(next); setSelected(enrollment); setStudentId(enrollment?.studentId ?? linkedStudent)
    setGroupId(''); setDate(today()); setReason(''); setError(''); setNotice('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (mode === 'enroll' && previous && previous.groupId === groupId) { setError('El alumno ya está inscrito en ese grupo. Selecciona otro para un cambio.'); return }
    if ((mode === 'withdraw' || previous) && !reason.trim()) { setError('Escribe el motivo del movimiento.'); return }
    setBusy(true)
    try {
      if (mode === 'withdraw' && selected) {
        await withdrawEnrollment(selected.id, date, reason.trim())
        setNotice('Baja registrada. Se conservaron la inscripción y sus calificaciones en el historial.')
      } else {
        await enrollStudent({ studentId, groupId, startDate: date, reason: reason.trim() })
        setNotice(previous ? 'Cambio de grupo registrado. La inscripción anterior permanece en el historial.' : 'Alumno inscrito correctamente.')
      }
      setMode(null)
    } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false) }
  }

  return <>
    <PageHeading eyebrow="Trayectoria escolar" title="Inscripciones" description="Inscribe alumnos, gestiona cambios de grupo y conserva cada movimiento de su trayectoria." action={<button className="btn btn-primary" disabled={loading || !!dataError || !activeYear} onClick={() => open('enroll')}>+ Inscribir alumno</button>} />
    {!activeYear && <p className="info-banner">Necesitas un ciclo activo para inscribir alumnos. <Link to="/panel/organizacion?tab=years">Configurar ciclos</Link>.</p>}
    {linkedStudent && <p className="info-banner">Mostrando el expediente de {data.students.find((student) => student.id === linkedStudent)?.names ?? 'este alumno'}. <Link to="/panel/inscripciones">Ver todos los alumnos</Link>.</p>}
    {notice && <p className="success-banner" role="status">{notice}</p>}
    <DataState><section className="card">
      <div className="toolbar">
        <label className="search-field"><span className="sr-only">Buscar inscripción</span><input type="search" placeholder="Buscar alumno, matrícula o grupo…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="filter-field"><span className="sr-only">Filtrar por ciclo escolar</span><select value={yearId} onChange={(event) => setYearId(event.target.value)}><option value="">Todos los ciclos</option>{data.schoolYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
        <label className="filter-field"><span className="sr-only">Filtrar por estado de inscripción</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option><option value="active">Activa</option><option value="transferred">Cambio de grupo</option><option value="withdrawn">Baja</option></select></label>
        <span className="record-count">{visible.length} registros</span>
      </div>
      {visible.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th scope="col">Alumno</th><th scope="col">Grupo y ciclo</th><th scope="col">Vigencia</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{visible.map((enrollment) => {
        const student = data.students.find((item) => item.id === enrollment.studentId)
        const group = data.groups.find((item) => item.id === enrollment.groupId)
        const year = data.schoolYears.find((item) => item.id === enrollment.schoolYearId)
        return <tr key={enrollment.id}><td><div className="cell-stack"><strong>{student ? fullName(student) : 'Alumno no disponible'}</strong><small>{student?.matricula}</small></div></td><td><div className="cell-stack"><span>{group ? groupName(group) : 'Grupo no disponible'}</span><small>{year?.name ?? 'Ciclo no disponible'}</small></div></td><td><div className="cell-stack"><span>{displayDate(enrollment.startDate)}</span><small>{enrollment.endDate ? `Hasta ${displayDate(enrollment.endDate)}` : 'Sin fecha de cierre'}</small></div></td><td><StatusBadge value={enrollment.status} />{enrollment.reason && <small className="text-muted">{enrollment.reason}</small>}</td><td>{enrollment.status === 'active' && year?.status === 'active' ? <div className="row-actions"><button className="btn btn-small btn-secondary" onClick={() => open('enroll', enrollment)}>Cambiar grupo</button><button className="btn btn-small btn-quiet" onClick={() => open('withdraw', enrollment)}>Dar de baja</button></div> : <span className="text-muted">Histórico · solo consulta</span>}</td></tr>
      })}</tbody></table></div> : <EmptyState title="Sin inscripciones para mostrar">Registra un alumno y un grupo activo para comenzar, o revisa los filtros de consulta.</EmptyState>}
    </section></DataState>
    <p className="form-help">Un alumno tiene una sola inscripción activa por ciclo. Los cambios de grupo y las bajas conservan sus calificaciones anteriores.</p>
    {mode && <Modal title={mode === 'withdraw' ? 'Dar de baja la inscripción' : selected ? 'Cambiar de grupo' : 'Inscribir alumno'} onClose={() => setMode(null)} busy={busy}><form onSubmit={submit}>
      {mode === 'withdraw' ? <p className="info-banner">Esta acción cierra la inscripción de {data.students.find((student) => student.id === selected?.studentId)?.names ?? 'este alumno'}. No elimina su expediente ni sus calificaciones.</p> : <p className="form-help">Selecciona alumno y grupo por nombre. Los campos con * son obligatorios.</p>}
      <fieldset className="form-fieldset" disabled={busy}><div className="form-grid">
        {mode === 'enroll' && <>
          <label className="field field-full"><span>Alumno *</span><select required value={studentId} disabled={!!selected} onChange={(event) => setStudentId(event.target.value)}><option value="">Seleccionar alumno…</option>{data.students.filter((student) => student.status === 'active' || student.id === studentId).map((student) => <option key={student.id} value={student.id}>{fullName(student)} · {student.matricula}</option>)}</select></label>
          <label className="field field-full"><span>{selected ? 'Nuevo grupo' : 'Grupo'} *</span><select required value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Seleccionar grupo…</option>{data.groups.filter((group) => group.status === 'active' && group.schoolYearId === activeYear?.id && group.id !== selected?.groupId).map((group) => <option key={group.id} value={group.id}>{groupName(group)} · {activeYear?.name}</option>)}</select></label>
          {previous && <p className="info-banner field-full">Ya tiene una inscripción en {previousGroup ? groupName(previousGroup) : 'otro grupo'}. Al guardar se cerrará esa inscripción como cambio de grupo; sus calificaciones permanecerán en el grupo anterior.</p>}
        </>}
        <label className="field"><span>{mode === 'withdraw' ? 'Fecha de baja' : previous ? 'Fecha de cambio' : 'Fecha de inscripción'} *</span><input type="date" required min={mode === 'withdraw' ? selected?.startDate : previous?.startDate ?? selectedYear?.startDate} max={selectedYear?.endDate} value={date} onChange={(event) => setDate(event.target.value)} />{selectedYear && <small>Ciclo: {displayDate(selectedYear.startDate)} — {displayDate(selectedYear.endDate)}</small>}</label>
        <label className="field field-full"><span>Motivo {mode === 'withdraw' || previous ? '*' : '(opcional)'}</span><textarea rows={3} maxLength={500} required={mode === 'withdraw' || !!previous} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      </div></fieldset>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setMode(null)}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : mode === 'withdraw' ? 'Confirmar baja' : previous ? 'Confirmar cambio' : 'Guardar inscripción'}</button></div>
    </form></Modal>}
  </>
}
