import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, setLogLevel } from 'firebase/firestore'

// Never target a cloud project. This suite requires the local Firestore emulator.
const projectId = 'demo-portal-academico-rules'
let env
let db
let sequence = 0
setLogLevel('silent')
const oldTime = Timestamp.fromDate(new Date('2026-08-01T00:00:00Z'))
const base = { createdAt: oldTime, updatedAt: oldTime, updatedBy: 'admin', revision: 1, auditId: 'seed' }
const student = { names: 'Alumno', surnames: 'Prueba', curp: 'TEST000101HDFABC01', birthDate: '2018-01-01', sex: 'H', matricula: 'QA-001', status: 'active' }
const guardian = { name: 'Tutor Prueba', email: '', phone: '5555555555', address: '', education: '', occupation: '', status: 'active' }
const year = { name: '2026-2027', startDate: '2026-08-01', endDate: '2027-07-31', status: 'active' }
const group = { schoolYearId: 'year', curriculumPlanId: 'plan', grade: 1, label: 'A', shift: 'matutino', status: 'active', generalTeacherId: 'general', physicalTeacherId: 'physical', englishTeacherId: 'english', artsTeacherId: 'arts' }
const enrollment = { studentId: 'student', groupId: 'group', schoolYearId: 'year', startDate: '2026-09-01', endDate: '', status: 'active', reason: '' }
const gradeId = 'enrollment_subject_year_1'
const grade = { studentId: 'student', enrollmentId: 'enrollment', groupId: 'group', schoolYearId: 'year', subjectPlanId: 'subject', periodId: 'year_1', periodOrder: 1, score: 8.5, roundedScore: 9, teacherId: 'general', observation: '', correctionReason: '', version: 1 }

before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } })
})
after(async () => { await env?.cleanup() })
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const seed = context.firestore()
    const data = {
      'users/admin': { role: 'admin', active: true }, 'users/teacher': { role: 'teacher', active: true },
      'users/inactive': { role: 'admin', active: false }, 'users/student': { role: 'student', active: true },
      'students/student': { ...student, ...base }, 'guardians/guardian': { ...guardian, ...base },
      'guardians/guardian2': { ...guardian, name: 'Segundo Tutor', ...base },
      'schoolYears/year': { ...year, ...base }, 'curriculumPlans/plan': { name: 'Plan 2026', version: '1', status: 'active', ...base },
      'academicSettings/currentYear': { schoolYearId: 'year', updatedAt: oldTime, updatedBy: 'admin' },
      'groups/group': { ...group, ...base }, 'groups/group2': { ...group, label: 'B', ...base },
      'subjectPlans/subject': { curriculumPlanId: 'plan', name: 'Español', grade: 1, specialty: 'general', status: 'active', ...base },
      'gradingPeriods/year_1': { schoolYearId: 'year', name: 'Primer periodo', order: 1, startDate: '2026-08-01', endDate: '2026-11-30', status: 'open', ...base },
      [`studentIdentifiers/curp_${student.curp}`]: { studentId: 'student', updatedAt: oldTime },
      'studentIdentifiers/matricula_QA-001': { studentId: 'student', updatedAt: oldTime },
    }
    for (const specialty of ['general', 'physical', 'english', 'arts']) data[`teachers/${specialty}`] = { name: `Docente ${specialty}`, email: '', phone: '', specialty, status: 'active', ...base }
    await Promise.all(Object.entries(data).map(([path, value]) => setDoc(doc(seed, path), value)))
  })
  db = env.authenticatedContext('admin').firestore()
})

function audited(batch, name, id, data, previous, action = previous ? 'update' : 'create') {
  const auditId = `audit${++sequence}`
  batch.set(doc(db, name, id), { ...data, createdAt: previous?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: 'admin', revision: (previous?.revision ?? 0) + 1, auditId })
  batch.set(doc(db, 'auditLogs', auditId), { action, entityType: name, entityId: id, actorId: 'admin', createdAt: serverTimestamp(), previousData: previous ?? null })
  return auditId
}
async function save(name, id, data) {
  const previous = (await getDoc(doc(db, name, id))).data()
  const batch = writeBatch(db)
  audited(batch, name, id, data, previous)
  return batch.commit()
}
function reserveStudent(batch, id, value) {
  for (const key of ['curp', 'matricula']) batch.set(doc(db, 'studentIdentifiers', `${key}_${value[key]}`), { studentId: id, updatedAt: serverTimestamp() })
}
async function seedEnrollment() {
  const batch = writeBatch(db)
  audited(batch, 'enrollments', 'enrollment', enrollment)
  batch.set(doc(db, 'enrollmentSlots', 'student_year'), { studentId: 'student', schoolYearId: 'year', currentEnrollmentId: 'enrollment', previousEnrollmentId: '', updatedBy: 'admin', updatedAt: serverTimestamp() })
  await assertSucceeds(batch.commit())
}
async function correctGrade(changes = {}, includeHistory = true) {
  const previous = (await getDoc(doc(db, 'grades', gradeId))).data()
  const next = { ...previous, score: 9, roundedScore: 9, version: previous.version + 1, correctionReason: 'Revisión del examen', ...changes }
  const batch = writeBatch(db)
  const auditId = audited(batch, 'grades', gradeId, next, previous, 'correct-grade')
  if (includeHistory) batch.set(doc(db, 'grades', gradeId, 'history', auditId), { gradeId, previousScore: previous.score, newScore: next.score, previousObservation: previous.observation, newObservation: next.observation, actorId: 'admin', reason: next.correctionReason, version: next.version, createdAt: serverTimestamp() })
  return batch.commit()
}

