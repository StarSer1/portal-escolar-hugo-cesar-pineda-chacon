import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { saveRecord } from '@/features/academic/services/academic.service'
import { Button, ButtonLink } from '@/shared/ui/Button'
import type { Column } from '@/shared/ui/DataTable'
import { Alert, Badge, EmptyState } from '@/shared/ui/Feedback'
import { CheckboxField, Field } from '@/shared/ui/Field'
import { Modal } from '@/shared/ui/Modal'
import { TabPanel, Tabs } from '@/shared/ui/Tabs'
import type { AcademicData, Enrollment, Student } from '@/types/models'
import { activeOptions, displayDate, errorMessage, fullName, groupName, initials, RecordManager, StatusBadge, today, type FormField, type ManagedRecord } from '../components/AcademicUI'

/** The active-cycle enrollment of a student, if any. */
function currentEnrollment(data: AcademicData, studentId: string) {
  return data.enrollments.find((item) => item.studentId === studentId && item.status === 'active' && data.schoolYears.some((year) => year.id === item.schoolYearId && year.status === 'active'))
}
function ageOf(birthDate: string) {
  if (!birthDate) return undefined
  const now = new Date(`${today()}T12:00:00`)
  const birth = new Date(`${birthDate}T12:00:00`)
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1
  return age
}

