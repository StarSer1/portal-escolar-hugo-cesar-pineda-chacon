// Migración única e idempotente: copia en cada inscripción el nombre y la
// matrícula del alumno (campos studentName y matricula). El panel docente ya no
// lee los expedientes de alumnos (CURP, nacimiento), solo estas copias.
// Nunca imprime nombres ni datos personales; solo conteos.
//
// Revisión (no modifica nada):  node scripts/backfill-enrollment-names.mjs --project PROJECT_ID
// Aplicar tras revisar:         node scripts/backfill-enrollment-names.mjs --project PROJECT_ID --apply --confirm PROJECT_ID
// Requiere sesión de Firebase CLI con acceso al proyecto.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
// Firebase CLI enables verbose credential/environment logging when DEBUG is set.
delete process.env.DEBUG
const { getProjectDefaultAccount, getAccessToken } = require('firebase-tools/lib/auth')

const argument = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] ?? '' : '' }
const project = argument('--project')
const apply = process.argv.includes('--apply')
if (!/^[a-z][a-z0-9-]{4,62}$/.test(project)) throw new Error('Indica --project con el ID exacto del proyecto.')
if (apply && argument('--confirm') !== project) throw new Error('Para modificar datos repite el ID del proyecto con --confirm.')
const account = getProjectDefaultAccount(process.cwd())
if (!account) throw new Error('Inicia sesión con Firebase CLI antes de ejecutar la revisión.')
const token = await getAccessToken(account.tokens.refresh_token, [])
const root = `projects/${project}/databases/(default)/documents`
const base = `https://firestore.googleapis.com/v1/${root}`
const headers = { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers })
  if (!response.ok) throw new Error(`Firestore devolvió HTTP ${response.status}; no se completó la operación.`)
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
const text = (document, field) => String(document.fields?.[field]?.stringValue ?? '').trim()

const [students, enrollments] = await Promise.all([list('students'), list('enrollments')])
const byId = new Map(students.map((student) => [student.name.split('/').at(-1), student]))
const writes = []
let missingStudent = 0
let upToDate = 0
for (const enrollment of enrollments) {
  const student = byId.get(text(enrollment, 'studentId'))
  if (!student) { missingStudent += 1; continue }
  // Mismo formato que rosterName() en academic.service.ts y rosterMatches() en las reglas.
  const studentName = `${text(student, 'names')} ${text(student, 'surnames')}`.trim()
  const matricula = String(student.fields?.matricula?.stringValue ?? '')
  if (text(enrollment, 'studentName') === studentName && String(enrollment.fields?.matricula?.stringValue ?? '') === matricula) { upToDate += 1; continue }
  writes.push({
    update: { name: enrollment.name, fields: { studentName: { stringValue: studentName }, matricula: { stringValue: matricula } } },
    updateMask: { fieldPaths: ['studentName', 'matricula'] },
    // Si alguien modificó la inscripción mientras corre la migración, ese lote falla y se puede repetir.
    currentDocument: { updateTime: enrollment.updateTime },
  })
}
console.log(JSON.stringify({ project, mode: apply ? 'apply' : 'dry-run', enrollments: enrollments.length, upToDate, toUpdate: writes.length, missingStudent }))
if (apply) {
  for (let offset = 0; offset < writes.length; offset += 400) {
    await request(`${base}:commit`, { method: 'POST', body: JSON.stringify({ writes: writes.slice(offset, offset + 400) }) })
  }
  console.log(JSON.stringify({ updatedEnrollments: writes.length }))
}
