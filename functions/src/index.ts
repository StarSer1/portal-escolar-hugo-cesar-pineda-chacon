import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp()
const db = getFirestore()

async function getCallerRole(uid: string) {
  const user = await db.doc(`users/${uid}`).get()
  return user.data()?.role as string | undefined
}

async function requireAcademicStaff(uid: string) {
  const role = await getCallerRole(uid)
  if (role !== 'teacher' && role !== 'admin') throw new HttpsError('permission-denied', 'No tienes permiso para registrar calificaciones.')
  return role
}

// Esqueleto V1: la asignación docente y el cierre del periodo se validarán al poblar sus colecciones.
export const saveGrade = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  await requireAcademicStaff(request.auth.uid)
  const { studentId, enrollmentId, groupId, schoolYearId, subjectPlanId, periodId, periodOrder, score, observation = '' } = request.data
  if (![studentId, enrollmentId, groupId, schoolYearId, subjectPlanId, periodId].every(Boolean) || !Number.isInteger(periodOrder) || periodOrder < 1 || periodOrder > 3 || typeof score !== 'number' || score < 0 || score > 10) throw new HttpsError('invalid-argument', 'Los datos de calificación son inválidos.')
  const roundedScore = Math.round(score)
  const gradeId = `${enrollmentId}_${subjectPlanId}_${periodId}`
  const gradeRef = db.doc(`grades/${gradeId}`)
  const previous = await gradeRef.get()
  await gradeRef.set({ studentId, enrollmentId, groupId, schoolYearId, subjectPlanId, periodId, periodOrder, score, roundedScore, observation, teacherId: request.auth.uid, updatedAt: new Date(), createdAt: previous.exists ? previous.data()?.createdAt : new Date() }, { merge: true })
  if (previous.exists && previous.data()?.score !== score) await gradeRef.collection('history').add({ previousScore: previous.data()?.score, newScore: score, changedBy: request.auth.uid, changedAt: new Date(), reason: observation })
  return { gradeId, roundedScore }
})

export const listGrades = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  await requireAcademicStaff(request.auth.uid)
  const groupId = request.data.groupId
  if (!groupId) throw new HttpsError('invalid-argument', 'Indica el grupo.')
  const snapshot = await db.collection('grades').where('groupId', '==', groupId).limit(100).get()
  return { grades: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) }
})
