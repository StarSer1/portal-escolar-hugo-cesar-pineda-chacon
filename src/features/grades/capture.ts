import type { AcademicData, GradingPeriod, Group } from '@/types/models'

export type CaptureState = 'complete' | 'progress' | 'late' | 'none' | 'empty'
export interface GroupCapture { group: Group; students: number; expected: number; captured: number; share: number; state: CaptureState; teacher?: string }

const DAY = 86_400_000
export const dayStamp = (value: string) => new Date(`${value}T12:00:00`).getTime()
/** Whole days from `today` until the end of the period; negative once it has passed. */
export const daysUntil = (period: GradingPeriod, today: string) => Math.round((dayStamp(period.endDate) - dayStamp(today)) / DAY)

/** Days before the close of an open period from which unfinished capture counts as late. */
export const LATE_WINDOW_DAYS = 10

/** The open period of the cycle, else the latest one already started, else the first. */
export function focusPeriod(periods: GradingPeriod[], today: string) {
  const ordered = [...periods].sort((a, b) => a.order - b.order)
  return ordered.find((item) => item.status === 'open') ?? [...ordered].reverse().find((item) => item.startDate <= today) ?? ordered[0]
}

/** Expected captures are active enrollments × active subjects of the group's plan and grade. */
export function captureFor(data: AcademicData, group: Group, period: GradingPeriod | undefined, daysLeft: number | null): GroupCapture {
  const enrollments = new Set(data.enrollments.filter((item) => item.groupId === group.id && item.status === 'active').map((item) => item.id))
  const subjects = new Set(data.subjectPlans.filter((item) => item.curriculumPlanId === group.curriculumPlanId && item.grade === group.grade && item.status === 'active').map((item) => item.id))
  const expected = enrollments.size * subjects.size
  const captured = Math.min(period ? data.grades.filter((grade) => grade.periodId === period.id && enrollments.has(grade.enrollmentId) && subjects.has(grade.subjectPlanId)).length : 0, expected)
  const state: CaptureState = !expected ? 'empty'
    : captured >= expected ? 'complete'
      : daysLeft !== null && daysLeft <= LATE_WINDOW_DAYS ? 'late'
        : captured ? 'progress' : 'none'
  return { group, students: enrollments.size, expected, captured, share: expected ? captured / expected : 0, state, teacher: data.teachers.find((item) => item.id === group.generalTeacherId)?.name }
}

export function captureStateLabel(capture: GroupCapture, open: boolean) {
  if (capture.state === 'empty') return capture.students ? 'Sin materias' : 'Sin alumnos'
  return { complete: 'Completo', progress: 'En captura', late: open ? 'Atrasado' : 'Incompleto', none: 'Sin iniciar' }[capture.state]
}
export const captureTone = { complete: 'success', progress: 'warn', late: 'alert', none: 'muted', empty: 'muted' } as const
