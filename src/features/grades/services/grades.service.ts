import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Grade } from '@/types/models'
import { currentActor, writeAudited } from '@/features/academic/services/academic.service'

export interface SaveGradeInput {
  studentId: string
  enrollmentId: string
  groupId: string
  schoolYearId: string
  subjectPlanId: string
  periodId: string
  periodOrder: number
  score: number
  observation?: string
  correctionReason?: string
  expectedVersion?: number
}

export async function saveGrade(input: SaveGradeInput) {
  const actorId = currentActor()
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 10) {
    throw new Error('La calificación debe ser un número entre 0 y 10.')
  }
  const roundedScore = Math.round(input.score)
  const gradeId = `${input.enrollmentId}_${input.subjectPlanId}_${input.periodId}`
  const gradeRef = doc(db, 'grades', gradeId)
  await runTransaction(db, async (transaction) => {
    const snapshots = await Promise.all([
      transaction.get(gradeRef), transaction.get(doc(db, 'enrollments', input.enrollmentId)),
      transaction.get(doc(db, 'groups', input.groupId)), transaction.get(doc(db, 'gradingPeriods', input.periodId)),
      transaction.get(doc(db, 'subjectPlans', input.subjectPlanId)), transaction.get(doc(db, 'schoolYears', input.schoolYearId)),
    ])
    const [previous, enrollment, group, period, subject, year] = snapshots.map((snapshot) => snapshot.data())
    if (!enrollment || !group || !period || !subject || !year) throw new Error('Falta un registro relacionado. Actualiza los catálogos antes de capturar.')
    if (enrollment.studentId !== input.studentId || enrollment.groupId !== input.groupId || enrollment.schoolYearId !== input.schoolYearId
      || group.schoolYearId !== input.schoolYearId || period.schoolYearId !== input.schoolYearId
      || period.order !== input.periodOrder || subject.curriculumPlanId !== group.curriculumPlanId || subject.grade !== group.grade) {
      throw new Error('La inscripción, materia y periodo deben pertenecer al mismo grupo y ciclo.')
    }
    if (!previous && (enrollment.status !== 'active' || group.status !== 'active' || subject.status !== 'active')) {
      throw new Error('Solo se pueden capturar nuevas calificaciones para inscripciones, grupos y materias activos.')
    }
    if (input.expectedVersion !== undefined && (previous?.version ?? 0) !== input.expectedVersion) {
      throw new Error('Otra persona modificó esta calificación. Actualiza los datos antes de guardar.')
    }
    const correctionReason = input.correctionReason?.trim() ?? ''
    if ((period.status === 'closed' || year.status === 'closed' || previous) && !correctionReason) {
      throw new Error('Escribe el motivo de la corrección; quedará registrado en el historial.')
    }
    if (!previous && (period.status === 'closed' || year.status !== 'active')) {
      throw new Error('Abre el ciclo y el periodo antes de capturar una calificación nueva.')
    }
    const teacherId = previous?.teacherId ?? group[`${subject.specialty}TeacherId`]
    if (!teacherId) throw new Error('Asigna primero el profesor de esta materia al grupo.')
    const { expectedVersion: _expectedVersion, ...inputFields } = input
    const version = (previous?.version ?? 0) + 1
    const data = { ...inputFields, observation: input.observation?.trim() ?? '', correctionReason, roundedScore, teacherId, version }
    const auditId = writeAudited(transaction, 'grades', gradeRef, data, previous, actorId, previous ? 'correct-grade' : 'create-grade')
    if (previous) transaction.set(doc(gradeRef, 'history', auditId), {
      gradeId, previousScore: previous.score, newScore: input.score,
      previousObservation: previous.observation ?? '', newObservation: data.observation,
      actorId, reason: correctionReason, version, createdAt: serverTimestamp(),
    })
  })
  return { gradeId, roundedScore }
}

export async function listGrades(groupId: string) {
  const snapshot = await getDocs(query(collection(db, 'grades'), where('groupId', '==', groupId)))
  return snapshot.docs.map((grade) => ({ id: grade.id, ...grade.data() }) as Grade)
}
