import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Grade } from '@/types/models'

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
}

// Modo gratuito de prueba: solo administradores escriben mediante Firestore Rules.
// En producción se sustituye por Cloud Functions para validar asignaciones docentes.
export async function saveGrade(input: SaveGradeInput) {
  const roundedScore = Math.round(input.score)
  const gradeId = `${input.enrollmentId}_${input.subjectPlanId}_${input.periodId}`
  const gradeRef = doc(db, 'grades', gradeId)
  const previous = await getDoc(gradeRef)
  await setDoc(gradeRef, { ...input, roundedScore, updatedAt: serverTimestamp(), createdAt: previous.exists() ? previous.data().createdAt : serverTimestamp() }, { merge: true })
  if (previous.exists() && previous.data().score !== input.score) {
    await addDoc(collection(gradeRef, 'history'), { previousScore: previous.data().score, newScore: input.score, changedAt: serverTimestamp(), reason: input.observation ?? '' })
  }
  return { gradeId, roundedScore }
}

export async function listGrades(groupId: string) {
  const snapshot = await getDocs(query(collection(db, 'grades'), where('groupId', '==', groupId), limit(100)))
  return snapshot.docs.map((grade) => ({ id: grade.id, ...grade.data() }) as Grade)
}
