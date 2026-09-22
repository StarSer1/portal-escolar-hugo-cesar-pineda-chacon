import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { saveRecord } from '@/features/academic/services/academic.service'
import { activeOptions, displayDate, EmptyState, errorMessage, fullName, groupName, Modal, RecordManager, StatusBadge, today, type FormField } from '../components/AcademicUI'

export function StudentsPage() {
  const { data } = useAcademic()
  const [selectedId, setSelectedId] = useState('')
  const fields: FormField[] = [
    { key: 'names', label: 'Nombre(s)', required: true, maxLength: 100 },
    { key: 'surnames', label: 'Apellidos', required: true, maxLength: 120 },
    { key: 'curp', label: 'CURP', required: true, uppercase: true, maxLength: 18, hint: '18 caracteres. Debe coincidir con el documento del alumno.' },
    { key: 'matricula', label: 'Matrícula', required: true, uppercase: true, maxLength: 40, hint: 'Clave interna única de la escuela: letras, números y guiones.' },
    { key: 'birthDate', label: 'Fecha de nacimiento', type: 'date', required: true, max: today() },
    { key: 'sex', label: 'Sexo registrado', type: 'select', required: true, options: [{ value: 'H', label: 'Hombre' }, { value: 'M', label: 'Mujer' }] },
    { key: 'status', label: 'Estado del expediente', type: 'select', required: true, defaultValue: 'active', options: activeOptions, hint: 'Dar de baja una inscripción se realiza desde Inscripciones.' },
  ]
  return <>
    <RecordManager title="Alumnos" singular="Alumno" description="Identidad, contactos e historial de cada estudiante, en un mismo expediente." collection="students" records={data.students.map((item) => ({ ...item }))} fields={fields} searchFields={['names', 'surnames', 'curp', 'matricula']}
      validate={(draft, id) => {
        if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(draft.curp)) return 'La CURP debe tener 18 caracteres y un formato válido.'
        if (!/^[A-Z0-9-]{1,40}$/.test(draft.matricula)) return 'La matrícula solo admite letras, números y guiones (hasta 40 caracteres).'
        if (draft.birthDate > today()) return 'La fecha de nacimiento no puede estar en el futuro.'
        if (data.students.some((student) => student.id !== id && student.curp === draft.curp)) return 'Ya existe un alumno con esta CURP. Busca su expediente para editarlo.'
        if (draft.matricula && data.students.some((student) => student.id !== id && student.matricula === draft.matricula)) return 'La matrícula ya pertenece a otro alumno.'
        if (draft.status === 'inactive' && data.enrollments.some((enrollment) => enrollment.studentId === id && enrollment.status === 'active' && data.schoolYears.some((year) => year.id === enrollment.schoolYearId && year.status !== 'closed'))) return 'Este alumno tiene una inscripción activa. Registra primero la baja en Inscripciones antes de inactivar el expediente.'
      }} columns={[
        { label: 'Alumno', render: (record) => <div className="cell-person"><span className="avatar avatar-student" aria-hidden="true">{String(record.names).charAt(0)}{String(record.surnames).charAt(0)}</span><div><strong>{String(record.names)} {String(record.surnames)}</strong><small>{String(record.matricula || 'Sin matrícula')}</small></div></div> },
        { label: 'CURP', render: (record) => <span className="text-mono">{String(record.curp)}</span> },
        { label: 'Grupo actual', render: (record) => {
          const enrollment = data.enrollments.find((item) => item.studentId === record.id && item.status === 'active' && data.schoolYears.some((year) => year.id === item.schoolYearId && year.status === 'active'))
          const group = data.groups.find((item) => item.id === enrollment?.groupId)
          return group ? groupName(group) : <span className="text-muted">Sin inscripción vigente</span>
        } },
        { label: 'Estado', render: (record) => <StatusBadge value={String(record.status)} /> },
      ]} detail={(record) => setSelectedId(record.id)} emptyHint="Registra al alumno con sus datos de identidad; después podrás vincular tutores e inscribirlo en un grupo." />
    {selectedId && <StudentRecord studentId={selectedId} onClose={() => setSelectedId('')} />}
  </>
}

