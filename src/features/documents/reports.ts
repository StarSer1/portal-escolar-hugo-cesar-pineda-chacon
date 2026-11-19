import type { AcademicData, Enrollment, Grade, Group, SchoolYear, Student } from '@/types/models'
import { formativeFieldOf, formativeFields, type FormativeField } from './formative'

/** Datos oficiales que aparecen en los formatos de la SEP. */
export const officialSchool = {
  name: 'Profr. Hugo César Piñeda Chacón T.M.',
  cct: '03DPR0046P',
  state: 'BAJA CALIFORNIA SUR',
  zone: '28',
  place: 'La Paz, B.C.S.',
}

/** Marca de agua de los documentos generados mientras el sistema está en prueba. */
export const WATERMARK = 'PRUEBA'

export const shiftLabel = (shift: string) => shift === 'vespertino' ? 'Vespertino' : 'Matutino'
export const shiftCode = (shift: string) => shift === 'vespertino' ? 'TV' : 'TM'
export const groupTitle = (group: Pick<Group, 'grade' | 'label'>) => `${group.grade}° "${group.label}"`
export const sortGroups = (groups: Group[]) => [...groups].sort((a, b) => a.grade - b.grade || a.label.localeCompare(b.label, 'es') || a.shift.localeCompare(b.shift))
export const ordinal = (grade: number) => ['', '1er', '2do', '3er', '4to', '5to', '6to'][grade] ?? `${grade}°`

const particles = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa', 'van', 'von', 'da', 'di', 'mc', 'mac'])
/** Separa "Del Ángel Gómez" en primer y segundo apellido respetando partículas. */
export function splitSurnames(surnames: string): [string, string] {
  const words = surnames.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [words[0] ?? '', '']
  let cut = 0
  while (cut < words.length - 1 && particles.has(words[cut].toLowerCase())) cut += 1
  return [words.slice(0, cut + 1).join(' '), words.slice(cut + 1).join(' ')]
}

/** Edad cumplida a una fecha (AAAA-MM-DD), como DATEDIF(…,"Y") de Excel. */
export function ageAt(birthDate: string, at: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ay, am, ad] = at.split('-').map(Number)
  return ay - by - (am < bm || (am === bm && ad < bd) ? 1 : 0)
}

/** Fecha de corte de la edad oficial: 30 de septiembre del año en que inicia el ciclo. */
export const cutoffDate = (year: SchoolYear) => `${year.startDate.slice(0, 4)}-09-30`

const teacherName = (data: AcademicData, group: Group) => data.teachers.find((item) => item.id === group.generalTeacherId)?.name ?? ''
const byName = (a: Student, b: Student) => a.surnames.localeCompare(b.surnames, 'es') || a.names.localeCompare(b.names, 'es')

/* --- Boleta de evaluación --------------------------------------------- */

export type PeriodScores = [number | null, number | null, number | null]
export interface ReportCard {
  student: Student
  group: Group
  year: SchoolYear
  teacher: string
  /** Calificación de cada campo por periodo (1.º, 2.º y 3.º). */
  scores: Record<FormativeField, PeriodScores>
  finals: Record<FormativeField, number | null>
  finalAverage: number | null
  /** null mientras falten periodos por capturar. */
  promoted: boolean | null
  observations: Record<FormativeField, [string, string, string]>
}

/** Promedio con un decimal sin redondear, como se registra en documentos oficiales. */
export const truncate1 = (value: number) => Math.floor(value * 10 + 1e-9) / 10
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

export function buildReportCard(data: AcademicData, grades: Grade[], student: Student, group: Group, year: SchoolYear): ReportCard {
  const subjects = new Map(data.subjectPlans.map((subject) => [subject.id, formativeFieldOf(subject)]))
  const periodOrder = new Map(data.gradingPeriods.filter((period) => period.schoolYearId === year.id).map((period) => [period.id, period.order]))
  // Todas las calificaciones del alumno en el ciclo, aunque haya cambiado de grupo.
  const own = grades.filter((grade) => grade.studentId === student.id && grade.schoolYearId === year.id)
  const scores = {} as ReportCard['scores']
  const finals = {} as ReportCard['finals']
  const observations = {} as ReportCard['observations']
  for (const field of formativeFields) {
    const perPeriod = [1, 2, 3].map((order) => own.filter((grade) => subjects.get(grade.subjectPlanId) === field && (periodOrder.get(grade.periodId) ?? grade.periodOrder) === order))
    scores[field] = perPeriod.map((list) => list.length ? Math.round(mean(list.map((grade) => grade.roundedScore))) : null) as PeriodScores
    observations[field] = perPeriod.map((list) => list.map((grade) => grade.observation?.trim()).filter(Boolean).join(' ')) as [string, string, string]
    finals[field] = scores[field].every((value) => value !== null) ? truncate1(mean(scores[field] as number[])) : null
  }
  const values = formativeFields.map((field) => finals[field])
  const finalAverage = values.every((value) => value !== null) ? truncate1(mean(values as number[])) : null
  return { student, group, year, teacher: teacherName(data, group), scores, finals, finalAverage, promoted: finalAverage === null ? null : finalAverage >= 6, observations }
}

