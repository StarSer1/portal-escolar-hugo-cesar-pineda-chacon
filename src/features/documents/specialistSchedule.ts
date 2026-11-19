import { officialSchool, WATERMARK } from './reports'

/**
 * Horarios de docentes especialistas (Inglés, Educación Física y Artes).
 * El director edita las tablas por especialidad; las hojas por grupo se
 * calculan a partir de ellas, así un cambio no se captura dos veces.
 */
export type SpecialistSubject = 'english' | 'physical' | 'arts'
export type TableTone = 'orange' | 'blue' | 'green' | 'gray'
export interface ScheduleRow { time: string; recess: boolean; cells: string[] }
export interface ScheduleTable { title: string; subject: SpecialistSubject; tone: TableTone; rows: ScheduleRow[] }
export interface SpecialistSchedules { tables: ScheduleTable[]; signerName: string; signerRole: string }

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
export const subjectLabels: Record<SpecialistSubject, { name: string; short: string; color: string }> = {
  english: { name: 'Inglés', short: 'INGLÉS', color: '#f8cbad' },
  physical: { name: 'Educación Física', short: 'EDUC FÍS', color: '#9dc3e6' },
  arts: { name: 'Educación Artística', short: 'ARTES', color: '#92d050' },
}
export const toneColors: Record<TableTone, { head: string; recess: string; label: string }> = {
  orange: { head: '#f4b183', recess: '#fbe5d6', label: 'Naranja' },
  blue: { head: '#9dc3e6', recess: '#deebf7', label: 'Azul' },
  green: { head: '#a9d08e', recess: '#e2efda', label: 'Verde' },
  gray: { head: '#d0cece', recess: '#ededed', label: 'Gris' },
}
/** Color de cada grado en las tablas por especialidad (como en el formato original). */
const gradeColors: Record<string, { fill: string; ink: string }> = {
  1: { fill: '#7030a0', ink: '#fff' }, 2: { fill: '#00b0f0', ink: '#000' }, 3: { fill: '#92d050', ink: '#000' },
  4: { fill: '#ffc000', ink: '#000' }, 5: { fill: '#ffff00', ink: '#000' }, 6: { fill: '#ff0000', ink: '#fff' },
}

const row = (time: string, ...cells: string[]): ScheduleRow => ({ time, recess: false, cells: [0, 1, 2, 3, 4].map((i) => cells[i] ?? '') })
const recess = (time: string): ScheduleRow => ({ time, recess: true, cells: ['', '', '', '', ''] })

/** Horario 2026-2027 tal como lo entregó la subdirección académica. */
export const defaultSchedules: SpecialistSchedules = {
  signerName: 'Prof. Héctor Daniel Loreto Morales',
  signerRole: 'Subdirector académico',
  tables: [
    { title: 'Inglés 1º y 2º', subject: 'english', tone: 'orange', rows: [
      row('8:00 a 8:50', '1A', '2A', '1A', '2A', '2B'), row('8:50 a 9:40', '1B', '2B'), row('9:40 a 10:30', '2A', '1A'),
      recess('10:30 a 11:00'), row('11:00 a 11:50', '2B', '1B'), row('11:50 a 12:30', '1B') ] },
    { title: 'Educación Física 1º a 6º', subject: 'physical', tone: 'blue', rows: [
      row('8:00 a 8:50', '1B', '2B', '3A', '4A', '5A'), row('8:50 a 9:40', '1A', '2A', '3B', '4B', '5B'), row('9:40 a 10:30', '2B', '1B', '6A', '3B', '4A'),
      recess('10:30 a 11:00'), row('11:00 a 11:50', '2A', '1A', '6B', '3A', '4B'), row('11:50 a 12:30', '6A', '', '5B', '5A', '6B') ] },
    { title: 'Inglés 3º a 6º', subject: 'english', tone: 'orange', rows: [
      row('8:00 a 8:50', '4A', '5A', '3B', '4B', '5B'), row('8:50 a 9:40', '4B', '5B', '3A', '4A', '5A'), row('9:40 a 10:30', '3B', '6A', '6B', '3A', '4B'),
      recess('10:30 a 11:00'), row('11:00 a 11:50', '3A', '6B', '6A', '3B', '4A'), row('11:50 a 12:30', '6B', '', '5A', '5B', '6A') ] },
    { title: 'Educación Artística 1º a 6º', subject: 'arts', tone: 'green', rows: [
      row('8:00 a 8:50', '4B', '5B', '2A'), row('8:50 a 9:40', '4A', '5A', '2B'), row('9:40 a 10:30', '3A', '6B'),
      recess('10:30 a 11:00'), row('11:00 a 11:40', '3B', '6A'), row('11:40 a 12:20', '1A', '1B') ] },
  ],
}

