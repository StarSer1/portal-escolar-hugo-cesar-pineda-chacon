import { useState, type FormEvent } from 'react'
import { useAcademic } from '@/features/academic/AcademicContext'
import { normalizeTeacherEmail, saveTeacher } from '../services/teachers.service'
import { errorMessage } from '@/shared/errors'
import type { Teacher, TeacherSpecialty, ActiveStatus } from '@/types/models'
import { EmptyState, groupName, matchesQuery, Modal, PageHeading, specialtyLabels, specialtyOptions, StatusBadge } from '../components/AcademicUI'

export function TeachersPage() {
  const { data } = useAcademic()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Teacher | null | undefined>()
  const [enableAccess, setEnableAccess] = useState(false)
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', specialty: 'general' as TeacherSpecialty, status: 'active' as ActiveStatus })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const emailCounts = new Map<string, number>()
  for (const teacher of data.teachers) {
    const email = normalizeTeacherEmail(teacher.email)
    if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1)
  }
  const repeated = (teacher: Teacher) => (emailCounts.get(normalizeTeacherEmail(teacher.email)) ?? 0) > 1
  const duplicateCount = data.teachers.filter(repeated).length
  const records = data.teachers.filter((teacher) => (!status || status === teacher.status) && matchesQuery(search, teacher.name, teacher.email, teacher.phone))
  const needsPassword = editing === null || enableAccess
  function close() { setEditing(undefined); setPassword(''); setConfirmPassword(''); setError(''); setShowPassword(false) }
  function open(teacher: Teacher | null, enable = false) {
    setEditing(teacher); setEnableAccess(enable); setPassword(''); setConfirmPassword(''); setShowPassword(false); setError(''); setNotice('')
    setDraft(teacher ? { name: teacher.name, email: teacher.email, phone: teacher.phone, specialty: teacher.specialty, status: teacher.status } : { name: '', email: '', phone: '', specialty: 'general', status: 'active' })
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    const email = normalizeTeacherEmail(draft.email)
    if (data.teachers.some((teacher) => teacher.id !== editing?.id && normalizeTeacherEmail(teacher.email) === email)) { setError('Este correo ya está asignado a otro docente. Cada docente necesita un correo único.'); return }
    if (needsPassword && password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return }
    setBusy(true)
    try {
      const result = await saveTeacher({ ...draft, email, revision: editing?.revision }, { id: editing?.id, ...(needsPassword ? { password } : {}) })
      close()
      setNotice(result.accountCreated
        ? 'Docente y acceso creados correctamente. Comparte la contraseña inicial de forma privada; no se enviará por correo ni quedará visible en el panel.'
        : 'Docente actualizado correctamente. Sus permisos se actualizaron con el estado del expediente.')
    } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false) }
  }
  return <>
    <PageHeading eyebrow="Personal y acceso" title="Docentes" description="Registra al equipo y administra su acceso al portal. Cada cuenta utiliza un correo personal único." action={<button className="btn btn-primary" onClick={() => open(null)}>+ Agregar docente</button>} />
    {notice && <p className="success-banner" role="status">{notice}</p>}
    {duplicateCount > 0 && <p className="notice-banner">Hay correos repetidos en los registros anteriores ({duplicateCount} docentes). Los expedientes se conservan sin crear cuentas automáticamente. Edita cada registro y asigna un correo personal distinto antes de habilitar su acceso; los correos compartidos de prueba quedan reservados.</p>}
    <section className="card"><div className="toolbar"><label className="search-field"><span className="sr-only">Buscar en docentes</span><input type="search" placeholder="Buscar nombre o correo…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="filter-field"><span className="sr-only">Filtrar por estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label><span className="record-count">{records.length} docentes</span></div>
      {records.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Docente</th><th>Especialidad</th><th>Grupos asignados</th><th>Acceso al portal</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{records.map((teacher) => {
        const groups = data.groups.filter((group) => [group.generalTeacherId, group.physicalTeacherId, group.englishTeacherId, group.artsTeacherId].includes(teacher.id))
        return <tr key={teacher.id}><td><div className="cell-person"><span className="avatar" aria-hidden="true">{teacher.name.charAt(0)}</span><div><strong>{teacher.name}</strong><small>{teacher.email || 'Sin correo registrado'}</small>{repeated(teacher) && <span className="badge badge-muted">Correo repetido</span>}</div></div></td><td>{specialtyLabels[teacher.specialty]}</td><td>{groups.length ? groups.map(groupName).join(', ') : <span className="text-muted">Sin asignaciones</span>}</td><td><span className={`badge ${teacher.authUid && teacher.status === 'active' ? 'badge-success' : 'badge-muted'}`}>{teacher.authUid ? teacher.status === 'active' ? 'Habilitado' : 'Suspendido' : 'Sin cuenta'}</span></td><td><StatusBadge value={teacher.status} /></td><td><div className="row-actions"><button className="btn btn-small btn-quiet" aria-label={`Editar docente ${teacher.name}`} onClick={() => open(teacher)}>Editar</button>{!teacher.authUid && <button className="btn btn-small btn-secondary" disabled={repeated(teacher) || !teacher.email || teacher.status !== 'active'} onClick={() => open(teacher, true)}>Habilitar acceso</button>}</div></td></tr>
      })}</tbody></table></div> : <EmptyState title={data.teachers.length ? 'Sin coincidencias' : 'Todavía no hay docentes'}>Agrega un docente con su correo y contraseña inicial. Después asígnalo a sus grupos en Organización escolar.</EmptyState>}
    </section>
    <p className="form-help">El docente solo consulta sus grupos del ciclo activo y captura calificaciones de sus materias en periodos abiertos. La dirección conserva la administración y las correcciones. Para suspender el acceso, cambia su estado a Inactivo.</p>
    {editing !== undefined && <Modal title={enableAccess ? 'Habilitar acceso' : editing ? 'Editar docente' : 'Agregar docente'} onClose={close} busy={busy}>
      <form onSubmit={submit}><p className="form-help">{enableAccess ? 'Crea una cuenta de acceso para este expediente, sin duplicar al docente.' : 'Los campos con * son obligatorios. La cuenta es exclusiva del portal escolar.'}</p><fieldset className="form-fieldset" disabled={busy}><div className="form-grid">
        <label className="field-full">Nombre completo *<input name="name" required maxLength={160} readOnly={enableAccess} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>Correo electrónico *<input name="email" type="email" required maxLength={254} autoComplete="off" readOnly={!!editing?.authUid || enableAccess} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /><small>{editing?.authUid ? 'Vinculado a una cuenta. El correo no se cambia desde el expediente.' : 'Personal y único, sin distinguir mayúsculas. No uses correos inventados de terceros.'}</small></label>
        <label>Teléfono<input name="phone" type="tel" maxLength={40} readOnly={enableAccess} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
        <label>Especialidad *<select name="specialty" required disabled={!!editing} value={draft.specialty} onChange={(event) => setDraft({ ...draft, specialty: event.target.value as TeacherSpecialty })}>{specialtyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Estado *<select name="status" required disabled={enableAccess} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ActiveStatus })}><option value="active">Activo</option><option value="inactive">Inactivo</option></select><small>Inactivo suspende el acceso sin borrar historial ni asignaciones.</small></label>
        {needsPassword && <><div className="info-banner field-full">Asigna una contraseña inicial para el portal, no la contraseña del correo del docente. No se guarda en Firestore ni puede consultarse después. El docente podrá cambiarla desde su panel.</div><label>Contraseña inicial *<input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><small>Entre 12 y 128 caracteres; evita nombres o claves compartidas.</small></label><label>Confirmar contraseña *<input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label><label className="checkbox-field field-full"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />Mostrar contraseñas</label></>}
      </div></fieldset>{error && <p className="error-banner" role="alert">{error}</p>}<div className="form-actions"><button className="btn btn-secondary" type="button" disabled={busy} onClick={close}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : needsPassword ? enableAccess ? 'Crear acceso' : 'Crear docente y acceso' : 'Guardar cambios'}</button></div></form>
    </Modal>}
  </>
}
