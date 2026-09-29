import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, where, setDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, setLogLevel } from 'firebase/firestore'

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
    for (const specialty of ['general', 'physical', 'english', 'arts']) {
      const email = `${specialty}@example.test`
      data[`teachers/${specialty}`] = { name: `Docente ${specialty}`, email, phone: '', specialty, status: 'active', authUid: `teacher-${specialty}`, ...base }
      data[`users/teacher-${specialty}`] = { role: 'teacher', teacherId: specialty, displayName: `Docente ${specialty}`, email, active: true, createdAt: oldTime, updatedAt: oldTime, updatedBy: 'admin' }
      data[`teacherEmails/${email}`] = { teacherId: specialty, blocked: false, updatedAt: oldTime, updatedBy: 'admin' }
    }
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

function teacherDb(specialty = 'general', email = `${specialty}@example.test`) {
  return env.authenticatedContext(`teacher-${specialty}`, { email }).firestore()
}
function reserveEmail(batch, id, email) {
  batch.set(doc(db, 'teacherEmails', email), { teacherId: id, blocked: false, updatedAt: serverTimestamp(), updatedBy: 'admin' })
}
function syncTeacherProfile(batch, id, data, previous = undefined) {
  batch.set(doc(db, 'users', data.authUid), { role: 'teacher', teacherId: id, displayName: data.name, email: data.email,
    active: data.status === 'active', createdAt: previous?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: 'admin' })
}
async function provisionTeacher(id = 'newteacher', changes = {}) {
  const data = { name: 'Docente nuevo', email: `${id}@example.test`, phone: '', specialty: 'general', status: 'active', authUid: `auth-${id}`, ...changes }
  const batch = writeBatch(db)
  reserveEmail(batch, id, data.email)
  audited(batch, 'teachers', id, data)
  if (data.authUid) syncTeacherProfile(batch, id, data)
  return batch.commit()
}
async function teacherGrade(data = grade, { includeAudit = true, specialty = 'general', id = gradeId } = {}) {
  const scoped = teacherDb(specialty)
  const actorId = `teacher-${specialty}`
  const auditId = `teacherAudit${++sequence}`
  const batch = writeBatch(scoped)
  batch.set(doc(scoped, 'grades', id), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: actorId, revision: 1, auditId })
  if (includeAudit) batch.set(doc(scoped, 'auditLogs', auditId), { action: 'create-grade', entityType: 'grades', entityId: id, actorId, createdAt: serverTimestamp(), previousData: null })
  return batch.commit()
}
async function seedOutsideRoster() {
  await env.withSecurityRulesDisabled(async (context) => {
    const seed = context.firestore()
    await setDoc(doc(seed, 'groups', 'outside'), { ...group, generalTeacherId: 'outsideTeacher', ...base })
    await setDoc(doc(seed, 'students', 'outside'), { ...student, names: 'Otro alumno', ...base })
    await setDoc(doc(seed, 'enrollments', 'outsideEnrollment'), { ...enrollment, studentId: 'outside', groupId: 'outside', ...base })
    await setDoc(doc(seed, 'enrollmentSlots', 'outside_year'), { studentId: 'outside', schoolYearId: 'year', currentEnrollmentId: 'outsideEnrollment', previousEnrollmentId: '', updatedAt: oldTime, updatedBy: 'admin' })
    await setDoc(doc(seed, 'subjectPlans', 'englishSubject'), { curriculumPlanId: 'plan', name: 'Ingles', grade: 1, specialty: 'english', status: 'active', ...base })
  })
}