function StudentRecord({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { data } = useAcademic()
  const student = data.students.find((record) => record.id === studentId)
  const [tab, setTab] = useState('summary')
  const [guardianId, setGuardianId] = useState('')
  const [relationship, setRelationship] = useState('')
  const [primary, setPrimary] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  if (!student) return null
  const links = data.studentGuardians.filter((record) => record.studentId === studentId)
  const enrollments = data.enrollments.filter((record) => record.studentId === studentId).sort((a, b) => b.startDate.localeCompare(a.startDate))
  const grades = data.grades.filter((record) => record.studentId === studentId)
  async function saveLink(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const existing = links.find((record) => record.guardianId === guardianId)
      await saveRecord('studentGuardians', { studentId, guardianId, relationship: relationship.trim(), primary, ...(existing ? { revision: existing.revision } : {}) }, existing?.id)
      setMessage('Vínculo de tutor guardado.'); setGuardianId(''); setRelationship(''); setPrimary(false)
    } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false) }
  }
  return <Modal title={fullName(student)} onClose={onClose} busy={busy} wide>
    <div className="profile-summary"><span className="avatar avatar-large avatar-student" aria-hidden="true">{student.names.charAt(0)}{student.surnames.charAt(0)}</span><div><p className="eyebrow">Expediente del alumno</p><p className="text-mono">{student.curp}</p><StatusBadge value={student.status} /></div><Link className="btn btn-secondary" to={`/panel/inscripciones?alumno=${student.id}`} onClick={onClose}>Gestionar inscripción</Link></div>
    <div className="tabs" role="tablist" aria-label="Secciones del expediente">{[{ key: 'summary', label: 'Datos y tutores' }, { key: 'history', label: 'Historial académico' }].map((item) => <button type="button" role="tab" key={item.key} aria-selected={tab === item.key} className={tab === item.key ? 'tab-active' : ''} onClick={() => setTab(item.key)}>{item.label}</button>)}</div>
    {tab === 'summary' ? <>
      <dl className="detail-grid"><div><dt>Matrícula</dt><dd>{student.matricula || 'No registrada'}</dd></div><div><dt>Nacimiento</dt><dd>{displayDate(student.birthDate)}</dd></div><div><dt>Sexo registrado</dt><dd>{student.sex === 'H' ? 'Hombre' : student.sex === 'M' ? 'Mujer' : student.sex}</dd></div><div><dt>Inscripciones históricas</dt><dd>{enrollments.length}</dd></div></dl>
      <h3>Tutores y contactos</h3>
      {links.length ? <div className="contact-list">{links.map((link) => {
        const guardian = data.guardians.find((record) => record.id === link.guardianId)
        return <article className="contact-card" key={link.id}><div><strong>{guardian?.name ?? 'Tutor no disponible'}</strong>{link.primary && <span className="badge badge-success">Contacto principal</span>}<p>{link.relationship} · {guardian?.phone || 'Sin teléfono'}</p><small>{guardian?.email || 'Sin correo'}{guardian?.status === 'inactive' ? ' · Tutor inactivo' : ''}</small></div><button type="button" className="btn btn-small btn-quiet" onClick={() => { setGuardianId(link.guardianId); setRelationship(link.relationship); setPrimary(link.primary); setMessage(''); setError('') }}>Editar vínculo</button></article>
      })}</div> : <EmptyState title="Sin tutores vinculados">Selecciona un tutor del directorio o regístralo primero en la sección Tutores.</EmptyState>}
      <form className="nested-form" onSubmit={saveLink}><h3>{links.some((link) => link.guardianId === guardianId) ? 'Editar vínculo familiar' : 'Vincular un tutor'}</h3><fieldset className="form-fieldset" disabled={busy}><div className="form-grid">
        <label className="field"><span>Tutor *</span><select required value={guardianId} onChange={(event) => { const existing = links.find((item) => item.guardianId === event.target.value); setGuardianId(event.target.value); setRelationship(existing?.relationship ?? ''); setPrimary(existing?.primary ?? links.length === 0) }}><option value="">Seleccionar tutor…</option>{data.guardians.filter((guardian) => guardian.status === 'active' || guardian.id === guardianId).map((guardian) => <option key={guardian.id} value={guardian.id}>{guardian.name}</option>)}</select></label>
        <label className="field"><span>Parentesco o relación *</span><input required maxLength={80} placeholder="Madre, padre, abuela, tutor legal…" value={relationship} onChange={(event) => setRelationship(event.target.value)} /></label>
        <label className="checkbox-field field-full"><input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} /><span>Usar como contacto principal (reemplaza al principal anterior).</span></label>
      </div></fieldset><div className="form-actions"><Link to="/panel/tutores" onClick={onClose}>Ir al directorio de tutores</Link><button className="btn btn-primary" disabled={busy || !data.guardians.length}>{busy ? 'Guardando…' : 'Guardar vínculo'}</button></div></form>
      {error && <p className="error-banner" role="alert">{error}</p>}{message && <p className="success-banner" role="status">{message}</p>}
    </> : <>
      {!enrollments.length ? <EmptyState title="El historial comienza con su primera inscripción">Las inscripciones y calificaciones del nuevo sistema se conservan aquí.</EmptyState> : enrollments.map((enrollment) => {
        const group = data.groups.find((record) => record.id === enrollment.groupId)
        const year = data.schoolYears.find((record) => record.id === enrollment.schoolYearId)
        const records = grades.filter((record) => record.enrollmentId === enrollment.id).sort((a, b) => a.periodOrder - b.periodOrder)
        return <section className="history-block" key={enrollment.id}><div className="card-heading"><div><h3>{year?.name ?? 'Ciclo no disponible'} · {group ? groupName(group) : 'Grupo no disponible'}</h3><p>{displayDate(enrollment.startDate)} — {enrollment.endDate ? displayDate(enrollment.endDate) : 'Vigente'}</p></div><StatusBadge value={enrollment.status} /></div>{enrollment.reason && <p className="text-muted">{enrollment.reason}</p>}
          {records.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Materia</th><th>Periodo</th><th>Capturada</th><th>Redondeada</th></tr></thead><tbody>{records.map((grade) => <tr key={grade.id}><td>{data.subjectPlans.find((record) => record.id === grade.subjectPlanId)?.name ?? 'Materia no disponible'}</td><td>{data.gradingPeriods.find((record) => record.id === grade.periodId)?.name ?? `Periodo ${grade.periodOrder}`}</td><td>{grade.score}</td><td><span className="grade-value">{grade.roundedScore}</span></td></tr>)}</tbody></table></div> : <p className="text-muted">Sin calificaciones registradas para esta inscripción.</p>}
        </section>
      })}
    </>}
  </Modal>
}
