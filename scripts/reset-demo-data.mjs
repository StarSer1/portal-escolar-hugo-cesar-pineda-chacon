// Replaces the academic records with a coherent demonstration dataset.
// Administrator profiles and accounts are never touched.
//
// Inventory only (default, read-only):
//   node scripts/reset-demo-data.mjs --project PROJECT_ID
// Delete academic records, then load the demonstration dataset:
//   node scripts/reset-demo-data.mjs --project PROJECT_ID --purge --seed --confirm PROJECT_ID
//
// --purge writes a full JSON backup to .backups/ before deleting anything and
// stops if no active administrator profile would remain. It also deletes the
// Firebase Authentication accounts linked to teacher profiles (never admins).
// --seed refuses to run while academic records exist, so it never duplicates.
// Requires a Firebase CLI login with access to the project.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
const require = createRequire(import.meta.url)
delete process.env.DEBUG
const { getProjectDefaultAccount, getAccessToken } = require('firebase-tools/lib/auth')

const argument = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] ?? '' : '' }
const project = argument('--project')
const purge = process.argv.includes('--purge')
const seed = process.argv.includes('--seed')
if (!/^[a-z][a-z0-9-]{4,62}$/.test(project)) throw new Error('Indica --project con el ID exacto del proyecto.')
if ((purge || seed) && argument('--confirm') !== project) throw new Error('Para modificar datos repite el ID del proyecto con --confirm.')