test('director provisions teacher profile only with matching audited teacher and canonical reserved email', async () => {
  await assertSucceeds(provisionTeacher())
  assert.equal((await getDoc(doc(db, 'users', 'auth-newteacher'))).data().role, 'teacher')
  assert.equal((await getDoc(doc(db, 'teachers', 'newteacher'))).data().authUid, 'auth-newteacher')
  const value = { role: 'teacher', teacherId: 'general', displayName: 'Docente general', email: 'general@example.test', active: true,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: 'admin' }
  await assertFails(setDoc(doc(db, 'users', 'arbitrary-account'), value))
  await assertFails(setDoc(doc(db, 'users', 'teacher-general'), { ...value, role: 'admin' }))
  await assertFails(setDoc(doc(db, 'users', 'admin'), { ...value, teacherId: 'newteacher' }))
  const withoutProfile = writeBatch(db)
  reserveEmail(withoutProfile, 'missing-profile', 'missing@example.test')
  audited(withoutProfile, 'teachers', 'missing-profile', { name: 'Sin perfil', email: 'missing@example.test', phone: '', specialty: 'general', status: 'active', authUid: 'missingAuth' })
  await assertFails(withoutProfile.commit())
})

test('teacher email cannot repeat, evade normalization or steal a legacy blocked address', async () => {
  await assertFails(provisionTeacher('duplicate', { email: 'general@example.test' }))
  await assertFails(provisionTeacher('uppercase', { email: 'General@example.test' }))
  await assertFails(provisionTeacher('spaces', { email: ' general@example.test' }))
  await assertFails(save('teachers', 'unreserved', { name: 'Sin reserva', email: 'unreserved@example.test', phone: '', specialty: 'general', status: 'active', authUid: '' }))
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'teacherEmails', 'legacy@example.test'), { teacherId: '', blocked: true, updatedBy: 'migration', updatedAt: oldTime })
  })
  await assertFails(provisionTeacher('legacy', { email: 'legacy@example.test' }))
  await assertFails(deleteDoc(doc(db, 'teacherEmails', 'general@example.test')))
  await assertFails(setDoc(doc(db, 'teacherEmails', 'general@example.test'), { teacherId: '', blocked: false, updatedBy: 'admin', updatedAt: serverTimestamp() }))
})

test('unlinked teacher email can be changed and released atomically; linked email and uid cannot change', async () => {
  await assertSucceeds(provisionTeacher('unlinked', { authUid: '' }))
  const previous = (await getDoc(doc(db, 'teachers', 'unlinked'))).data()
  const next = { ...previous, email: 'replacement@example.test' }
  const batch = writeBatch(db)
  reserveEmail(batch, 'unlinked', next.email)
  reserveEmail(batch, '', previous.email)
  audited(batch, 'teachers', 'unlinked', next, previous)
  await assertSucceeds(batch.commit())
  await assertSucceeds(provisionTeacher('reuse', { email: previous.email }))
  const linked = (await getDoc(doc(db, 'teachers', 'general'))).data()
  await assertFails(save('teachers', 'general', { ...linked, authUid: '' }))
  const takeover = writeBatch(db)
  reserveEmail(takeover, 'general', 'changed@example.test')
  audited(takeover, 'teachers', 'general', { ...linked, email: 'changed@example.test' }, linked)
  syncTeacherProfile(takeover, 'general', { ...linked, email: 'changed@example.test' }, (await getDoc(doc(db, 'users', linked.authUid))).data())
  await assertFails(takeover.commit())
})

test('linked teacher status/name updates must sync profile atomically and deactivate access immediately', async () => {
  const previous = (await getDoc(doc(db, 'teachers', 'general'))).data()
  const profile = (await getDoc(doc(db, 'users', previous.authUid))).data()
  const next = { ...previous, status: 'inactive', name: 'Docente inactivo' }
  await assertFails(save('teachers', 'general', next))
  const batch = writeBatch(db)
  audited(batch, 'teachers', 'general', next, previous)
  syncTeacherProfile(batch, 'general', next, profile)
  await assertSucceeds(batch.commit())
  await assertFails(getDoc(doc(teacherDb(), 'groups', 'group')))
  await assertFails(getDoc(doc(teacherDb(), 'academicSettings', 'currentYear')))
  await assertSucceeds(getDoc(doc(teacherDb(), 'users', 'teacher-general')))
})

