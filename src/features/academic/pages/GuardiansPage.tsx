import { useAcademic } from '@/features/academic/AcademicContext'
import { activeOptions, fullName, RecordManager, StatusBadge } from '../components/AcademicUI'

export function GuardiansPage() {
  const { data } = useAcademic()
  return <RecordManager title="Tutores" singular="Tutor" collection="guardians" description="Un directorio compartido para madres, padres y tutores. Vincula a cada contacto desde el expediente del alumno." records={data.guardians.map((record) => ({ ...record }))} searchFields={['name', 'email', 'phone']} fields={[
    { key: 'name', label: 'Nombre completo', required: true, full: true },
    { key: 'phone', label: 'Teléfono de contacto', type: 'tel', maxLength: 25, required: true },
    { key: 'email', label: 'Correo electrónico', type: 'email', maxLength: 180 },
    { key: 'address', label: 'Domicilio', type: 'textarea', full: true, maxLength: 350 },
    { key: 'education', label: 'Escolaridad', maxLength: 100 },
    { key: 'occupation', label: 'Ocupación', maxLength: 100 },
    { key: 'status', label: 'Estado', type: 'select', defaultValue: 'active', required: true, options: activeOptions },
  ]} columns={[
    { label: 'Tutor', render: (record) => <div className="cell-person"><span className="avatar avatar-guardian" aria-hidden="true">{String(record.name).charAt(0)}</span><div><strong>{String(record.name)}</strong><small>{String(record.occupation || 'Sin ocupación registrada')}</small></div></div> },
    { label: 'Contacto', render: (record) => <div className="cell-stack"><span>{String(record.phone || 'Sin teléfono')}</span><small>{String(record.email || 'Sin correo')}</small></div> },
    { label: 'Alumnos vinculados', render: (record) => {
      const names = data.studentGuardians.filter((link) => link.guardianId === record.id).map((link) => data.students.find((student) => student.id === link.studentId)).filter((student) => !!student).map(fullName)
      return names.length ? <span>{names.join(', ')}</span> : <span className="text-muted">Sin vínculos</span>
    } },
    { label: 'Estado', render: (record) => <StatusBadge value={String(record.status)} /> },
  ]} emptyHint="Registra un contacto una sola vez; puedes vincularlo a varios alumnos desde sus expedientes." />
}