export const normalizeGroup = (value: string) => value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 4)
const gradeOf = (code: string) => code.match(/^[1-6]/)?.[0] ?? ''

/** Normaliza lo que llega de Firestore o del editor, sin confiar en su forma. */
export function cleanSchedules(value: unknown): SpecialistSchedules {
  const source = (value && typeof value === 'object' ? value : {}) as Partial<SpecialistSchedules>
  const str = (input: unknown, max: number) => typeof input === 'string' ? input.slice(0, max) : ''
  const tables = Array.isArray(source.tables) ? source.tables.slice(0, 12).map((table): ScheduleTable => ({
    title: str(table?.title, 120),
    subject: table?.subject in subjectLabels ? table.subject : 'english',
    tone: table?.tone in toneColors ? table.tone : 'gray',
    rows: Array.isArray(table?.rows) ? table.rows.slice(0, 12).map((item) => ({
      time: str(item?.time, 40), recess: item?.recess === true,
      cells: [0, 1, 2, 3, 4].map((i) => normalizeGroup(str(item?.cells?.[i], 8))),
    })) : [],
  })) : defaultSchedules.tables
  return { tables, signerName: str(source.signerName ?? defaultSchedules.signerName, 160), signerRole: str(source.signerRole ?? defaultSchedules.signerRole, 160) }
}

/** Grupos que aparecen en algún horario, en orden de grado y letra. */
export function scheduleGroups(schedules: SpecialistSchedules) {
  const codes = new Set(schedules.tables.flatMap((table) => table.rows.flatMap((item) => item.recess ? [] : item.cells.filter(Boolean))))
  return [...codes].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
}

/** Grupo a la misma hora en dos clases distintas: se avisa en el editor. */
export function scheduleConflicts(schedules: SpecialistSchedules) {
  const seen = new Map<string, string>()
  const conflicts: string[] = []
  schedules.tables.forEach((table) => table.rows.forEach((item, slot) => {
    if (item.recess) return
    item.cells.forEach((code, day) => {
      if (!code) return
      const key = `${code}|${slot}|${day}`
      const previous = seen.get(key)
      if (previous) conflicts.push(`${code}: ${DAYS[day]} ${item.time} (${previous} y ${table.title})`)
      else seen.set(key, table.title)
    })
  }))
  return conflicts
}

/** Horario de un grupo: en cada hora, las clases con especialista que le tocan. */
export function groupSchedule(schedules: SpecialistSchedules, code: string) {
  const base = schedules.tables.find((table) => table.subject !== 'arts')?.rows ?? schedules.tables[0]?.rows ?? []
  return base.map((item, slot) => ({
    time: item.time, recess: item.recess,
    cells: [0, 1, 2, 3, 4].map((day) => schedules.tables.filter((table) => {
      const target = table.rows[slot]
      return target && !target.recess && target.cells[day] === code
    }).map((table) => table.subject)),
  }))
}

/* --- Documento imprimible ---------------------------------------------- */

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const asset = (path: string) => `${window.location.origin}${path}`