const account = getProjectDefaultAccount(process.cwd())
if (!account) throw new Error('Inicia sesión con Firebase CLI antes de ejecutar el script.')
const token = await getAccessToken(account.tokens.refresh_token, [])
const root = `projects/${project}/databases/(default)/documents`
const base = `https://firestore.googleapis.com/v1/${root}`
const headers = { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers })
  if (!response.ok) throw new Error(`La API respondió HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`)
  return response.json()
}
async function list(collection) {
  const result = []
  let pageToken = ''
  do {
    const page = await request(`${base}/${collection}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`)
    result.push(...(page.documents ?? []))
    pageToken = page.nextPageToken ?? ''
  } while (pageToken)
  return result
}
async function listGroup(collectionId) {
  const rows = await request(`${base}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId, allDescendants: true }] } }) })
  return rows.filter((row) => row.document).map((row) => row.document)
}
async function commit(writes) {
  for (let offset = 0; offset < writes.length; offset += 400) {
    await request(`${base}:commit`, { method: 'POST', body: JSON.stringify({ writes: writes.slice(offset, offset + 400) }) })
  }
}

// ---- Firestore value encoding ------------------------------------------------
function encode(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (typeof value === 'string') return { stringValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } }
}
const field = (document, name) => {
  const value = document.fields?.[name]
  return value ? value.stringValue ?? value.booleanValue ?? value.integerValue ?? value.doubleValue : undefined
}
const idOf = (document) => document.name.split('/').at(-1)

// ---- Inventory ----------------------------------------------------------------
const academic = ['students', 'guardians', 'studentGuardians', 'teachers', 'schoolYears', 'curriculumPlans', 'subjectPlans',
  'groups', 'gradingPeriods', 'enrollments', 'grades', 'auditLogs']
const support = ['studentIdentifiers', 'guardianSlots', 'enrollmentSlots', 'teacherEmails', 'academicSettings']
const snapshot = {}
for (const name of [...academic, ...support, 'users']) snapshot[name] = await list(name)
snapshot.gradeHistory = await listGroup('history')

const admins = snapshot.users.filter((user) => field(user, 'role') === 'admin')
const activeAdmins = admins.filter((user) => field(user, 'active') === true)
const adminUids = new Set(admins.map(idOf))
const otherProfiles = snapshot.users.filter((user) => field(user, 'role') !== 'admin')
const teacherUids = new Set([
  ...otherProfiles.filter((user) => field(user, 'role') === 'teacher').map(idOf),
  ...snapshot.teachers.map((teacher) => field(teacher, 'authUid')).filter(Boolean),
].filter((uid) => !adminUids.has(uid)))

const counts = Object.fromEntries([...academic, ...support, 'gradeHistory'].map((name) => [name, snapshot[name].length]))
console.log(JSON.stringify({ project, mode: [purge && 'purge', seed && 'seed'].filter(Boolean).join('+') || 'inventario (solo lectura)',
  administradoresConservados: admins.length, administradoresActivos: activeAdmins.length,
  perfilesNoAdministradorAEliminar: otherProfiles.length, cuentasDocentesAEliminar: teacherUids.size, registros: counts }, null, 2))

// ---- Purge --------------------------------------------------------------------
if (purge) {
  if (activeAdmins.length === 0) throw new Error('No hay un perfil de administrador activo. No se elimina nada para evitar perder el acceso.')
  mkdirSync('.backups', { recursive: true })
  const backupFile = `.backups/${project}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(backupFile, JSON.stringify(snapshot))
  console.log(`Respaldo completo guardado en ${backupFile}`)

  // Subcollections first, then every academic and support document, then the
  // non-administrator profiles. Administrator profiles are filtered out twice.
  const doomed = [...snapshot.gradeHistory, ...academic.flatMap((name) => snapshot[name]), ...support.flatMap((name) => snapshot[name]),
    ...otherProfiles.filter((user) => !adminUids.has(idOf(user)))]
  await commit(doomed.map((document) => ({ delete: document.name })))
  console.log(`Documentos eliminados: ${doomed.length}`)

  const uids = [...teacherUids]
  for (let offset = 0; offset < uids.length; offset += 900) {
    await request(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:batchDelete`, {
      method: 'POST', headers: { ...headers, 'x-goog-user-project': project }, body: JSON.stringify({ localIds: uids.slice(offset, offset + 900), force: true }),
    })
  }
  console.log(`Cuentas docentes eliminadas de Authentication: ${uids.length}`)
  for (const name of academic) snapshot[name] = []
}

// ---- Seed ---------------------------------------------------------------------
if (seed) {
  if (academic.some((name) => snapshot[name].length > 0)) throw new Error('Ya hay registros académicos. Usa --purge --seed para reemplazarlos.')
  const actorId = idOf(activeAdmins[0] ?? admins[0] ?? {})
  if (!actorId) throw new Error('Se necesita un perfil de administrador para firmar la bitácora.')

  // Deterministic generator: the same run always yields the same people.
  let state = 20260831
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
  const pick = (items) => items[Math.floor(random() * items.length)]
  const autoId = () => randomBytes(15).toString('base64url').replace(/[^A-Za-z0-9]/g, 'x').slice(0, 20)

  const writes = []
  const audits = []
  // A timeline from the start of the cycle setup until today, one tick per write.
  const clock = { at: new Date('2026-08-17T15:00:00Z').getTime() }
  const tick = (minutes = 7) => { clock.at += minutes * 60_000; return new Date(clock.at) }
  const jumpTo = (iso) => { clock.at = Math.max(clock.at, new Date(iso).getTime()) }

  function put(collection, id, data) {
    writes.push({ update: { name: `${root}/${collection}/${id}`, fields: encode(data).mapValue.fields } })
  }
  function audited(collection, id, data, { action, previous = null, at = tick() } = {}) {
    const auditId = autoId()
    const record = { ...data, createdAt: previous?.createdAt ?? at, updatedAt: at, updatedBy: actorId, revision: (previous?.revision ?? 0) + 1, auditId }
    put(collection, id, record)
    put('auditLogs', auditId, { action: action ?? (previous ? 'update' : 'create'), entityType: collection, entityId: id, actorId, createdAt: at, previousData: previous })
    audits.push(auditId)
    return { record, auditId, at }
  }

  // Cycle, plan and periods.
  const yearId = autoId()
  const year = audited('schoolYears', yearId, { name: '2026-2027', startDate: '2026-08-31', endDate: '2027-07-16', status: 'active' }).record
  put('academicSettings', 'currentYear', { schoolYearId: yearId, updatedAt: year.updatedAt, updatedBy: actorId })
  const planId = autoId()
  audited('curriculumPlans', planId, { name: 'Plan de estudios de primaria', version: '2022', status: 'active' })
  const periods = [
    { name: 'Primer periodo', order: 1, startDate: '2026-08-31', endDate: '2026-11-27', status: 'open' },
    { name: 'Segundo periodo', order: 2, startDate: '2026-11-30', endDate: '2027-03-19', status: 'closed' },
    { name: 'Tercer periodo', order: 3, startDate: '2027-03-22', endDate: '2027-07-16', status: 'closed' },
  ].map((period) => ({ ...period, id: `${yearId}_${period.order}` }))
  for (const { id, ...period } of periods) audited('gradingPeriods', id, { schoolYearId: yearId, ...period })

  // Subjects: the general teacher's subjects change with the grade.
  const generalSubjects = (grade) => [
    'Español', 'Matemáticas',
    ...(grade <= 2 ? ['Conocimiento del Medio'] : ['Ciencias Naturales', 'Formación Cívica y Ética']),
    ...(grade === 3 ? ['La Entidad donde Vivo'] : []),
    ...(grade >= 4 ? ['Historia', 'Geografía'] : []),
  ]
  const subjects = []
  for (let grade = 1; grade <= 6; grade += 1) {
    const list = [...generalSubjects(grade).map((name) => ({ name, specialty: 'general' })),
      { name: 'Educación Física', specialty: 'physical' }, { name: 'Inglés', specialty: 'english' }, { name: 'Artes', specialty: 'arts' }]
    for (const subject of list) {
      const id = autoId()
      audited('subjectPlans', id, { curriculumPlanId: planId, name: subject.name, grade, specialty: subject.specialty, status: 'active' }, { at: tick(2) })
      subjects.push({ id, grade, ...subject })
    }
  }

  // Teachers, without portal access: enabling it is part of what to try out.
  const teacherSeed = [
    ['Laura Méndez Ortega', 'general'], ['Patricia Valdez Rosas', 'general'], ['Jorge Amador Lucero', 'general'],
    ['Claudia Geraldo Cota', 'general'], ['Rosa Elena Murillo Castro', 'general'], ['Martha Castillo Ruiz', 'general'],
    ['Gabriela Torres Lima', 'general'], ['Óscar Higuera León', 'physical'], ['Karla Sández Moreno', 'english'],
    ['Irma Lizárraga Cota', 'arts'], ['Ramón Avilés Peralta', 'general'],
  ]
  jumpTo('2026-08-20T15:00:00Z')
  const teachers = teacherSeed.map(([name, specialty], index) => {
    const id = autoId()
    const email = `docente${String(index + 1).padStart(2, '0')}.prueba@example.com`
    const status = index === teacherSeed.length - 1 ? 'inactive' : 'active'
    const { at } = audited('teachers', id, { name, email, phone: `612 ${100 + index * 37} ${String(10 + index * 7).padStart(2, '0')} ${String(20 + index * 3).padStart(2, '0')}`, specialty, status, authUid: '' })
    put('teacherEmails', email, { teacherId: id, blocked: false, updatedAt: at, updatedBy: actorId })
    return { id, name, specialty, status }
  })
  const specialist = (specialty) => teachers.find((teacher) => teacher.specialty === specialty).id
  const generals = teachers.filter((teacher) => teacher.specialty === 'general' && teacher.status === 'active')

  // Groups: one per grade plus a second first-grade group, so transfers can be tried.
  jumpTo('2026-08-24T15:00:00Z')
  const groupSeed = [[1, 'A', 'matutino'], [1, 'B', 'vespertino'], [2, 'A', 'matutino'], [3, 'A', 'matutino'], [4, 'A', 'matutino'], [5, 'A', 'matutino'], [6, 'A', 'matutino']]
  const groups = groupSeed.map(([grade, label, shift], index) => {
    const id = autoId()
    audited('groups', id, { schoolYearId: yearId, curriculumPlanId: planId, grade, label, shift, status: 'active',
      generalTeacherId: generals[index].id, physicalTeacherId: specialist('physical'), englishTeacherId: specialist('english'), artsTeacherId: specialist('arts') })
    return { id, grade, label, generalTeacherId: generals[index].id }
  })
  const teacherFor = (group, specialty) => specialty === 'general' ? group.generalTeacherId : specialist(specialty)

  // Families: surnames shared by siblings and their guardians.
  const surnames = ['García', 'Hernández', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz',
    'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Díaz', 'Gutiérrez', 'Ruiz', 'Mendoza', 'Aguilar',
    'Ortiz', 'Castillo', 'Romero', 'Domínguez', 'Murillo', 'Cota', 'Amador', 'Higuera', 'Lucero', 'Verdugo', 'Geraldo', 'Avilés']
  const girls = ['Valentina', 'Sofía', 'Regina', 'Camila', 'Ximena', 'María José', 'Renata', 'Victoria', 'Romina', 'Natalia', 'Abril', 'Paula', 'Emilia', 'Alexa']
  const boys = ['Santiago', 'Mateo', 'Sebastián', 'Leonardo', 'Emiliano', 'Diego', 'Iker', 'Matías', 'Gael', 'Tadeo', 'Luis Fernando', 'Ángel', 'Daniel', 'Rodrigo']
  const mothers = ['Ana', 'Claudia', 'Mónica', 'Verónica', 'Adriana', 'Laura', 'Gabriela', 'Leticia', 'Rocío', 'Alejandra', 'Diana', 'Karina']
  const fathers = ['José', 'Juan Carlos', 'Miguel', 'Francisco', 'Jesús', 'Alejandro', 'Ricardo', 'Fernando', 'Roberto', 'Héctor', 'Arturo', 'Raúl']
  const occupations = ['Docencia', 'Comercio', 'Enfermería', 'Hogar', 'Pesca', 'Contabilidad', 'Turismo', 'Construcción', 'Administración', 'Transporte']
  const education = ['Secundaria', 'Bachillerato', 'Licenciatura', 'Licenciatura', 'Posgrado', 'Primaria']
  const streets = ['Calle Madero', 'Calle Revolución', 'Av. Álvaro Obregón', 'Calle Guillermo Prieto', 'Calle Independencia', 'Av. Forjadores', 'Calle Nicolás Bravo']
  const plain = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z]/g, '')
  const consonants = (text) => (plain(text).slice(1).match(/[BCDFGHJKLMNPQRSTVWXYZ]/) ?? ['X'])[0]
  const usedCurps = new Set()
  function curp(names, first, second, birthDate, sex) {
    const p1 = plain(first); const p2 = plain(second); const n = plain(names)
    const vowel = (p1.slice(1).match(/[AEIOU]/) ?? ['X'])[0]
    const stem = `${p1[0]}${vowel}${p2[0]}${n[0]}${birthDate.slice(2, 4)}${birthDate.slice(5, 7)}${birthDate.slice(8, 10)}${sex}BS${consonants(first)}${consonants(second)}${consonants(names)}`
    for (let digit = 0; ; digit += 1) {
      const value = `${stem}0${digit % 10}`.slice(0, 16) + String.fromCharCode(65 + (digit % 26)) + String(digit % 10)
      if (!usedCurps.has(value)) { usedCurps.add(value); return value }
    }
  }

  // Students are registered over the last week of August, before the cycle starts.
  jumpTo('2026-08-25T15:00:00Z')
  const students = []
  const guardians = []
  let matricula = 1
  const perGroup = [6, 5, 6, 6, 6, 6, 6]
  const seats = groups.flatMap((group, index) => Array.from({ length: perGroup[index] }, () => group))
  // Two extra students stay without enrollment, so the pending list has something to show.
  seats.push(null, null)
  let surnameIndex = 0
  for (let seat = 0; seat < seats.length;) {
    const first = surnames[surnameIndex % surnames.length]
    const second = surnames[(surnameIndex * 7 + 5) % surnames.length]
    surnameIndex += 1
    const siblings = seat + 1 < seats.length && random() < 0.3 ? 2 : 1
    const family = []
    for (let child = 0; child < siblings; child += 1, seat += 1) {
      const group = seats[seat]
      const grade = group?.grade ?? 1 + Math.floor(random() * 6)
      const sex = random() < 0.5 ? 'M' : 'H'
      const names = sex === 'M' ? pick(girls) : pick(boys)
      const birthYear = 2026 - 5 - grade
      const birthDate = `${birthYear}-${String(1 + Math.floor(random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(random() * 28)).padStart(2, '0')}`
      const id = autoId()
      const entry = 2026 - grade + 1
      const data = { names, surnames: `${first} ${second}`, curp: curp(names, first, second, birthDate, sex), birthDate, sex,
        matricula: `HC-${entry}-${String(matricula++).padStart(4, '0')}`, status: 'active' }
      const { at } = audited('students', id, data, { at: tick(11) })
      put('studentIdentifiers', `curp_${data.curp}`, { studentId: id, updatedAt: at })
      put('studentIdentifiers', `matricula_${data.matricula}`, { studentId: id, updatedAt: at })
      const student = { id, group, ...data }
      students.push(student)
      family.push(student)
    }
    // Guardians: most families register the mother, some both parents; the last
    // family has none yet, so linking a guardian can be tried out.
    const roll = random()
    if (seat >= seats.length) continue
    const mother = { id: autoId(), name: `${pick(mothers)} ${second} ${pick(surnames)}`, relationship: 'Madre' }
    const father = { id: autoId(), name: `${pick(fathers)} ${first} ${pick(surnames)}`, relationship: 'Padre' }
    const people = roll < 0.65 ? [mother] : roll < 0.85 ? [mother, father] : [father]
    people.forEach((person, order) => {
      const local = plain(person.name.split(' ')[0]).toLowerCase()
      const { at } = audited('guardians', person.id, {
        name: person.name, email: random() < 0.8 ? `${local}${guardians.length + 101}@example.com` : '',
        phone: `612 ${String(100 + Math.floor(random() * 899))} ${String(10 + Math.floor(random() * 89))} ${String(10 + Math.floor(random() * 89))}`,
        address: `${pick(streets)} ${100 + Math.floor(random() * 1800)}, La Paz, B.C.S.`, education: pick(education), occupation: pick(occupations), status: 'active',
      }, { at: tick(4) })
      guardians.push({ ...person, at })
      for (const student of family) {
        const linkId = `${student.id}_${person.id}`
        const primary = order === 0
        audited('studentGuardians', linkId, { studentId: student.id, guardianId: person.id, relationship: person.relationship, primary }, { at: tick(2) })
        if (primary) put('guardianSlots', student.id, { studentId: student.id, linkId, updatedAt: new Date(clock.at) })
      }
    })
  }

  // Enrollments on the first day of the cycle.
  jumpTo('2026-08-28T15:00:00Z')
  const enrollments = []
  for (const student of students.filter((item) => item.group)) {
    const id = autoId()
    const { record, at } = audited('enrollments', id, { studentId: student.id, groupId: student.group.id, schoolYearId: yearId,
      startDate: '2026-08-31', endDate: '', status: 'active', reason: '' }, { action: 'enroll', at: tick(3) })
    enrollments.push({ id, student, group: student.group, record, at, previous: '' })
  }
  // One change of group (1° A to 1° B) and one withdrawal (from 4° A).
  jumpTo('2026-09-14T16:20:00Z')
  const moving = enrollments.find((item) => item.group.grade === 1 && item.group.label === 'A')
  const target = groups.find((group) => group.grade === 1 && group.label === 'B')
  {
    const reason = 'Cambio de turno por horario laboral de la familia.'
    const moved = audited('enrollments', moving.id, { ...strip(moving.record), status: 'transferred', endDate: '2026-09-14', reason },
      { action: 'transfer', previous: moving.record })
    const id = autoId()
    const { record, at } = audited('enrollments', id, { studentId: moving.student.id, groupId: target.id, schoolYearId: yearId,
      startDate: '2026-09-14', endDate: '', status: 'active', reason }, { action: 'enroll' })
    moving.record = moved.record
    moving.closed = true
    enrollments.push({ id, student: moving.student, group: target, record, at, previous: moving.id })
  }
  jumpTo('2026-09-25T17:05:00Z')
  const leaving = enrollments.find((item) => item.group.grade === 4 && !item.closed)
  leaving.record = audited('enrollments', leaving.id, { ...strip(leaving.record), status: 'withdrawn', endDate: '2026-09-25',
    reason: 'Cambio de domicilio a otro municipio.' }, { action: 'withdraw', previous: leaving.record }).record
  leaving.closed = true
  leaving.withdrawn = true
  // Enrollment slots reflect the final state of each student in the cycle.
  for (const item of enrollments.filter((entry) => !entry.closed || entry.withdrawn)) {
    put('enrollmentSlots', `${item.student.id}_${yearId}`, { studentId: item.student.id, schoolYearId: yearId,
      currentEnrollmentId: item.withdrawn ? '' : item.id, previousEnrollmentId: item.withdrawn ? item.id : item.previous,
      updatedAt: new Date(clock.at), updatedBy: actorId })
  }

  // First-period grades: each group is at a different point of the capture.
  const progress = { '1A': 1, '1B': 0.6, '2A': 0.85, '3A': 0.4, '4A': 0, '5A': 0.7, '6A': 0.25 }
  const period = periods[0]
  jumpTo('2026-09-28T15:00:00Z')
  const grades = []
  for (const group of groups) {
    const roster = enrollments.filter((item) => item.group.id === group.id && !item.closed)
    const groupSubjects = subjects.filter((subject) => subject.grade === group.grade)
    const slots = groupSubjects.flatMap((subject) => roster.map((enrollment) => ({ subject, enrollment })))
    const quota = Math.round(slots.length * progress[`${group.grade}${group.label}`])
    for (const { subject, enrollment } of slots.slice(0, quota)) {
      const score = Math.round((6 + random() * 4) * 10) / 10
      const id = `${enrollment.id}_${subject.id}_${period.id}`
      const data = { studentId: enrollment.student.id, enrollmentId: enrollment.id, groupId: group.id, schoolYearId: yearId,
        subjectPlanId: subject.id, periodId: period.id, periodOrder: period.order, score, roundedScore: Math.floor(score + 0.5),
        teacherId: teacherFor(group, subject.specialty), observation: score < 7 ? 'Requiere apoyo en casa con la práctica diaria.' : '',
        correctionReason: '', version: 1 }
      const { record } = audited('grades', id, data, { action: 'create-grade', at: tick(3) })
      grades.push({ id, record })
    }
  }
  // A few corrections with their history entry, as the panel records them.
  jumpTo('2026-10-06T16:40:00Z')
  for (const grade of grades.filter((_, index) => index % 37 === 5).slice(0, 3)) {
    const score = Math.min(10, Math.round((grade.record.score + 0.8) * 10) / 10)
    const reason = 'Se capturó antes de sumar el proyecto final del periodo.'
    const { auditId, at } = audited('grades', grade.id, { ...strip(grade.record), score, roundedScore: Math.floor(score + 0.5), correctionReason: reason, version: 2 },
      { action: 'correct-grade', previous: grade.record })
    put(`grades/${grade.id}/history`, auditId, { gradeId: grade.id, previousScore: grade.record.score, newScore: score,
      previousObservation: grade.record.observation, newObservation: grade.record.observation, actorId, reason, version: 2, createdAt: at })
  }

  await commit(writes)
  const enrolled = enrollments.filter((item) => !item.closed).length
  console.log(JSON.stringify({ cargado: { ciclo: '2026-2027', periodos: periods.length, materias: subjects.length, docentes: teachers.length,
    grupos: groups.length, alumnos: students.length, alumnosInscritos: enrolled, tutores: guardians.length, calificaciones: grades.length,
    movimientosEnBitacora: audits.length, documentosEscritos: writes.length } }, null, 2))
}

/** Drops the audit metadata so a record can be rewritten as the next revision. */
function strip(record) {
  const { createdAt: _c, updatedAt: _u, updatedBy: _b, revision: _r, auditId: _a, ...data } = record
  return data
}