export function StudentsPage() {
  const { data } = useAcademic()
  const [selectedId, setSelectedId] = useState('')
  const groupOf = (id: string) => data.groups.find((item) => item.id === currentEnrollment(data, id)?.groupId)
  const primaryGuardian = (id: string) => {
    const link = data.studentGuardians.find((item) => item.studentId === id && item.primary) ?? data.studentGuardians.find((item) => item.studentId === id)
    return data.guardians.find((item) => item.id === link?.guardianId)
  }
  const activeYear = data.schoolYears.find((year) => year.status === 'active')
  const groupOptions = data.groups.filter((group) => group.schoolYearId === activeYear?.id).sort((a, b) => a.grade - b.grade || a.label.localeCompare(b.label)).map((group) => ({ value: group.id, label: groupName(group) }))

  const fields: FormField[] = [
    { key: 'names', label: 'Nombre(s)', required: true, maxLength: 100, section: 'Identidad' },
    { key: 'surnames', label: 'Apellidos', required: true, maxLength: 120, section: 'Identidad' },
    { key: 'birthDate', label: 'Fecha de nacimiento', type: 'date', required: true, max: today(), section: 'Identidad' },
    { key: 'sex', label: 'Sexo registrado', type: 'select', required: true, options: [{ value: 'H', label: 'Hombre' }, { value: 'M', label: 'Mujer' }], section: 'Identidad' },
    { key: 'curp', label: 'CURP', required: true, uppercase: true, maxLength: 18, placeholder: '18 caracteres', hint: 'Debe coincidir con el documento del alumno.', section: 'Identificadores oficiales' },
    { key: 'matricula', label: 'Matrícula', required: true, uppercase: true, maxLength: 40, hint: 'Clave interna única de la escuela: letras, números y guiones.', section: 'Identificadores oficiales' },
    { key: 'status', label: 'Estado del expediente', type: 'select', required: true, defaultValue: 'active', options: activeOptions, hint: 'La baja de una inscripción se registra desde Inscripciones.', section: 'Expediente' },
  ]
  const columns: Column<ManagedRecord>[] = [
    {
      key: 'student', header: 'Alumno', sortValue: (record) => `${String(record.surnames)} ${String(record.names)}`,
      cell: (record) => <div className="cell-person">
        <span className="avatar avatar-student" aria-hidden="true">{String(record.names).charAt(0)}{String(record.surnames).charAt(0)}</span>
        <div><strong>{String(record.names)} {String(record.surnames)}</strong><small className="text-mono">{String(record.matricula || 'Sin matrícula')}</small></div>
      </div>,
    },
    { key: 'curp', header: 'CURP', sortValue: (record) => String(record.curp), cell: (record) => <span className="text-mono">{String(record.curp)}</span> },
    {
      key: 'group', header: 'Grupo actual', sortValue: (record) => { const group = groupOf(record.id); return group ? group.grade * 100 + group.label.charCodeAt(0) : 999 },
      cell: (record) => { const group = groupOf(record.id); return group ? <span className="nowrap">{groupName(group)}</span> : <span className="text-muted">Sin inscripción vigente</span> },
    },
    {
      key: 'guardian', header: 'Tutor principal', priority: 'low',
      cell: (record) => { const guardian = primaryGuardian(record.id); return guardian ? <div className="cell-stack"><span>{guardian.name}</span><small>{guardian.phone || 'Sin teléfono'}</small></div> : <span className="text-muted">Sin tutor vinculado</span> },
    },
    { key: 'status', header: 'Estado', sortValue: (record) => String(record.status), cell: (record) => <StatusBadge value={String(record.status)} /> },
  ]

  return <>
    <RecordManager
      title="Alumnos" singular="Alumno" description="Identidad, contactos e historial de cada estudiante, en un mismo expediente."
      collection="students" records={data.students.map((item) => ({ ...item }))} fields={fields} columns={columns}
      searchFields={['names', 'surnames', 'curp', 'matricula']} searchPlaceholder="Buscar por nombre, CURP o matrícula…"
      initialSort={{ key: 'student', direction: 'asc' }}
      filters={[{
        key: 'group', label: 'Filtrar por grupo', allLabel: 'Todos los grupos',
        options: [...groupOptions, { value: 'none', label: 'Sin inscripción vigente' }],
        match: (record, value) => value === 'none' ? !groupOf(record.id) : groupOf(record.id)?.id === value,
      }]}
      validate={(draft, id) => {
        if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(draft.curp)) return 'La CURP debe tener 18 caracteres y un formato válido.'
        if (!/^[A-Z0-9-]{1,40}$/.test(draft.matricula)) return 'La matrícula solo admite letras, números y guiones (hasta 40 caracteres).'
        if (draft.birthDate > today()) return 'La fecha de nacimiento no puede estar en el futuro.'
        if (data.students.some((student) => student.id !== id && student.curp === draft.curp)) return 'Ya existe un alumno con esta CURP. Busca su expediente para editarlo.'
        if (draft.matricula && data.students.some((student) => student.id !== id && student.matricula === draft.matricula)) return 'La matrícula ya pertenece a otro alumno.'
        if (draft.status === 'inactive' && data.enrollments.some((enrollment) => enrollment.studentId === id && enrollment.status === 'active' && data.schoolYears.some((year) => year.id === enrollment.schoolYearId && year.status !== 'closed'))) return 'Este alumno tiene una inscripción activa. Registra primero la baja en Inscripciones antes de inactivar el expediente.'
      }}
      detail={(record) => setSelectedId(record.id)}
      emptyHint="Registra al alumno con sus datos de identidad; después podrás vincular tutores e inscribirlo en un grupo."
    />
    {selectedId && <StudentRecord studentId={selectedId} onClose={() => setSelectedId('')} />}
  </>
}

