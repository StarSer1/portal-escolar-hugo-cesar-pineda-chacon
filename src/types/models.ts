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
  subjectId: string
  periodId: string
  score: number
  teacherId: string
}

