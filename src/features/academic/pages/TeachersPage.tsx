import { useState, type FormEvent } from 'react'
import { useAcademic } from '@/features/academic/AcademicContext'
import { normalizeTeacherEmail, saveTeacher } from '../services/teachers.service'
import { errorMessage } from '@/shared/errors'
import { Button, IconButton } from '@/shared/ui/Button'
import { DataTable, type Column } from '@/shared/ui/DataTable'
import { Alert, Badge, EmptyState, PageHeader } from '@/shared/ui/Feedback'
import { CheckboxField, Field, FilterSelect, FormSection, SearchField, Toolbar } from '@/shared/ui/Field'
import { Modal } from '@/shared/ui/Modal'
import type { Teacher, TeacherSpecialty, ActiveStatus } from '@/types/models'
import { groupName, initials, matchesQuery, specialtyLabels, specialtyOptions, StatusBadge } from '../components/AcademicUI'

type Access = 'enabled' | 'suspended' | 'none'
const accessOf = (teacher: Teacher): Access => teacher.authUid ? teacher.status === 'active' ? 'enabled' : 'suspended' : 'none'
const accessLabels: Record<Access, string> = { enabled: 'Habilitado', suspended: 'Suspendido', none: 'Sin cuenta' }
const accessTones = { enabled: 'success', suspended: 'alert', none: 'muted' } as const