function StudentRecord({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { data } = useAcademic()
  const tabsId = useId()
  const student = data.students.find((record) => record.id === studentId)
  const [tab, setTab] = useState<'summary' | 'history'>('summary')
  const [busy, setBusy] = useState(false)
  if (!student) return null
  const enrollments = data.enrollments.filter((record) => record.studentId === studentId).sort((a, b) => b.startDate.localeCompare(a.startDate))
  const current = currentEnrollment(data, studentId)
  const group = data.groups.find((record) => record.id === current?.groupId)
  const age = ageOf(student.birthDate)
  return <Modal title={fullName(student)} onClose={onClose} busy={busy} wide>
    <div className="profile-summary">
      <span className="avatar avatar-large avatar-student" aria-hidden="true">{initials(fullName(student))}</span>
      <dl>
        <div><dt>CURP</dt><dd className="text-mono">{student.curp}</dd></div>
        <div><dt>Matrícula</dt><dd className="text-mono">{student.matricula || 'No registrada'}</dd></div>
        <div><dt>Grupo actual</dt><dd>{group ? groupName(group) : 'Sin inscripción vigente'}</dd></div>
        <div><dt>Expediente</dt><dd><StatusBadge value={student.status} /></dd></div>
      </dl>
      <ButtonLink to={`/panel/inscripciones?alumno=${student.id}`} icon="enroll" onClick={onClose}>Gestionar inscripción</ButtonLink>
    </div>
    <Tabs idBase={tabsId} label="Secciones del expediente" value={tab} onChange={setTab} tabs={[{ value: 'summary', label: 'Datos y tutores' }, { value: 'history', label: 'Historial académico', count: enrollments.length }]} />
    <TabPanel idBase={tabsId} value={tab}>
      {tab === 'summary'
        ? <StudentDetails student={student} age={age} enrollments={enrollments} onClose={onClose} onBusy={setBusy} />
        : <StudentHistory enrollments={enrollments} />}
    </TabPanel>
  </Modal>
}

function StudentDetails({ student, age, enrollments, onClose, onBusy }: { student: Student; age?: number; enrollments: Enrollment[]; onClose: () => void; onBusy: (busy: boolean) => void }) {
  const { data } = useAcademic()
  const links = data.studentGuardians.filter((record) => record.studentId === student.id)
  const [guardianId, setGuardianId] = useState('')
  const [relationship, setRelationship] = useState('')
  const [primary, setPrimary] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const editingLink = links.find((link) => link.guardianId === guardianId)
  async function saveLink(event: FormEvent) {
    event.preventDefault(); setBusy(true); onBusy(true); setError(''); setMessage('')
    try {
      await saveRecord('studentGuardians', { studentId: student.id, guardianId, relationship: relationship.trim(), primary, ...(editingLink ? { revision: editingLink.revision } : {}) }, editingLink?.id)
      setMessage('Vínculo de tutor guardado.'); setGuardianId(''); setRelationship(''); setPrimary(false)
    } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false); onBusy(false) }
  }
  return <>
    <dl className="detail-grid">
      <div><dt>Nacimiento</dt><dd>{displayDate(student.birthDate)}{age !== undefined && <span className="text-muted"> · {age} años</span>}</dd></div>
      <div><dt>Sexo registrado</dt><dd>{student.sex === 'H' ? 'Hombre' : student.sex === 'M' ? 'Mujer' : student.sex}</dd></div>
      <div><dt>Inscripciones registradas</dt><dd>{enrollments.length}</dd></div>
      <div><dt>Tutores vinculados</dt><dd>{links.length}</dd></div>
    </dl>
    <h3 className="block-title">Tutores y contactos</h3>
    {links.length ? <ul className="contact-list">{links.map((link) => {
      const guardian = data.guardians.find((record) => record.id === link.guardianId)
      return <li className="contact-card" key={link.id}>
        <div>
          <p className="contact-name"><strong>{guardian?.name ?? 'Tutor no disponible'}</strong>{link.primary && <Badge tone="success">Contacto principal</Badge>}{guardian?.status === 'inactive' && <Badge>Tutor inactivo</Badge>}</p>
          <p>{link.relationship} · {guardian?.phone || 'Sin teléfono'}</p>
          <small>{guardian?.email || 'Sin correo'}</small>
        </div>
        <Button size="sm" variant="quiet" icon="pencil" onClick={() => { setGuardianId(link.guardianId); setRelationship(link.relationship); setPrimary(link.primary); setMessage(''); setError('') }}>Editar vínculo</Button>
      </li>
    })}</ul> : <EmptyState compact icon="students" title="Sin tutores vinculados">Selecciona un tutor del directorio o regístralo primero en la sección Tutores.</EmptyState>}
    <form className="nested-form" onSubmit={saveLink}>
      <h3>{editingLink ? 'Editar vínculo familiar' : 'Vincular un tutor'}</h3>
      <fieldset className="form-fieldset" disabled={busy}>
        <div className="form-grid">
          <Field label="Tutor" required>
            <select required value={guardianId} onChange={(event) => { const existing = links.find((item) => item.guardianId === event.target.value); setGuardianId(event.target.value); setRelationship(existing?.relationship ?? ''); setPrimary(existing?.primary ?? links.length === 0) }}>
              <option value="">Seleccionar tutor…</option>
              {data.guardians.filter((guardian) => guardian.status === 'active' || guardian.id === guardianId).map((guardian) => <option key={guardian.id} value={guardian.id}>{guardian.name}</option>)}
            </select>
          </Field>
          <Field label="Parentesco o relación" required>
            <input required maxLength={80} placeholder="Madre, padre, abuela, tutor legal…" value={relationship} onChange={(event) => setRelationship(event.target.value)} />
          </Field>
          <CheckboxField full label="Usar como contacto principal (reemplaza al principal anterior)." checked={primary} onChange={setPrimary} />
        </div>
      </fieldset>
      {error && <Alert tone="error" role="alert">{error}</Alert>}
      {message && <Alert tone="success" role="status">{message}</Alert>}
      <div className="form-actions">
        <Link to="/panel/tutores" onClick={onClose}>Ir al directorio de tutores</Link>
        <Button type="submit" variant="primary" loading={busy} disabled={!data.guardians.length}>{busy ? 'Guardando…' : 'Guardar vínculo'}</Button>
      </div>
    </form>
  </>
}

