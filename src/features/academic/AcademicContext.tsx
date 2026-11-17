import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadGrades, watchAcademicData } from './services/academic.service'
import type { AcademicData, Grade } from '@/types/models'
import { errorMessage } from '@/shared/errors'

const empty = (): AcademicData => ({ students: [], guardians: [], studentGuardians: [], teachers: [], schoolYears: [], curriculumPlans: [], subjectPlans: [], groups: [], gradingPeriods: [], enrollments: [], grades: [], auditLogs: [] })
const AcademicContext = createContext<{ data: AcademicData; gradesYearId: string; loading: boolean; error: string; retry: () => void } | null>(null)
export function AcademicProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AcademicData>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [gradesYearId, setGradesYearId] = useState('')
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  useEffect(() => {
    setLoading(true); setError(''); setData(empty())
    return watchAcademicData((value, yearId) => { setData(value); setGradesYearId(yearId); setLoading(false) }, (caught) => { setError(errorMessage(caught)); setLoading(false) })
  }, [attempt])
  return <AcademicContext.Provider value={{ data, gradesYearId, loading, error, retry }}>{children}</AcademicContext.Provider>
}
export function useAcademic() {
  const context = useContext(AcademicContext)
  if (!context) throw new Error('El módulo debe abrirse desde el panel académico.')
  return context
}


/**
 * Calificaciones de un ciclo o de un alumno.
 * - Ciclo actual: las del panel en vivo.
 * - Otro ciclo o el historial de un alumno: una consulta al abrirlo (más las del
 *   ciclo actual en vivo, para ver al momento las capturas nuevas).
 */
export function useGrades(filter: { schoolYearId: string } | { studentId: string }) {
  const { data, gradesYearId } = useAcademic()
  const key = 'schoolYearId' in filter ? `year:${filter.schoolYearId}` : `student:${filter.studentId}`
  const live = 'schoolYearId' in filter && filter.schoolYearId === gradesYearId
  const [loaded, setLoaded] = useState<{ key: string; grades: Grade[]; error: string } | null>(null)
  useEffect(() => {
    if (live || key.endsWith(':')) return
    let active = true
    const [kind, value] = key.split(/:(.*)/s)
    loadGrades(kind === 'year' ? { schoolYearId: value } : { studentId: value })
      .then((grades) => { if (active) setLoaded({ key, grades, error: '' }) })
      .catch((caught: unknown) => { if (active) setLoaded({ key, grades: [], error: errorMessage(caught) }) })
    return () => { active = false }
  }, [key, live])
  return useMemo(() => {
    if (live) return { grades: data.grades, loading: false, error: '' }
    const current = loaded?.key === key ? loaded : null
    const extra = 'studentId' in filter ? data.grades.filter((grade) => grade.studentId === filter.studentId) : []
    const merged = new Map([...(current?.grades ?? []), ...extra].map((grade) => [grade.id, grade]))
    return { grades: [...merged.values()], loading: !current && !key.endsWith(':'), error: current?.error ?? '' }
  }, [live, data.grades, loaded, key]) // eslint-disable-line react-hooks/exhaustive-deps
}
