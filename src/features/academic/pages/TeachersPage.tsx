import { useAcademic } from '@/features/academic/AcademicContext'
import { activeOptions, groupName, RecordManager, specialtyLabels, specialtyOptions, StatusBadge } from '../components/AcademicUI'

export function TeachersPage() {
  const { data } = useAcademic()
  return <RecordManager title="Docentes" singular="Docente" collection="teachers" description="Personal académico y especialidades. Cada grupo tendrá un docente general y especialistas de Educación Física, Inglés y Artes." records={data.teachers.map((record) => ({ ...record }))} searchFields={['name', 'email', 'phone']} fields={[
    { key: 'name', label: 'Nombre completo', required: true, full: true },
    { key: 'email', label: 'Correo electrónico', type: 'email', maxLength: 180 },
    { key: 'phone', label: 'Teléfono', type: 'tel', maxLength: 25 },
    { key: 'specialty', label: 'Especialidad', type: 'select', required: true, immutable: true, options: specialtyOptions, hint: 'Define su asignación en los grupos. Después del alta se conserva; registra otro perfil docente para una especialidad distinta.' },
    { key: 'status', label: 'Estado', type: 'select', defaultValue: 'active', required: true, options: activeOptions, hint: 'Este registro de personal no crea una cuenta de acceso.' },
  ]} validate={(draft, id) => {
    const current = data.teachers.find((record) => record.id === id)
    const assigned = data.groups.some((group) => group.status === 'active' && [group.generalTeacherId, group.physicalTeacherId, group.englishTeacherId, group.artsTeacherId].includes(id ?? ''))
    if (assigned && (draft.specialty !== current?.specialty || draft.status === 'inactive')) return 'Este docente tiene grupos activos. Sustituye primero sus asignaciones antes de cambiar su especialidad o inactivarlo.'
  }} columns={[
    { label: 'Docente', render: (record) => <div className="cell-person"><span className="avatar avatar-teacher" aria-hidden="true">{String(record.name).charAt(0)}</span><div><strong>{String(record.name)}</strong><small>{String(record.email || 'Sin correo registrado')}</small></div></div> },
    { label: 'Especialidad', render: (record) => <span className="badge badge-muted">{specialtyLabels[String(record.specialty)]}</span> },
    { label: 'Grupos asignados', render: (record) => {
      const groups = data.groups.filter((group) => [group.generalTeacherId, group.physicalTeacherId, group.englishTeacherId, group.artsTeacherId].includes(record.id))
      return groups.length ? groups.map(groupName).join(', ') : <span className="text-muted">Sin asignaciones</span>
    } },
    { label: 'Estado', render: (record) => <StatusBadge value={String(record.status)} /> },
  ]} emptyHint="Empieza por registrar al personal de las cuatro especialidades. Después asígnalo a sus grupos en Organización." />
}