/** One boleta per enrollment: subjects as rows, the cycle's periods as columns. */
function StudentHistory({ enrollments }: { enrollments: Enrollment[] }) {
  const { data } = useAcademic()
  if (!enrollments.length) return <EmptyState icon="history" title="El historial comienza con su primera inscripción">Las inscripciones y calificaciones del nuevo sistema se conservan aquí.</EmptyState>
  return <div className="history-list">{enrollments.map((enrollment) => {
    const group = data.groups.find((record) => record.id === enrollment.groupId)
    const year = data.schoolYears.find((record) => record.id === enrollment.schoolYearId)
    const grades = data.grades.filter((record) => record.enrollmentId === enrollment.id)
    const periods = data.gradingPeriods.filter((record) => record.schoolYearId === enrollment.schoolYearId).sort((a, b) => a.order - b.order)
    const columns = periods.length ? periods.map((period) => ({ key: period.id, order: period.order, label: period.name })) : [1, 2, 3].map((order) => ({ key: `p${order}`, order, label: `Periodo ${order}` }))
    const subjectIds = Array.from(new Set(grades.map((grade) => grade.subjectPlanId)))
    const subjectName = (id: string) => data.subjectPlans.find((record) => record.id === id)?.name ?? 'Materia no disponible'
    subjectIds.sort((a, b) => subjectName(a).localeCompare(subjectName(b), 'es'))
    return <section className="history-block" key={enrollment.id}>
      <header className="history-heading">
        <div>
          <h3>{year?.name ?? 'Ciclo no disponible'} · {group ? groupName(group) : 'Grupo no disponible'}</h3>
          <p>{displayDate(enrollment.startDate)} — {enrollment.endDate ? displayDate(enrollment.endDate) : 'Vigente'}</p>
        </div>
        <StatusBadge value={enrollment.status} />
      </header>
      {enrollment.reason && <p className="history-reason">{enrollment.reason}</p>}
      {subjectIds.length ? <div className="table-wrap">
        <table className="boleta">
          <caption className="sr-only">Calificaciones de {year?.name ?? 'este ciclo'}</caption>
          <thead><tr><th scope="col">Materia</th>{columns.map((column) => <th key={column.key} scope="col" className="align-end">{column.label}</th>)}</tr></thead>
          <tbody>{subjectIds.map((subjectId) => <tr key={subjectId}>
            <th scope="row">{subjectName(subjectId)}</th>
            {columns.map((column) => {
              const grade = grades.find((record) => record.subjectPlanId === subjectId && (record.periodId === column.key || (!periods.length && record.periodOrder === column.order)))
              return <td key={column.key} className="align-end">{grade ? <span className="score">{grade.score}<small title="Calificación redondeada"><span className="sr-only">, redondeada </span>{grade.roundedScore}</small></span> : <span className="text-muted">—</span>}</td>
            })}
          </tr>)}</tbody>
        </table>
      </div> : <p className="text-muted">Sin calificaciones registradas para esta inscripción.</p>}
    </section>
  })}</div>
}