test('only active admin can query academic data; each signed-in user can read their own profile', async () => {
  await assertSucceeds(getDocs(collection(db, 'students')))
  for (const uid of ['teacher', 'inactive', 'student', 'unknown']) {
    const other = env.authenticatedContext(uid).firestore()
    await assertFails(getDocs(collection(other, 'students')))
    if (uid !== 'unknown') await assertSucceeds(getDoc(doc(other, 'users', uid)))
    await assertFails(setDoc(doc(other, 'users', uid), { role: 'admin', active: true }))
  }
  await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), 'students')))
  await assertFails(setDoc(doc(db, 'users', 'newAdmin'), { role: 'admin', active: true }))
})

test('student create/update require atomic audit and unique CURP/matricula; deletion is denied', async () => {
  const value = { ...student, curp: 'TEST000102HDFABC02', matricula: 'QA-002' }
  const batch = writeBatch(db)
  reserveStudent(batch, 'new', value)
  audited(batch, 'students', 'new', value)
  await assertSucceeds(batch.commit())
  await assertSucceeds(save('students', 'new', { ...value, names: 'Nombre corregido' }))
  await assertFails(setDoc(doc(db, 'students', 'new'), { ...value, ...base }))
  await assertFails(deleteDoc(doc(db, 'students', 'new')))
  const duplicate = writeBatch(db)
  reserveStudent(duplicate, 'duplicate', value)
  audited(duplicate, 'students', 'duplicate', value)
  await assertFails(duplicate.commit())
  assert.equal((await getDoc(doc(db, 'students', 'new'))).data().names, 'Nombre corregido')
})

test('student identifier change releases old reservation atomically and reservations cannot be stolen', async () => {
  const previous = (await getDoc(doc(db, 'students', 'student'))).data()
  const value = { ...student, matricula: 'QA-NEW' }
  const batch = writeBatch(db)
  reserveStudent(batch, 'student', value)
  batch.set(doc(db, 'studentIdentifiers', 'matricula_QA-001'), { studentId: '', updatedAt: serverTimestamp() })
  audited(batch, 'students', 'student', value, previous)
  await assertSucceeds(batch.commit())
  await assertFails(setDoc(doc(db, 'studentIdentifiers', `curp_${student.curp}`), { studentId: 'stealer', updatedAt: serverTimestamp() }))
  await assertFails(setDoc(doc(db, 'studentIdentifiers', `curp_${student.curp}`), { studentId: '', updatedAt: serverTimestamp() }))
})

test('invalid student and unsupported fields are denied', async () => {
  await assertFails(save('students', 'student', { ...student, sex: 'invalid' }))
  await assertFails(save('students', 'student', { ...student, secretNote: 'not in schema' }))
  await assertFails(save('students', 'student', { ...student, curp: 'SHORT' }))
})

test('primary guardian replacement demotes old link atomically; two primaries cannot survive', async () => {
  const firstId = 'student_guardian'
  const secondId = 'student_guardian2'
  const link = { studentId: 'student', guardianId: 'guardian', relationship: 'Madre', primary: true }
  const first = writeBatch(db)
  audited(first, 'studentGuardians', firstId, link)
  first.set(doc(db, 'guardianSlots', 'student'), { studentId: 'student', linkId: firstId, updatedAt: serverTimestamp() })
  await assertSucceeds(first.commit())
  const invalid = writeBatch(db)
  audited(invalid, 'studentGuardians', secondId, { ...link, guardianId: 'guardian2' })
  invalid.set(doc(db, 'guardianSlots', 'student'), { studentId: 'student', linkId: secondId, updatedAt: serverTimestamp() })
  await assertFails(invalid.commit())
  const previous = (await getDoc(doc(db, 'studentGuardians', firstId))).data()
  const replacement = writeBatch(db)
  audited(replacement, 'studentGuardians', firstId, { ...link, primary: false }, previous)
  audited(replacement, 'studentGuardians', secondId, { ...link, guardianId: 'guardian2' })
  replacement.set(doc(db, 'guardianSlots', 'student'), { studentId: 'student', linkId: secondId, updatedAt: serverTimestamp() })
  await assertSucceeds(replacement.commit())
  assert.equal((await getDoc(doc(db, 'studentGuardians', firstId))).data().primary, false)
})

