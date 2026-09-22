export type UserRole = 'admin' | 'teacher' | 'student' | 'guardian'
export type ActiveStatus = 'active' | 'inactive'
export type TeacherSpecialty = 'general' | 'physical' | 'english' | 'arts'

export interface Entity {
  id: string
  createdAt?: unknown
  updatedAt?: unknown
  updatedBy?: string
  revision?: number
  auditId?: string
}
export interface UserProfile {
  id: string
  role: UserRole
  displayName?: string
  email?: string
  active?: boolean
}
export interface Student extends Entity {
  names: string
  surnames: string
  curp: string
  birthDate: string
  sex: string
  matricula: string
  status: ActiveStatus
}
export interface Guardian extends Entity {
  name: string
  email: string
  phone: string
  address: string
  education: string
  occupation: string
  status: ActiveStatus
}
export interface StudentGuardian extends Entity {
  studentId: string
  guardianId: string
  relationship: string
  primary: boolean
}
export interface Teacher extends Entity {
  name: string
  email: string
  phone: string
  specialty: TeacherSpecialty
  status: ActiveStatus
}
export interface SchoolYear extends Entity {
  name: string
  startDate: string
  endDate: string
  status: 'active' | 'closed' | 'planned'
}
export interface CurriculumPlan extends Entity {
  name: string
  version: string
  status: ActiveStatus
}
export interface SubjectPlan extends Entity {
  curriculumPlanId: string
  name: string
  grade: number
  specialty: TeacherSpecialty
  status: ActiveStatus
}
export interface Group extends Entity {
  schoolYearId: string
  curriculumPlanId: string
  grade: number
  label: string
  shift: string
  status: ActiveStatus
  generalTeacherId: string
  physicalTeacherId: string
  englishTeacherId: string
  artsTeacherId: string
}
export interface GradingPeriod extends Entity {
  schoolYearId: string
  name: string
  order: number
  startDate: string
  endDate: string
  status: 'open' | 'closed'
}
export interface Enrollment extends Entity {
  studentId: string
  groupId: string
  schoolYearId: string
  startDate: string
  endDate: string
  status: 'active' | 'transferred' | 'withdrawn'
  reason: string
}
export interface Grade extends Entity {
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
  observation: string
  correctionReason?: string
  version?: number
}
export interface AuditLog extends Entity {
  action: string
  entityType: string
  entityId: string
  actorId: string
}
export interface AcademicData {
  students: Student[]
  guardians: Guardian[]
  studentGuardians: StudentGuardian[]
  teachers: Teacher[]
  schoolYears: SchoolYear[]
  curriculumPlans: CurriculumPlan[]
  subjectPlans: SubjectPlan[]
  groups: Group[]
  gradingPeriods: GradingPeriod[]
  enrollments: Enrollment[]
  grades: Grade[]
  auditLogs: AuditLog[]
}
export type EditableCollection = Exclude<keyof AcademicData, 'enrollments' | 'grades' | 'auditLogs'>
export const emptyAcademicData: AcademicData = {
  students: [], guardians: [], studentGuardians: [], teachers: [], schoolYears: [],
  curriculumPlans: [], subjectPlans: [], groups: [], gradingPeriods: [],
  enrollments: [], grades: [], auditLogs: [],
}