/** Alumnos de la boleta: inscritos activos del grupo, en orden de lista. */
export function groupStudents(data: AcademicData, group: Group) {
  const ids = new Set(data.enrollments.filter((item) => item.groupId === group.id && item.status === 'active').map((item) => item.studentId))
  return data.students.filter((student) => ids.has(student.id)).sort(byName)
}

/** Materias del grupo sin campo formativo asignado ni sugerido. */
export function unmappedSubjects(data: AcademicData, group: Group) {
  return data.subjectPlans.filter((subject) => subject.curriculumPlanId === group.curriculumPlanId && subject.grade === group.grade && subject.status === 'active' && !formativeFieldOf(subject))
}

/* --- Listado oficial y estadística de inscripción --------------------- */

export interface RosterRow { number: number; matricula: string; firstSurname: string; secondSurname: string; names: string; curp: string; birthDate: string; sex: 'HOMBRE' | 'MUJER'; age: number | null }
export interface Movement { name: string; age: number | null; date: string }
export type SexCounts = { h: [number, number, number]; m: [number, number, number] }
export const statRows = [
  { key: 'inicial', label: 'Inscripción inicial' },
  { key: 'altas', label: 'Altas' },
  { key: 'cobertura', label: 'Cobertura' },
  { key: 'bajas', label: 'Bajas' },
  { key: 'existencia', label: 'Existencia' },
  { key: 'promovidos', label: 'Promovidos' },
  { key: 'noPromovidos', label: 'No promovidos' },
] as const
export type StatKey = typeof statRows[number]['key']

export interface GroupEnrollmentReport {
  group: Group
  year: SchoolYear
  teacher: string
  cutoff: string
  rows: RosterRow[]
  /** Etiquetas de las tres columnas de edad (p. ej. "Menos de 6", "6", "7"). */
  ageLabels: [string, string, string]
  stats: Record<StatKey, SexCounts>
  altas: Movement[]
  bajas: Movement[]
}

const zero = (): SexCounts => ({ h: [0, 0, 0], m: [0, 0, 0] })
export const total = (counts: SexCounts, sex: 'h' | 'm') => counts[sex][0] + counts[sex][1] + counts[sex][2]

export function buildEnrollmentReport(data: AcademicData, grades: Grade[], group: Group, year: SchoolYear): GroupEnrollmentReport {
  const cutoff = cutoffDate(year)
  const young = group.grade + 4
  // Columna 1: edad típica menos uno o menor; columna 3: edad típica más uno o mayor.
  const bucket = (age: number | null) => age === null ? 1 : age <= young ? 0 : age === young + 1 ? 1 : 2
  const ageLabels: [string, string, string] = [group.grade === 1 ? 'Menos de 6' : String(young), String(young + 1), String(young + 2)]
  const students = new Map(data.students.map((student) => [student.id, student]))
  const enrollments = data.enrollments.filter((item) => item.groupId === group.id && students.has(item.studentId))
  const count = (list: Enrollment[]) => {
    const counts = zero()
    for (const item of list) {
      const student = students.get(item.studentId)!
      counts[student.sex === 'M' ? 'm' : 'h'][bucket(ageAt(student.birthDate, cutoff))] += 1
    }
    return counts
  }
  const combine = (a: SexCounts, b: SexCounts, sign = 1): SexCounts => ({ h: a.h.map((value, i) => value + sign * b.h[i]) as SexCounts['h'], m: a.m.map((value, i) => value + sign * b.m[i]) as SexCounts['m'] })

  const initial = enrollments.filter((item) => item.startDate <= cutoff)
  const added = enrollments.filter((item) => item.startDate > cutoff)
  const removed = enrollments.filter((item) => item.status !== 'active')
  const active = enrollments.filter((item) => item.status === 'active')
  const promotedIds = new Set(active.filter((item) => buildReportCard(data, grades, students.get(item.studentId)!, group, year).promoted).map((item) => item.id))

  const stats = {} as Record<StatKey, SexCounts>
  stats.inicial = count(initial)
  stats.altas = count(added)
  stats.cobertura = combine(stats.inicial, stats.altas)
  stats.bajas = count(removed)
  stats.existencia = combine(stats.cobertura, stats.bajas, -1)
  stats.promovidos = count(active.filter((item) => promotedIds.has(item.id)))
  stats.noPromovidos = combine(stats.existencia, stats.promovidos, -1)

  const rows = active.map((item) => students.get(item.studentId)!).sort(byName).map((student, index): RosterRow => {
    const [firstSurname, secondSurname] = splitSurnames(student.surnames)
    return { number: index + 1, matricula: student.matricula, firstSurname, secondSurname, names: student.names, curp: student.curp, birthDate: student.birthDate, sex: student.sex === 'M' ? 'MUJER' : 'HOMBRE', age: ageAt(student.birthDate, cutoff) }
  })
  const movement = (item: Enrollment, date: string): Movement => {
    const student = students.get(item.studentId)!
    return { name: `${student.names} ${student.surnames}`.trim(), age: ageAt(student.birthDate, cutoff), date }
  }
  return {
    group, year, teacher: teacherName(data, group), cutoff, rows, ageLabels, stats,
    altas: added.map((item) => movement(item, item.startDate)).sort((a, b) => a.date.localeCompare(b.date)),
    bajas: removed.map((item) => movement(item, item.endDate || item.startDate)).sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : value
