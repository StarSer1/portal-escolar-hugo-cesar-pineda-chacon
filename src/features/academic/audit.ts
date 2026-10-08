import type { AcademicData, AuditLog } from '@/types/models'
import type { BadgeTone } from '@/shared/ui/Feedback'

export const auditActions: Record<string, string> = {
  create: 'Registro creado', update: 'Registro actualizado', enroll: 'Inscripción registrada',
  transfer: 'Cambio de grupo', withdraw: 'Baja de inscripción', 'create-grade': 'Calificación capturada', 'correct-grade': 'Calificación corregida',
}
export const auditTones: Record<string, BadgeTone> = {
  create: 'success', enroll: 'success', 'create-grade': 'success', update: 'info', transfer: 'info', 'correct-grade': 'warn', withdraw: 'alert',
}
export const auditModules: Record<string, { label: string; route: string }> = {
  students: { label: 'Alumnos', route: '/panel/alumnos' }, guardians: { label: 'Tutores', route: '/panel/tutores' },
  studentGuardians: { label: 'Vínculos familiares', route: '/panel/alumnos' }, teachers: { label: 'Docentes', route: '/panel/docentes' },
  schoolYears: { label: 'Ciclos escolares', route: '/panel/organizacion?tab=years' }, curriculumPlans: { label: 'Planes de estudio', route: '/panel/organizacion?tab=plans' },
  subjectPlans: { label: 'Materias', route: '/panel/organizacion?tab=subjects' }, groups: { label: 'Grupos', route: '/panel/organizacion?tab=groups' },
  gradingPeriods: { label: 'Periodos', route: '/panel/organizacion?tab=periods' }, enrollments: { label: 'Inscripciones', route: '/panel/inscripciones' }, grades: { label: 'Calificaciones', route: '/panel/calificaciones' },
}

/** Firestore timestamps arrive as objects with toDate(); anything else has no date. */
export function auditDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object' || !('toDate' in value) || typeof value.toDate !== 'function') return null
  const date: unknown = value.toDate()
  return date instanceof Date ? date : null
}

/** Human name of the record an audit entry points to, using the current catalog. */
export function auditRecordName(audit: AuditLog, data: AcademicData) {
  const person = (id?: string) => { const student = data.students.find((item) => item.id === id); return student ? `${student.names} ${student.surnames}`.trim() : undefined }
  if (audit.entityType === 'students') return person(audit.entityId) ?? 'Expediente de alumno'
  if (audit.entityType === 'groups') {
    const group = data.groups.find((item) => item.id === audit.entityId)
    return group ? `${group.grade}° ${group.label}${group.shift ? ` · ${group.shift}` : ''}` : 'Grupo escolar'
  }
  if (audit.entityType === 'studentGuardians') {
    const link = data.studentGuardians.find((item) => item.id === audit.entityId)
    const name = person(link?.studentId)
    return name ? `Tutor de ${name}` : 'Vínculo familiar'
  }
  if (audit.entityType === 'enrollments' || audit.entityType === 'grades') {
    const record = data[audit.entityType].find((item) => item.id === audit.entityId)
    return person(record?.studentId) ?? 'Registro académico'
  }
  const named = [...data.guardians, ...data.teachers, ...data.schoolYears, ...data.curriculumPlans, ...data.subjectPlans, ...data.gradingPeriods]
  return named.find((item) => item.id === audit.entityId)?.name ?? 'Registro conservado'
}

/** Teacher accounts are linked to their record through authUid; other accounts keep their ID. */
export function auditActor(audit: AuditLog, data: AcademicData, currentUid?: string, currentName?: string) {
  if (audit.actorId === currentUid) return { name: currentName || 'Tu cuenta', note: 'tú' }
  const teacher = data.teachers.find((item) => item.authUid && item.authUid === audit.actorId)
  return teacher ? { name: teacher.name, note: 'docente' } : { name: audit.actorId, note: undefined, raw: true as const }
}
