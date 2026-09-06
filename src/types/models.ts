export type UserRole = 'admin' | 'teacher' | 'student' | 'guardian'

export interface UserProfile {
  id: string
  role: UserRole
  displayName: string
  email: string
}

export interface Grade {
  id: string
  studentId: string
  enrollmentId: string
  groupId: string
  schoolYearId: string
  subjectPlanId: string
  periodId: string
  periodOrder: number
  score: number
  roundedScore: number
  teacherId: string
}