test('groups require four specialized teachers; structural references remain immutable', async () => {
  await assertSucceeds(save('groups', 'newgroup', { ...group, label: 'C' }))
  await assertFails(save('groups', 'invalid', { ...group, englishTeacherId: 'physical' }))
  await assertFails(save('groups', 'invalid2', { ...group, artsTeacherId: '' }))
  await assertFails(save('groups', 'group', { ...group, grade: 2 }))
  await assertFails(save('teachers', 'general', { name: 'Docente', email: '', phone: '', specialty: 'arts', status: 'active' }))
})

test('period dates must be inside their year; one period per order and academic year', async () => {
  const value = { schoolYearId: 'year', name: 'Segundo', order: 2, startDate: '2026-12-01', endDate: '2027-03-31', status: 'open' }
  await assertSucceeds(save('gradingPeriods', 'year_2', value))
  await assertFails(save('gradingPeriods', 'arbitrary', value))
  await assertFails(save('gradingPeriods', 'year_3', { ...value, order: 3, endDate: '2028-01-01' }))
  await assertFails(save('gradingPeriods', 'year_3', { ...value, order: 3, startDate: '2027-03-01', endDate: '2027-04-30' }))
  await assertFails(save('gradingPeriods', 'year_3', { ...value, order: 3, startDate: '2027-04-31', endDate: '2027-06-30' }))
})

test('only one academic year can be active; close, activate and reopen require atomic slot', async () => {
  const nextYear = { name: '2027-2028', startDate: '2027-08-01', endDate: '2028-07-31', status: 'planned' }
  await assertSucceeds(save('schoolYears', 'next', nextYear))
  await assertFails(save('schoolYears', 'next', { ...nextYear, status: 'active' }))
  const previous = (await getDoc(doc(db, 'schoolYears', 'year'))).data()
  await assertFails(save('schoolYears', 'year', { ...year, status: 'closed' }))
  const closing = writeBatch(db)
  audited(closing, 'schoolYears', 'year', { ...year, status: 'closed' }, previous)
  closing.set(doc(db, 'academicSettings', 'currentYear'), { schoolYearId: '', updatedBy: 'admin', updatedAt: serverTimestamp() })
  await assertSucceeds(closing.commit())
  const planned = (await getDoc(doc(db, 'schoolYears', 'next'))).data()
  const activate = writeBatch(db)
  audited(activate, 'schoolYears', 'next', { ...nextYear, status: 'active' }, planned)
  activate.set(doc(db, 'academicSettings', 'currentYear'), { schoolYearId: 'next', updatedBy: 'admin', updatedAt: serverTimestamp() })
  await assertSucceeds(activate.commit())
  const closed = (await getDoc(doc(db, 'schoolYears', 'year'))).data()
  const steal = writeBatch(db)
  audited(steal, 'schoolYears', 'year', year, closed)
  steal.set(doc(db, 'academicSettings', 'currentYear'), { schoolYearId: 'year', updatedBy: 'admin', updatedAt: serverTimestamp() })
  await assertFails(steal.commit())
  await assertFails(save('schoolYears', 'next', { ...nextYear, startDate: '2027-07-31', status: 'active' }))
  const closeNext = writeBatch(db)
  audited(closeNext, 'schoolYears', 'next', { ...nextYear, status: 'closed' }, (await getDoc(doc(db, 'schoolYears', 'next'))).data())
  closeNext.set(doc(db, 'academicSettings', 'currentYear'), { schoolYearId: '', updatedBy: 'admin', updatedAt: serverTimestamp() })
  await assertSucceeds(closeNext.commit())
  const reopen = writeBatch(db)
  audited(reopen, 'schoolYears', 'year', year, closed)
  reopen.set(doc(db, 'academicSettings', 'currentYear'), { schoolYearId: 'year', updatedBy: 'admin', updatedAt: serverTimestamp() })
  await assertSucceeds(reopen.commit())
})

test('inactive groups cannot reference missing years or plans', async () => {
  await assertFails(save('groups', 'orphan', { ...group, status: 'inactive', curriculumPlanId: 'missing' }))
  await assertFails(save('groups', 'orphan2', { ...group, status: 'inactive', schoolYearId: 'missing' }))
})

test('birth dates must be real calendar dates and cannot be in the future', async () => {
  await assertFails(save('students', 'student', { ...student, birthDate: '2018-02-30' }))
  await assertFails(save('students', 'student', { ...student, birthDate: '2999-01-01' }))
  await assertSucceeds(save('students', 'student', { ...student, birthDate: '2020-02-29' }))
})

