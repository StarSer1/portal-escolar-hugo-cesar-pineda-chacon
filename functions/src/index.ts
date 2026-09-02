import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp()

// Punto único y seguro para registrar una calificación desde el panel docente.
export const saveGrade = onCall(async (request) => {
  if (request.auth?.token.role !== 'teacher' && request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'No tienes permiso para registrar calificaciones.')
  }
  const { studentId, subjectId, periodId, score } = request.data
  if (!studentId || !subjectId || !periodId || typeof score !== 'number' || score < 0 || score > 10) {
    throw new HttpsError('invalid-argument', 'Los datos de calificación son inválidos.')
  }
  await getFirestore().collection('grades').add({ studentId, subjectId, periodId, score, teacherId: request.auth.uid })
  return { ok: true }
})

