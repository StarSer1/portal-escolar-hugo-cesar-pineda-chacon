import { useAcademic } from '@/features/academic/AcademicContext'
import type { Column } from '@/shared/ui/DataTable'
import { activeOptions, fullName, initials, RecordManager, StatusBadge, type ManagedRecord } from '../components/AcademicUI'

export function GuardiansPage() {
  const { data } = useAcademic()
  const linksOf = (id: string) => data.studentGuardians.filter((link) => link.guardianId === id)
  const columns: Column<ManagedRecord>[] = [
    {
      key: 'name', header: 'Tutor', sortValue: (record) => String(record.name),
      cell: (record) => <div className="cell-person">
        <span className="avatar avatar-guardian" aria-hidden="true">{initials(String(record.name))}</span>
        <div><strong>{String(record.name)}</strong><small>{String(record.occupation || 'Sin ocupación registrada')}</small></div>
      </div>,
    },
    { key: 'contact', header: 'Contacto', cell: (record) => <div className="cell-stack"><span className="tabular">{String(record.phone || 'Sin teléfono')}</span><small>{String(record.email || 'Sin correo')}</small></div> },
    {
      key: 'students', header: 'Alumnos vinculados', sortValue: (record) => linksOf(record.id).length,
      cell: (record) => {
        const links = linksOf(record.id).map((link) => ({ link, student: data.students.find((student) => student.id === link.studentId) })).filter((item) => item.student)
        return links.length
          ? <ul className="linked-list">{links.map(({ link, student }) => <li key={link.id}>{fullName(student!)} <small>{link.relationship}{link.primary ? ' · principal' : ''}</small></li>)}</ul>
          : <span className="text-muted">Sin vínculos</span>
      },
    },
    { key: 'status', header: 'Estado', sortValue: (record) => String(record.status), cell: (record) => <StatusBadge value={String(record.status)} /> },
  ]
  return <RecordManager
    title="Tutores" singular="Tutor" collection="guardians"
    description="Directorio compartido de madres, padres y tutores. Cada contacto se vincula a sus alumnos desde el expediente del alumno."
    records={data.guardians.map((record) => ({ ...record }))}
    searchFields={['name', 'email', 'phone']} searchPlaceholder="Buscar por nombre, teléfono o correo…"
    initialSort={{ key: 'name', direction: 'asc' }}
    filters={[{
      key: 'links', label: 'Filtrar por vínculos', allLabel: 'Con y sin alumnos',
      options: [{ value: 'linked', label: 'Con alumnos vinculados' }, { value: 'unlinked', label: 'Sin alumnos vinculados' }],
      match: (record, value) => (linksOf(record.id).length > 0) === (value === 'linked'),
    }]}
    fields={[
      { key: 'name', label: 'Nombre completo', required: true, full: true, section: 'Datos de contacto' },
      { key: 'phone', label: 'Teléfono de contacto', type: 'tel', maxLength: 25, required: true, section: 'Datos de contacto' },
      { key: 'email', label: 'Correo electrónico', type: 'email', maxLength: 180, section: 'Datos de contacto' },
      { key: 'address', label: 'Domicilio', type: 'textarea', full: true, maxLength: 350, section: 'Información complementaria' },
      { key: 'education', label: 'Escolaridad', maxLength: 100, section: 'Información complementaria' },
      { key: 'occupation', label: 'Ocupación', maxLength: 100, section: 'Información complementaria' },
      { key: 'status', label: 'Estado', type: 'select', defaultValue: 'active', required: true, options: activeOptions, hint: 'Un tutor inactivo conserva sus vínculos e historial.', section: 'Registro' },
    ]}
    columns={columns}
    emptyHint="Registra un contacto una sola vez; puedes vincularlo a varios alumnos desde sus expedientes."
  />
}
