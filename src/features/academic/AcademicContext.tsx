import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { watchAcademicData } from './services/academic.service'
import type { AcademicData } from '@/types/models'
import { errorMessage } from '@/shared/errors'

const empty = (): AcademicData => ({ students: [], guardians: [], studentGuardians: [], teachers: [], schoolYears: [], curriculumPlans: [], subjectPlans: [], groups: [], gradingPeriods: [], enrollments: [], grades: [], auditLogs: [] })
const AcademicContext = createContext<{ data: AcademicData; loading: boolean; error: string; retry: () => void } | null>(null)
export function AcademicProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AcademicData>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  useEffect(() => {
    setLoading(true); setError(''); setData(empty())
    return watchAcademicData((value) => { setData(value); setLoading(false) }, (caught) => { setError(errorMessage(caught)); setLoading(false) })
  }, [attempt])
  return <AcademicContext.Provider value={{ data, loading, error, retry }}>{children}</AcademicContext.Provider>
}
export function useAcademic() {
  const context = useContext(AcademicContext)
  if (!context) throw new Error('El módulo debe abrirse desde el panel académico.')
  return context
}