test('teacher queries are scoped to own active current groups, rosters and specialty; private catalog denied', async () => {
  await seedEnrollment()
  await seedOutsideRoster()
  const scoped = teacherDb()
  await assertSucceeds(getDoc(doc(scoped, 'teachers', 'general')))
  await assertFails(getDoc(doc(scoped, 'teachers', 'english')))
  await assertSucceeds(getDoc(doc(scoped, 'academicSettings', 'currentYear')))
  await assertSucceeds(getDocs(query(collection(scoped, 'groups'), where('generalTeacherId', '==', 'general'), where('schoolYearId', '==', 'year'), where('status', '==', 'active'))))
  await assertFails(getDocs(collection(scoped, 'groups')))
  await assertFails(getDoc(doc(scoped, 'groups', 'outside')))
  await assertSucceeds(getDocs(query(collection(scoped, 'enrollments'), where('groupId', '==', 'group'), where('status', '==', 'active'))))
  await assertFails(getDocs(collection(scoped, 'enrollments')))
  await assertFails(getDoc(doc(scoped, 'enrollments', 'outsideEnrollment')))
  await assertSucceeds(getDoc(doc(scoped, 'students', 'student')))
  await assertFails(getDoc(doc(scoped, 'students', 'outside')))
  await assertFails(getDocs(collection(scoped, 'students')))
  await assertSucceeds(getDocs(query(collection(scoped, 'subjectPlans'), where('specialty', '==', 'general'), where('curriculumPlanId', '==', 'plan'), where('grade', '==', 1), where('status', '==', 'active'))))
  await assertFails(getDoc(doc(scoped, 'subjectPlans', 'englishSubject')))
  for (const name of ['guardians', 'studentGuardians', 'auditLogs', 'teacherEmails', 'users']) await assertFails(getDocs(collection(scoped, name)))
  await assertFails(setDoc(doc(scoped, 'users', 'teacher-general'), { role: 'admin', active: true }))
  await assertFails(getDoc(doc(teacherDb('general', 'impostor@example.test'), 'groups', 'group')))
})

test('teacher can read transaction relations and atomically capture own grade but cannot correct it', async () => {
  await seedEnrollment()
  const scoped = teacherDb()
  await assertSucceeds(getDoc(doc(scoped, 'grades', gradeId)))
  for (const [name, id] of [['enrollments', 'enrollment'], ['groups', 'group'], ['gradingPeriods', 'year_1'], ['subjectPlans', 'subject'], ['schoolYears', 'year']]) await assertSucceeds(getDoc(doc(scoped, name, id)))
  await assertFails(teacherGrade(grade, { includeAudit: false }))
  await assertSucceeds(teacherGrade())
  await assertSucceeds(getDoc(doc(scoped, 'grades', gradeId)))
  await assertSucceeds(getDocs(query(collection(scoped, 'grades'), where('groupId', '==', 'group'), where('teacherId', '==', 'general'))))
  await assertFails(getDocs(query(collection(scoped, 'grades'), where('groupId', '==', 'group'))))
  await assertFails(teacherGrade({ ...grade, score: 9, roundedScore: 9, version: 2, correctionReason: 'No autorizado' }))
  await assertFails(getDocs(collection(scoped, 'grades', gradeId, 'history')))
  await assertFails(deleteDoc(doc(scoped, 'grades', gradeId)))
  await assertFails(getDoc(doc(teacherDb('english'), 'grades', gradeId)))
})

test('teacher cannot forge grade for other teacher, subject, group or student nor forge an audit alone', async () => {
  await seedEnrollment()
  await seedOutsideRoster()
  await assertFails(teacherGrade({ ...grade, teacherId: 'english' }))
  await assertFails(teacherGrade({ ...grade, subjectPlanId: 'englishSubject', teacherId: 'english' }, { id: 'enrollment_englishSubject_year_1' }))
  await assertFails(teacherGrade({ ...grade, studentId: 'outside' }))
  await assertFails(teacherGrade({ ...grade, studentId: 'outside', groupId: 'outside', enrollmentId: 'outsideEnrollment' }, { id: 'outsideEnrollment_subject_year_1' }))
  const scoped = teacherDb()
  await assertFails(setDoc(doc(scoped, 'auditLogs', 'forged'), { action: 'create-grade', entityType: 'grades', entityId: gradeId, actorId: 'teacher-general', createdAt: serverTimestamp(), previousData: null }))
  await assertFails(setDoc(doc(scoped, 'teachers', 'general'), { name: 'Cambio no autorizado' }))
})