export function TeachersPage() {
  const { data } = useAcademic()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [access, setAccess] = useState('')
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
  const activeYear = data.schoolYears.find((year) => year.status === 'active')
  const groupsOf = (teacher: Teacher) => data.groups.filter((group) => (!activeYear || group.schoolYearId === activeYear.id) && [group.generalTeacherId, group.physicalTeacherId, group.englishTeacherId, group.artsTeacherId].includes(teacher.id))
  const records = data.teachers.filter((teacher) => (!status || status === teacher.status) && (!specialty || specialty === teacher.specialty) && (!access || access === accessOf(teacher)) && matchesQuery(search, teacher.name, teacher.email, teacher.phone))
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

  const columns: Column<Teacher>[] = [
    {
      key: 'name', header: 'Docente', sortValue: (teacher) => teacher.name,
      cell: (teacher) => <div className="cell-person">
        <span className="avatar" aria-hidden="true">{initials(teacher.name)}</span>
        <div><strong>{teacher.name}</strong><small>{teacher.email || 'Sin correo registrado'}</small>{repeated(teacher) && <Badge tone="warn">Correo repetido</Badge>}</div>
      </div>,
    },
    { key: 'specialty', header: 'Especialidad', sortValue: (teacher) => specialtyLabels[teacher.specialty], cell: (teacher) => specialtyLabels[teacher.specialty] },
    {
      key: 'groups', header: 'Grupos del ciclo activo', sortValue: (teacher) => groupsOf(teacher).length, priority: 'low',
      cell: (teacher) => { const groups = groupsOf(teacher); return groups.length ? <div className="cell-stack">{groups.map((group) => <span key={group.id}>{groupName(group)}</span>)}</div> : <span className="text-muted">Sin asignaciones</span> },
    },
    {
      key: 'access', header: 'Acceso al portal', sortValue: (teacher) => accessLabels[accessOf(teacher)],
      cell: (teacher) => <div className="cell-access">
        <Badge tone={accessTones[accessOf(teacher)]}>{accessLabels[accessOf(teacher)]}</Badge>
        {!teacher.authUid && <Button size="sm" icon="lock" disabled={repeated(teacher) || !teacher.email || teacher.status !== 'active'} onClick={() => open(teacher, true)}>Habilitar acceso</Button>}
      </div>,
    },
    { key: 'status', header: 'Estado', sortValue: (teacher) => teacher.status, cell: (teacher) => <StatusBadge value={teacher.status} /> },
  ]

  return <>
    <PageHeader title="Docentes" description="Registra al equipo y administra su acceso al portal. Cada cuenta utiliza un correo personal único." actions={<Button variant="primary" icon="plus" onClick={() => open(null)}>Agregar docente</Button>} />
    {notice && <Alert tone="success" role="status">{notice}</Alert>}
    {duplicateCount > 0 && <Alert tone="warning">Hay correos repetidos en los registros anteriores ({duplicateCount} docentes). Los expedientes se conservan sin crear cuentas automáticamente. Edita cada registro y asigna un correo personal distinto antes de habilitar su acceso; los correos compartidos de prueba quedan reservados.</Alert>}
    <section className="card table-card" aria-label="Docentes">
      <Toolbar count={`${records.length} ${records.length === 1 ? 'docente' : 'docentes'}`}>
        <SearchField label="Buscar en docentes" placeholder="Buscar por nombre o correo…" value={search} onChange={setSearch} />
        <FilterSelect label="Filtrar por especialidad" allLabel="Todas las especialidades" options={specialtyOptions} value={specialty} onChange={setSpecialty} />
        <FilterSelect label="Filtrar por acceso al portal" allLabel="Cualquier acceso" options={Object.entries(accessLabels).map(([value, label]) => ({ value, label }))} value={access} onChange={setAccess} />
        <FilterSelect label="Filtrar por estado" allLabel="Todos los estados" options={[{ value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }]} value={status} onChange={setStatus} />
      </Toolbar>
      <DataTable
        caption="Docentes"
        rows={records}
        columns={columns}
        rowKey={(teacher) => teacher.id}
        initialSort={{ key: 'name', direction: 'asc' }}
        resetKey={[search, status, specialty, access].join('|')}
        actions={(teacher) => <IconButton icon="pencil" label={`Editar docente ${teacher.name}`} onClick={() => open(teacher)} />}
        empty={<EmptyState icon={data.teachers.length ? 'search' : 'teacher'} title={data.teachers.length ? 'Sin coincidencias' : 'Todavía no hay docentes'}>{data.teachers.length ? 'Prueba otra búsqueda o cambia los filtros.' : 'Agrega un docente con su correo y contraseña inicial. Después asígnalo a sus grupos en Organización escolar.'}</EmptyState>}
      />
    </section>
    <p className="page-note">El docente solo consulta sus grupos del ciclo activo y captura calificaciones de sus materias en periodos abiertos. La dirección conserva la administración y las correcciones. Para suspender el acceso, cambia su estado a Inactivo.</p>
    {editing !== undefined && <Modal title={enableAccess ? 'Habilitar acceso' : editing ? 'Editar docente' : 'Agregar docente'} description={enableAccess ? 'Crea una cuenta de acceso para este expediente, sin duplicar al docente.' : 'Los campos con * son obligatorios. La cuenta es exclusiva del portal escolar.'} onClose={close} busy={busy} focusField wide>
      <form onSubmit={submit}>
        <fieldset className="form-fieldset" disabled={busy}>
          <div className="form-sections">
            <FormSection title="Datos del docente">
              <Field label="Nombre completo" required full>
                <input name="name" required maxLength={160} readOnly={enableAccess} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </Field>
              <Field label="Correo electrónico" required hint={editing?.authUid ? 'Vinculado a una cuenta. El correo no se cambia desde el expediente.' : 'Personal y único, sin distinguir mayúsculas. No uses correos inventados de terceros.'}>
                <input name="email" type="email" required maxLength={254} autoComplete="off" readOnly={!!editing?.authUid || enableAccess} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              </Field>
              <Field label="Teléfono">
                <input name="phone" type="tel" maxLength={40} readOnly={enableAccess} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              </Field>
            </FormSection>
            <FormSection title="Función y estado">
              <Field label="Especialidad" required hint={editing ? 'La especialidad se conserva desde el alta.' : undefined}>
                <select name="specialty" required disabled={!!editing} value={draft.specialty} onChange={(event) => setDraft({ ...draft, specialty: event.target.value as TeacherSpecialty })}>
                  {specialtyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Estado" required hint="Inactivo suspende el acceso sin borrar historial ni asignaciones.">
                <select name="status" required disabled={enableAccess} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ActiveStatus })}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </Field>
            </FormSection>
            {needsPassword && <FormSection title="Acceso al portal" description="Asigna una contraseña inicial para el portal, no la contraseña del correo del docente. No se guarda en Firestore ni puede consultarse después; el docente podrá cambiarla desde su panel.">
              <Field label="Contraseña inicial" required hint="Entre 12 y 128 caracteres; evita nombres o claves compartidas.">
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
              <Field label="Confirmar contraseña" required>
                <input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </Field>
              <CheckboxField full label="Mostrar contraseñas" checked={showPassword} onChange={setShowPassword} />
            </FormSection>}
          </div>
        </fieldset>
        {error && <Alert tone="error" role="alert">{error}</Alert>}
        <div className="form-actions">
          <Button onClick={close} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={busy}>{busy ? 'Guardando…' : needsPassword ? enableAccess ? 'Crear acceso' : 'Crear docente y acceso' : 'Guardar cambios'}</Button>
        </div>
      </form>
    </Modal>}
  </>
}
