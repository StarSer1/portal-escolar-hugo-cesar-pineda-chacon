// One-time, idempotent reservation of legacy teacher emails. It never changes
// teachers or Authentication accounts and never prints names/emails/tokens.
// Dry run: node scripts/backfill-teacher-emails.mjs --project PROJECT_ID
// Apply after reviewing counts: append --apply. Requires Firebase CLI login.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
// Firebase CLI enables verbose credential/environment logging when DEBUG is set.
delete process.env.DEBUG
const { getProjectDefaultAccount, getAccessToken } = require('firebase-tools/lib/auth')

const projectIndex = process.argv.indexOf('--project')
const project = projectIndex >= 0 ? process.argv[projectIndex + 1] : ''
const apply = process.argv.includes('--apply')
if (!project || !/^[a-z][a-z0-9-]{4,62}$/.test(project)) throw new Error('Indica --project con el ID exacto del proyecto.')
const account = getProjectDefaultAccount(process.cwd())
if (!account) throw new Error('Inicia sesión con Firebase CLI antes de ejecutar la revisión.')
const token = await getAccessToken(account.tokens.refresh_token, [])
const root = `projects/${project}/databases/(default)/documents`
const base = `https://firestore.googleapis.com/v1/${root}`
const headers = { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers })
  if (!response.ok) throw new Error(`Firestore devolvió HTTP ${response.status}; no se modifica ningún registro existente.`)
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
const [teachers, existing] = await Promise.all([list('teachers'), list('teacherEmails')])
const reserved = new Set(existing.map((document) => document.name))
const groups = new Map()
let invalid = 0
for (const teacher of teachers) {
  const email = String(teacher.fields?.email?.stringValue ?? '').trim().toLowerCase()
  if (!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email) || email.length > 254) { invalid += 1; continue }
  const ids = groups.get(email) ?? []
  ids.push(teacher.name.split('/').at(-1))
  groups.set(email, ids)
}
const writes = []
for (const [email, ids] of groups) {
  const name = `${root}/teacherEmails/${email}`
  if (reserved.has(name)) continue
  writes.push({
    update: { name, fields: {
      teacherId: { stringValue: ids.length === 1 ? ids[0] : '' },
      blocked: { booleanValue: ids.length > 1 },
      updatedBy: { stringValue: 'migration:teacher-emails' },
    } },
    updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
    currentDocument: { exists: false },
  })
}
console.log(JSON.stringify({ project, mode: apply ? 'apply' : 'dry-run', teachers: teachers.length,
  distinctEmails: groups.size, duplicateAddresses: [...groups.values()].filter((ids) => ids.length > 1).length,
  invalidEmails: invalid, existingReservations: existing.length, newReservations: writes.length }))
if (apply) {
  // Never overwrite: concurrent creates make a batch fail its preconditions.
  // A rerun skips successful batches and existing reservations.
  for (let offset = 0; offset < writes.length; offset += 400) {
    await request(`${base}:commit`, { method: 'POST', body: JSON.stringify({ writes: writes.slice(offset, offset + 400) }) })
  }
  console.log(JSON.stringify({ createdReservations: writes.length, teacherRecordsModified: 0, authAccountsModified: 0 }))
}