test('teacher capture rejects closed periods and inactive student, enrollment, group or year', async () => {
  await seedEnrollment()
  const targets = [['gradingPeriods', 'year_1', 'closed'], ['students', 'student', 'inactive'], ['enrollments', 'enrollment', 'withdrawn'], ['groups', 'group', 'inactive'], ['schoolYears', 'year', 'closed']]
  for (const [name, id, status] of targets) {
    const original = (await getDoc(doc(db, name, id))).data()
    await env.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), name, id), { ...original, status }) })
    await assertFails(teacherGrade())
    await env.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), name, id), original) })
  }
  await assertSucceeds(teacherGrade())
})

test('changing current year or group assignment revokes teacher reads and capture even with valid login', async () => {
  await seedEnrollment()
  const scoped = teacherDb()
  await assertSucceeds(getDoc(doc(scoped, 'students', 'student')))
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'groups', 'group'), { ...group, generalTeacherId: 'replacement', ...base })
  })
  await assertFails(getDoc(doc(scoped, 'students', 'student')))
  await assertFails(teacherGrade())
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'groups', 'group'), { ...group, ...base })
    await setDoc(doc(context.firestore(), 'academicSettings', 'currentYear'), { schoolYearId: '', updatedAt: oldTime, updatedBy: 'admin' })
  })
  await assertFails(getDoc(doc(scoped, 'groups', 'group')))
  await assertFails(teacherGrade())
})

test('Authentication alone and forged profile-to-teacher links never grant academic access', async () => {
  await seedEnrollment()
  const cases = [
    ['no-profile', undefined],
    ['wrong-uid', { role: 'teacher', active: true, teacherId: 'general', email: 'general@example.test' }],
    ['wrong-teacher', { role: 'teacher', active: true, teacherId: 'english', email: 'general@example.test' }],
    ['inactive-profile', { role: 'teacher', active: false, teacherId: 'general', email: 'general@example.test' }],
  ]
  for (const [uid, profile] of cases) {
    if (profile) await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', uid), profile)
    })
    const scoped = env.authenticatedContext(uid, { email: 'general@example.test' }).firestore()
    for (const [name, id] of [['academicSettings', 'currentYear'], ['groups', 'group'], ['students', 'student'], ['grades', gradeId]]) {
      await assertFails(getDoc(doc(scoped, name, id)))
    }
  }
  // Even the expected UID cannot use a profile email inconsistent with its file.
  await env.withSecurityRulesDisabled(async (context) => {
    const ref = doc(context.firestore(), 'users', 'teacher-general')
    await setDoc(ref, { ...(await getDoc(ref)).data(), email: 'forged@example.test' })
  })
  await assertFails(getDoc(doc(teacherDb(), 'groups', 'group')))
})

test('teacher provisioning rejects password fields in teacher files, user profiles and audit documents', async () => {
  const password = 'Synthetic-DoNotPersist-12345'
  await assertFails(provisionTeacher('secret-file', { password }))
  for (const target of ['profile', 'audit']) {
    const id = `secret-${target}`
    const value = { name: 'Docente prueba', email: `${id}@example.test`, phone: '', specialty: 'general', status: 'active', authUid: `auth-${id}` }
    const batch = writeBatch(db)
    reserveEmail(batch, id, value.email)
    const auditId = audited(batch, 'teachers', id, value)
    syncTeacherProfile(batch, id, value)
    if (target === 'profile') batch.set(doc(db, 'users', value.authUid), {
      role: 'teacher', teacherId: id, displayName: value.name, email: value.email, active: true,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: 'admin', password,
    })
    else batch.set(doc(db, 'auditLogs', auditId), {
      action: 'create', entityType: 'teachers', entityId: id, actorId: 'admin', createdAt: serverTimestamp(), previousData: null, password,
    })
    await assertFails(batch.commit())
    assert.equal((await getDoc(doc(db, 'teachers', id))).exists(), false)
    assert.equal((await getDoc(doc(db, 'users', value.authUid))).exists(), false)
  }
})
