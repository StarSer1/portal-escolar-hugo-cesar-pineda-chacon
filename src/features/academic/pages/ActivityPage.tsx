import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { useAuth } from '@/features/auth/AuthContext'
import type { AuditLog } from '@/types/models'
import { DataState, EmptyState, fullName, groupName, matchesQuery, PageHeading } from '../components/AcademicUI'

const actions: Record<string, string> = {
  create: 'Registro creado', update: 'Registro actualizado', enroll: 'Inscripción registrada',
  transfer: 'Cambio de grupo', withdraw: 'Baja de inscripción', 'create-grade': 'Calificación capturada', 'correct-grade': 'Calificación corregida',
}
const collections: Record<string, { label: string; route: string }> = {
  students: { label: 'Alumnos', route: '/panel/alumnos' }, guardians: { label: 'Tutores', route: '/panel/tutores' },
  studentGuardians: { label: 'Vínculos familiares', route: '/panel/alumnos' }, teachers: { label: 'Docentes', route: '/panel/docentes' },
  schoolYears: { label: 'Ciclos escolares', route: '/panel/organizacion?tab=years' }, curriculumPlans: { label: 'Planes de estudio', route: '/panel/organizacion?tab=plans' },
  subjectPlans: { label: 'Materias', route: '/panel/organizacion?tab=subjects' }, groups: { label: 'Grupos', route: '/panel/organizacion?tab=groups' },
  gradingPeriods: { label: 'Periodos', route: '/panel/organizacion?tab=periods' }, enrollments: { label: 'Inscripciones', route: '/panel/inscripciones' }, grades: { label: 'Calificaciones', route: '/panel/calificaciones' },
}
function auditDate(value: unknown) {
  if (!value || typeof value !== 'object' || !('toDate' in value) || typeof value.toDate !== 'function') return 'Sin fecha disponible'
  const date: unknown = value.toDate()
  return date instanceof Date ? date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha disponible'
}

export function ActivityPage() {
  const { data } = useAcademic()
  const { user, profile } = useAuth()
  const [query, setQuery] = useState('')
  const [entityType, setEntityType] = useState('')
  function recordName(audit: AuditLog) {
    if (audit.entityType === 'students') { const student = data.students.find((item) => item.id === audit.entityId); return student ? fullName(student) : 'Expediente de alumno' }
    if (audit.entityType === 'groups') { const group = data.groups.find((item) => item.id === audit.entityId); return group ? groupName(group) : 'Grupo escolar' }
    if (audit.entityType === 'studentGuardians') {
      const link = data.studentGuardians.find((item) => item.id === audit.entityId)
      const student = data.students.find((item) => item.id === link?.studentId)
      return student ? `Tutor de ${fullName(student)}` : 'Vínculo familiar'
    }
    if (audit.entityType === 'enrollments' || audit.entityType === 'grades') {
      const record = data[audit.entityType].find((item) => item.id === audit.entityId)
      const student = data.students.find((item) => item.id === record?.studentId)
      return student ? fullName(student) : 'Registro académico'
    }
    const named = [...data.guardians, ...data.teachers, ...data.schoolYears, ...data.curriculumPlans, ...data.subjectPlans, ...data.gradingPeriods]
    return named.find((item) => item.id === audit.entityId)?.name ?? 'Registro conservado'
  }
  const visible = data.auditLogs.filter((audit) => (!entityType || audit.entityType === entityType) && matchesQuery(query, recordName(audit), actions[audit.action] ?? audit.action, collections[audit.entityType]?.label, audit.actorId))
  return <>
    <PageHeading eyebrow="Trazabilidad" title="Actividad del panel" description="Consulta los últimos 100 movimientos registrados: altas, modificaciones, inscripciones y correcciones de calificaciones." />
    <p className="info-banner">La bitácora es de solo lectura. Conserva la fecha y el identificador de la cuenta responsable; los registros históricos no se eliminan desde el panel.</p>
    <DataState><section className="card"><div className="toolbar">
      <label className="search-field"><span className="sr-only">Buscar en actividad</span><input type="search" placeholder="Buscar registro o movimiento…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className="filter-field"><span className="sr-only">Filtrar por módulo</span><select value={entityType} onChange={(event) => setEntityType(event.target.value)}><option value="">Todos los módulos</option>{Object.entries(collections).map(([key, entry]) => <option key={key} value={key}>{entry.label}</option>)}</select></label>
      <span className="record-count">{visible.length} movimientos</span>
    </div>{visible.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th scope="col">Fecha</th><th scope="col">Movimiento</th><th scope="col">Registro</th><th scope="col">Responsable</th><th scope="col">Módulo</th></tr></thead><tbody>{visible.map((audit) => <tr key={audit.id}><td>{auditDate(audit.createdAt)}</td><td><span className={`badge ${audit.action === 'correct-grade' || audit.action === 'withdraw' ? 'badge-muted' : 'badge-success'}`}>{actions[audit.action] ?? audit.action}</span></td><td><strong>{recordName(audit)}</strong></td><td>{audit.actorId === user?.uid ? <span>{profile?.displayName || 'Tu cuenta'} <small className="text-muted">(tú)</small></span> : <span className="text-mono" title={`Identificador de la cuenta: ${audit.actorId}`}>{audit.actorId}</span>}</td><td>{collections[audit.entityType] ? <Link to={collections[audit.entityType].route}>{collections[audit.entityType].label}</Link> : audit.entityType}</td></tr>)}</tbody></table></div> : <EmptyState title={data.auditLogs.length ? 'Sin movimientos que coincidan' : 'La bitácora está lista'}>{data.auditLogs.length ? 'Cambia la búsqueda o el filtro del módulo.' : 'Los movimientos se mostrarán automáticamente conforme utilices los módulos del panel.'}</EmptyState>}</section></DataState>
    <p className="form-help">Los nombres mostrados corresponden al catálogo actual. Esta vista limita la consulta a los últimos 100 movimientos; no representa un reporte histórico completo.</p>
  </>
}