test('enrollment requires one active slot; transfer preserves old record and withdrawal clears slot', async () => {
  await seedEnrollment()
  const duplicate = writeBatch(db)
  audited(duplicate, 'enrollments', 'duplicate', enrollment)
  await assertFails(duplicate.commit())
  const previous = (await getDoc(doc(db, 'enrollments', 'enrollment'))).data()
  const transfer = writeBatch(db)
  audited(transfer, 'enrollments', 'enrollment', { ...enrollment, status: 'transferred', endDate: '2026-10-01', reason: 'Cambio de grupo' }, previous, 'transfer')
  audited(transfer, 'enrollments', 'enrollment2', { ...enrollment, groupId: 'group2', startDate: '2026-10-01', reason: 'Cambio de grupo' })
  transfer.set(doc(db, 'enrollmentSlots', 'student_year'), { studentId: 'student', schoolYearId: 'year', currentEnrollmentId: 'enrollment2', previousEnrollmentId: 'enrollment', updatedBy: 'admin', updatedAt: serverTimestamp() })
  await assertSucceeds(transfer.commit())
  const current = (await getDoc(doc(db, 'enrollments', 'enrollment2'))).data()
  const withdrawal = writeBatch(db)
  audited(withdrawal, 'enrollments', 'enrollment2', { ...current, status: 'withdrawn', endDate: '2026-10-10', reason: 'Baja solicitada' }, current, 'withdraw')
  withdrawal.set(doc(db, 'enrollmentSlots', 'student_year'), { studentId: 'student', schoolYearId: 'year', currentEnrollmentId: '', previousEnrollmentId: 'enrollment2', updatedBy: 'admin', updatedAt: serverTimestamp() })
  await assertSucceeds(withdrawal.commit())
  assert.equal((await getDoc(doc(db, 'enrollments', 'enrollment'))).data().status, 'transferred')
  assert.equal((await getDoc(doc(db, 'enrollmentSlots', 'student_year'))).data().currentEnrollmentId, '')
})

test('grades validate all relations, assigned teacher, score range and rounding', async () => {
  await seedEnrollment()
  await assertFails(save('grades', gradeId, { ...grade, score: 11, roundedScore: 11 }))
  await assertFails(save('grades', gradeId, { ...grade, roundedScore: 8 }))
  await assertFails(save('grades', gradeId, { ...grade, groupId: 'group2' }))
  await assertFails(save('grades', gradeId, { ...grade, teacherId: 'english' }))
  await assertSucceeds(save('grades', gradeId, grade))
  assert.equal((await getDoc(doc(db, 'grades', gradeId))).data().roundedScore, 9)
})

test('grade correction requires reason, version increment and immutable history paired atomically', async () => {
  await seedEnrollment()
  await assertSucceeds(save('grades', gradeId, grade))
  await assertFails(correctGrade({ correctionReason: '' }))
  await assertFails(correctGrade({}, false))
  await assertFails(correctGrade({ version: 1 }))
  await assertSucceeds(correctGrade())
  const history = await getDocs(collection(db, 'grades', gradeId, 'history'))
  assert.equal(history.size, 1)
  assert.equal(history.docs[0].data().previousScore, 8.5)
  assert.equal(history.docs[0].data().newScore, 9)
  await assertFails(deleteDoc(history.docs[0].ref))
  await assertFails(setDoc(history.docs[0].ref, { reason: 'Alteración' }))
})

test('closed period rejects new grades but allows audited correction of existing grade', async () => {
  await seedEnrollment()
  await assertSucceeds(save('grades', gradeId, grade))
  const period = (await getDoc(doc(db, 'gradingPeriods', 'year_1'))).data()
  await assertSucceeds(save('gradingPeriods', 'year_1', { ...period, status: 'closed' }))
  await assertSucceeds(correctGrade({ score: 10, roundedScore: 10 }))
  await env.withSecurityRulesDisabled(async (context) => {
    await deleteDoc(doc(context.firestore(), 'grades', gradeId))
  })
  await assertFails(save('grades', gradeId, grade))
})

test('audit log preserves full previous document and cannot be modified or forged alone', async () => {
  await assertSucceeds(save('guardians', 'guardian', { ...guardian, phone: '5555550000' }))
  const record = (await getDoc(doc(db, 'guardians', 'guardian'))).data()
  const ref = doc(db, 'auditLogs', record.auditId)
  assert.equal((await getDoc(ref)).data().previousData.phone, guardian.phone)
  await assertFails(deleteDoc(ref))
  await assertFails(setDoc(ref, { action: 'edited' }))
  await assertFails(setDoc(doc(db, 'auditLogs', 'forged'), { action: 'update', entityType: 'guardians', entityId: 'guardian', actorId: 'admin', createdAt: serverTimestamp(), previousData: record }))
})
