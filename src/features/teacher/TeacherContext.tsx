import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useAuth } from '@/features/auth/AuthContext'
import type { Enrollment, Grade, GradingPeriod, Group, SchoolYear, Student, SubjectPlan, Teacher } from '@/types/models'

type RosterStudent = Pick<Student, 'id' | 'names' | 'surnames' | 'matricula'>
interface TeacherData {
  teacher: Teacher | null
  schoolYear: SchoolYear | null
  groups: Group[]
  periods: GradingPeriod[]
  enrollments: Enrollment[]
  students: RosterStudent[]
  subjects: SubjectPlan[]
  grades: Grade[]
}
const emptyData: TeacherData = { teacher: null, schoolYear: null, groups: [], periods: [], enrollments: [], students: [], subjects: [], grades: [] }
interface TeacherSession { data: TeacherData; loading: boolean; error: string; refresh: () => void }
const TeacherContext = createContext<TeacherSession>({ data: emptyData, loading: true, error: '', refresh: () => {} })
export const useTeacher = () => useContext(TeacherContext)

function readError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (code.includes('permission-denied')) return 'Tu acceso o tus asignaciones cambiaron. Solicita al director que revise tu cuenta y vuelve a iniciar sesión.'
  return 'No pudimos cargar tus asignaciones. Comprueba tu conexión y vuelve a intentarlo.'
}

export function TeacherProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [data, setData] = useState<TeacherData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const teacherId = profile?.teacherId

  useEffect(() => {
    let disposed = false
    let generation = 0
    let stopGroups = () => {}
    let stopPeriods = () => {}
    let teacher: Teacher | null = null
    let schoolYearId: string | undefined
    const fail = (caught: unknown) => {
      if (disposed) return
      generation += 1
      setError(readError(caught)); setLoading(false); setData(emptyData)
    }
    setLoading(true); setError('')
    setData((current) => current.teacher?.id === teacherId ? current : emptyData)
    if (!user || !teacherId || profile?.role !== 'teacher' || !profile.active) {
      setLoading(false); setError('Tu cuenta aún no está vinculada a un docente activo. Solicita al director que revise el acceso.')
      return
    }

    async function connect() {
      stopGroups(); stopPeriods()
      const currentGeneration = ++generation
      if (disposed || !teacher || schoolYearId === undefined) return
      const ownTeacher = teacher
      if (ownTeacher.status !== 'active' || ownTeacher.authUid !== user!.uid) {
        setData(emptyData); setLoading(false); setError('Tu acceso docente no está activo. Comunícate con el director.'); return
      }
      setLoading(true); setError('')
      if (!schoolYearId) { setData({ ...emptyData, teacher: ownTeacher }); setLoading(false); return }
      try {
        const yearSnapshot = await getDoc(doc(db, 'schoolYears', schoolYearId))
        if (disposed || currentGeneration !== generation) return
        if (!yearSnapshot.exists() || yearSnapshot.data().status !== 'active') {
          setData({ ...emptyData, teacher: ownTeacher }); setLoading(false); return
        }
        const schoolYear = { ...yearSnapshot.data(), id: yearSnapshot.id } as SchoolYear
        let periods: GradingPeriod[] = []
        let groupsLoaded = false
        stopPeriods = onSnapshot(query(collection(db, 'gradingPeriods'), where('schoolYearId', '==', schoolYear.id)), (snapshot) => {
          if (disposed || currentGeneration !== generation) return
          periods = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as GradingPeriod).sort((a, b) => a.order - b.order)
          if (groupsLoaded) setData((current) => ({ ...current, periods }))
        }, fail)
        let groupRevision = 0
        stopGroups = onSnapshot(query(collection(db, 'groups'),
          where(`${ownTeacher.specialty}TeacherId`, '==', ownTeacher.id),
          where('schoolYearId', '==', schoolYear.id), where('status', '==', 'active')),
        async (snapshot) => {
          const revision = ++groupRevision
          const valid = () => !disposed && currentGeneration === generation && revision === groupRevision
          const groups = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Group)
            .sort((a, b) => a.grade - b.grade || a.label.localeCompare(b.label, 'es'))
          try {
            // Every query is bounded to one assigned group or the teacher's own
            // specialty. Never mount the administrative all-collections provider.
            const records = await Promise.all(groups.map(async (group) => {
              const [enrollments, subjects, grades] = await Promise.all([
                getDocs(query(collection(db, 'enrollments'), where('groupId', '==', group.id), where('status', '==', 'active'))),
                getDocs(query(collection(db, 'subjectPlans'), where('curriculumPlanId', '==', group.curriculumPlanId),
                  where('grade', '==', group.grade), where('specialty', '==', ownTeacher.specialty), where('status', '==', 'active'))),
                getDocs(query(collection(db, 'grades'), where('groupId', '==', group.id), where('teacherId', '==', ownTeacher.id))),
              ])
              return {
                enrollments: enrollments.docs.map((item) => ({ ...item.data(), id: item.id }) as Enrollment),
                subjects: subjects.docs.map((item) => ({ ...item.data(), id: item.id }) as SubjectPlan),
                grades: grades.docs.map((item) => ({ ...item.data(), id: item.id }) as Grade),
              }
            }))
            if (!valid()) return
            const enrollments = records.flatMap((item) => item.enrollments)
            const studentIds = [...new Set(enrollments.map((item) => item.studentId))]
            const students = await Promise.all(studentIds.map(async (id): Promise<RosterStudent | null> => {
              const snapshot = await getDoc(doc(db, 'students', id))
              if (!snapshot.exists()) return null
              const value = snapshot.data()
              // The view retains no CURP, date of birth or family contact data.
              return { id, names: String(value.names), surnames: String(value.surnames), matricula: String(value.matricula) }
            }))
            if (!valid()) return
            groupsLoaded = true
            setData({ teacher: ownTeacher, schoolYear, groups, periods, enrollments,
              students: students.filter((item): item is RosterStudent => item !== null),
              subjects: [...new Map(records.flatMap((item) => item.subjects).map((item) => [item.id, item])).values()],
              grades: records.flatMap((item) => item.grades),
            })
            setLoading(false)
          } catch (caught) { if (valid()) fail(caught) }
        }, fail)
      } catch (caught) { if (currentGeneration === generation) fail(caught) }
    }

    const stopTeacher = onSnapshot(doc(db, 'teachers', teacherId), (snapshot) => {
      if (!snapshot.exists()) { generation += 1; stopGroups(); stopPeriods(); setData(emptyData); setLoading(false); setError('No se encontró tu registro docente. Comunícate con el director.'); return }
      teacher = { ...snapshot.data(), id: snapshot.id } as Teacher
      void connect()
    }, fail)
    const stopYear = onSnapshot(doc(db, 'academicSettings', 'currentYear'), (snapshot) => {
      schoolYearId = String(snapshot.data()?.schoolYearId ?? '')
      void connect()
    }, fail)
    return () => { disposed = true; generation += 1; stopTeacher(); stopYear(); stopGroups(); stopPeriods() }
  }, [user, teacherId, profile?.active, profile?.role, attempt])

  return <TeacherContext.Provider value={{ data, loading, error, refresh: () => setAttempt((value) => value + 1) }}>{children}</TeacherContext.Provider>
}