const css = `
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; } body { font-family: Calibri, Carlito, Arial, sans-serif; background: #5f6670; color: #000; }
@page { size: letter landscape; margin: 0; }
.page { position: relative; overflow: hidden; width: 279.4mm; height: 215.9mm; padding: 10mm 12mm; margin: 14px auto; background: #fff; box-shadow: 0 4px 18px rgb(0 0 0 / .35); display: flex; flex-direction: column; }
@media print { body { background: #fff; } .page { margin: 0; box-shadow: none; break-after: page; } .page:last-child { break-after: auto; } }
.wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 10; }
.wm span { transform: rotate(-28deg); font: 900 150pt Arial, sans-serif; letter-spacing: 12pt; color: rgb(190 30 45 / .15); border: 7pt solid rgb(190 30 45 / .15); border-radius: 18pt; padding: 0 26pt; }
.head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; }
.head .sep { height: 15mm; } .head .school { height: 22mm; justify-self: end; margin-right: 10mm; }
.head p { margin: 0; text-align: center; font-weight: 700; font-size: 11pt; line-height: 1.35; }
.grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 6mm 8mm; align-content: center; padding: 4mm 0; }
.block p { text-align: center; font-weight: 700; font-size: 10pt; margin: 4mm 0 0; }
table { border-collapse: collapse; width: 100%; }
th, td { border: .6pt solid #7f7f7f; height: 5.6mm; padding: 0 2pt; text-align: center; font-size: 9.5pt; font-weight: 700; }
th { font-size: 9.5pt; } td.time { width: 25%; } td.recess { font-weight: 700; }
.sign { text-align: center; font-family: Arial, sans-serif; font-size: 10pt; }
.sign i { display: block; width: 90mm; margin: 0 auto 1mm; border-top: .8pt solid #000; }
`

function header() {
  return `<header class="head"><img class="sep" src="${asset('/img/documentos/sep-bcs.png')}" alt="">
  <div><p>Secretaría de Educación Pública de Baja California Sur</p><p>Supervisión de la ${esc(officialSchool.zone)}ª Zona Escolar.</p>
  <p>Esc. Prim. Profesor Hugo César Piñeda Chacón T. M.</p><p>C. C. T. ${esc(officialSchool.cct)}.</p></div>
  <img class="school" src="${asset('/img/documentos/escudo-escuela.png')}" alt=""></header>`
}

function page(blocks: string[], schedules: SpecialistSchedules) {
  const wm = WATERMARK ? `<div class="wm" aria-hidden="true"><span>${esc(WATERMARK)}</span></div>` : ''
  return `<section class="page">${wm}${header()}<div class="grid">${blocks.join('')}</div>
  <div class="sign"><i></i>${esc(schedules.signerName)}<br>${esc(schedules.signerRole)}</div></section>`
}

const headRow = (fill: string) => `<tr>${['Horario.', ...DAYS].map((day) => `<th style="background:${fill}">${day}</th>`).join('')}</tr>`

function specialistBlock(table: ScheduleTable) {
  const tone = toneColors[table.tone]
  const body = table.rows.map((item) => item.recess
    ? `<tr><td class="time" style="background:${tone.head}">${esc(item.time)}</td><td colspan="5" class="recess" style="background:${tone.recess}">RECESO</td></tr>`
    : `<tr><td class="time" style="background:${tone.head}">${esc(item.time)}</td>${item.cells.map((code) => {
      const color = gradeColors[gradeOf(code)]
      return `<td${code && color ? ` style="background:${color.fill};color:${color.ink}"` : ''}>${esc(code)}</td>`
    }).join('')}</tr>`).join('')
  return `<div class="block"><table>${headRow(tone.head)}${body}</table><p>${esc(table.title)}</p></div>`
}

function groupBlock(schedules: SpecialistSchedules, code: string) {
  const gray = toneColors.gray
  const body = groupSchedule(schedules, code).map((item) => item.recess
    ? `<tr><td class="time" style="background:${gray.head}">${esc(item.time)}</td><td colspan="5" style="background:${gray.recess}">RECESO</td></tr>`
    : `<tr><td class="time" style="background:${gray.head}">${esc(item.time)}</td>${item.cells.map((subjects) => subjects.length
      ? `<td style="background:${subjectLabels[subjects[0]].color}">${subjects.map((subject) => subjectLabels[subject].short).join(' / ')}</td>` : '<td></td>').join('')}</tr>`).join('')
  return `<div class="block"><table>${headRow(gray.head)}${body}</table><p>${esc(code)}</p></div>`
}

const chunk = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, index) => list.slice(index * size, index * size + size))

export function schedulesHtml(schedules: SpecialistSchedules, includeGroups: boolean) {
  const pages = chunk(schedules.tables.map(specialistBlock), 4).map((blocks) => page(blocks, schedules))
  if (includeGroups) pages.push(...chunk(scheduleGroups(schedules).map((code) => groupBlock(schedules, code)), 4).map((blocks) => page(blocks, schedules)))
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Horarios de docentes especialistas</title><style>${css}</style></head><body>${pages.join('')}</body></html>`
}
