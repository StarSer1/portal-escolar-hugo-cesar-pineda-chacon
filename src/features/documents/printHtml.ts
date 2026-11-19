import { formativeFields, formativeLabels } from './formative'
import {
  displayDate, groupTitle, officialSchool, ordinal, shiftLabel, statRows, total, WATERMARK,
  type GroupEnrollmentReport, type ReportCard,
} from './reports'

/**
 * Documentos imprimibles como HTML completo. Se muestran en un iframe de vista
 * previa y se imprimen desde ahí; «Guardar como PDF» del navegador produce el PDF.
 * Las imágenes usan direcciones absolutas porque el iframe se crea con srcdoc.
 */
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const asset = (path: string) => `${window.location.origin}${path}`
const sepLogo = () => `<img class="logo-sep" src="${asset('/img/documentos/sep-bcs.png')}" alt="Secretaría de Educación Pública de Baja California Sur">`
const schoolLogo = () => `<img class="logo-school" src="${asset('/img/documentos/escudo-escuela.png')}" alt="Escudo de la escuela">`
const watermark = () => WATERMARK ? `<div class="wm" aria-hidden="true"><span>${esc(WATERMARK)}</span></div>` : ''
const score = (value: number | null, decimals = false) => value === null ? '' : decimals ? value.toFixed(1) : String(value)

const baseCss = `
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; }
body { font-family: Arial, Helvetica, sans-serif; color: #1f2328; background: #5f6670; }
.page { position: relative; overflow: hidden; background: #fff; margin: 14px auto; box-shadow: 0 4px 18px rgb(0 0 0 / .35); }
@media print { body { background: #fff; } .page { margin: 0; box-shadow: none; break-after: page; } .page:last-child { break-after: auto; } }
.wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 10; }
.wm span { transform: rotate(-32deg); font-size: 150pt; font-weight: 900; letter-spacing: 12pt; color: rgb(190 30 45 / .17); border: 7pt solid rgb(190 30 45 / .17); border-radius: 18pt; padding: 0 26pt; white-space: nowrap; }
table { border-collapse: collapse; width: 100%; }
th, td { border: .6pt solid #333; padding: 1pt 3pt; }
.gold { background: #ddc48f; font-weight: 700; text-align: center; }
.center { text-align: center; }
`

function documentShell(title: string, css: string, pages: string[]) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${baseCss}${css}</style></head><body>${pages.join('')}</body></html>`
}

/* --- Boleta de evaluación --------------------------------------------- */

export type Orientation = 'landscape' | 'portrait'
export interface ReportCardOptions { orientation: Orientation; director: string; place: string; date: string }

const boletaCss = (orientation: Orientation) => {
  const landscape = orientation === 'landscape'
  return `
@page { size: letter ${orientation}; margin: 0; }
.page { width: ${landscape ? '279.4mm' : '215.9mm'}; height: ${landscape ? '215.9mm' : '279.4mm'}; padding: ${landscape ? '7mm 9mm' : '9mm 9mm'}; font-size: 7pt; display: flex; flex-direction: column; gap: ${landscape ? '2.2mm' : '3mm'}; }
.head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 4mm; }
.head .logo-school { height: ${landscape ? '19mm' : '20mm'}; }
.head .logo-sep { height: ${landscape ? '12mm' : '12mm'}; justify-self: end; }
.titles { text-align: center; line-height: 1.25; }
.titles strong { display: block; font-size: 11pt; letter-spacing: .3pt; }
.titles span { display: block; font-size: 7.5pt; }
.info { display: flex; gap: 4mm; align-items: baseline; font-size: 6.5pt; }
.info label { white-space: nowrap; color: #333; }
.info b { flex: 1; border-bottom: .6pt solid #333; font-size: 8pt; padding: 0 2pt; min-height: 10pt; text-transform: uppercase; }
.info b.short { flex: 0 0 ${landscape ? '28mm' : '19mm'}; }
.main { display: grid; grid-template-columns: ${landscape ? '58% 1fr' : '57% 1fr'}; gap: ${landscape ? '8mm' : '5mm'}; align-items: start; }
.grades th { font-size: 6pt; }
.grades td { height: ${landscape ? '8.5mm' : '9.5mm'}; text-align: center; font-size: 11pt; font-weight: 700; }
.grades td.period { font-size: 7pt; font-weight: 400; }
.boxes { display: flex; flex-direction: column; gap: ${landscape ? '3mm' : '3.5mm'}; padding-top: 1mm; }
.box { display: flex; border: .6pt solid #333; min-height: ${landscape ? '7.5mm' : '8mm'}; }
.box > span { background: #ddc48f; font-size: 5.8pt; font-weight: 700; display: flex; align-items: center; justify-content: center; text-align: center; width: ${landscape ? '24mm' : '20mm'}; padding: 1pt; }
.box > b { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11pt; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
.pair .box > span { width: 62%; font-size: 5.4pt; }
.obs th { font-size: 6pt; }
.obs td { font-size: 6pt; height: ${landscape ? '5.4mm' : '10mm'}; }
.obs td.field { text-align: center; font-size: 5.6pt; width: ${landscape ? '20mm' : '19mm'}; line-height: 1.05; }
.obs td.period { text-align: center; width: 9mm; font-size: 6.5pt; }
.foot { display: grid; grid-template-columns: ${landscape ? '1fr 74mm' : '1fr 78mm'}; gap: 6mm; align-items: end; margin-top: auto; }
.signs { display: flex; flex-direction: column; gap: ${landscape ? '3.2mm' : '4mm'}; font-size: 6.3pt; }
.signs div { display: flex; gap: 2mm; align-items: baseline; }
.signs b { flex: 1; border-bottom: .6pt solid #333; font-size: 7.5pt; min-height: 10pt; padding: 0 2pt; }
.parents th { font-size: 6pt; }
.parents td { height: ${landscape ? '12mm' : '14mm'}; vertical-align: top; font-size: 5pt; width: 33.3%; }
.seal { text-align: center; color: #888; font-size: 5.5pt; line-height: 1.2; margin-top: 2mm; }
`
}

function reportCardPage(card: ReportCard, options: ReportCardOptions) {
  const { student, group, year } = card
  const grade = group.grade
  const periodRow = (label: string, values: (number | null)[], decimals = false) =>
    `<tr><td class="period">${label}</td>${values.map((value) => `<td>${score(value, decimals)}</td>`).join('')}</tr>`
  const promotedBoxes = grade > 1
    ? `<div class="pair"><div class="box"><span>PROMOVIDA(O)</span><b>${card.promoted === true ? 'X' : ''}</b></div><div class="box"><span>NO PROMOVIDA(O)</span><b>${card.promoted === false ? 'X' : ''}</b></div></div>`
    : ''
  const obsRows = [0, 1, 2].flatMap((period) => formativeFields.map((field, index) => `<tr>
    ${index === 0 ? `<td class="period" rowspan="4">${['1<sup>er</sup>', '2<sup>do</sup>', '3<sup>er</sup>'][period]}</td>` : ''}
    <td class="field">${esc(formativeLabels[field].toUpperCase())}</td>
    <td>${esc(card.observations[field][period])}</td></tr>`)).join('')
  return `<section class="page">${watermark()}
  <header class="head">${schoolLogo()}
    <div class="titles"><strong>SISTEMA EDUCATIVO NACIONAL</strong><strong>${esc(officialSchool.state)}</strong><strong>BOLETA DE EVALUACIÓN</strong>
      <span>${ordinal(grade)} GRADO DE EDUCACIÓN PRIMARIA</span><span>CICLO ESCOLAR ${esc(year.name)}</span></div>
    ${sepLogo()}</header>
  <div class="info"><label>NOMBRE(S) Y APELLIDOS DE LA ALUMNA O DEL ALUMNO:</label><b>${esc(`${student.names} ${student.surnames}`)}</b><label>CURP:</label><b class="short" style="flex-basis:${options.orientation === 'landscape' ? '48mm' : '40mm'}">${esc(student.curp)}</b></div>
  <div class="info"><label>NOMBRE DE LA ESCUELA:</label><b>${esc(officialSchool.name)}</b><label>CCT:</label><b class="short">${esc(officialSchool.cct)}</b><label>TURNO:</label><b class="short">${esc(shiftLabel(group.shift))}</b><label>GRUPO:</label><b class="short" style="flex-basis:14mm">${esc(group.label)}</b></div>
  <div class="main">
    <table class="grades">
      <colgroup><col style="width:15%"><col span="4" style="width:21.25%"></colgroup>
      <thead><tr><th class="gold" rowspan="2">PERIODO DE<br>EVALUACIÓN</th><th class="gold" colspan="4">CAMPOS FORMATIVOS</th></tr>
        <tr>${formativeFields.map((field) => `<th class="gold">${esc(formativeLabels[field].toUpperCase())}</th>`).join('')}</tr></thead>
      <tbody>${[0, 1, 2].map((period) => periodRow(['1<sup>er</sup>', '2<sup>do</sup>', '3<sup>er</sup>'][period], formativeFields.map((field) => card.scores[field][period]))).join('')}
        ${periodRow('PROMEDIO<br>FINAL', formativeFields.map((field) => card.finals[field]), true)}</tbody>
    </table>
    <div class="boxes">
      <div class="box"><span>LENGUA INDÍGENA</span><b></b></div>
      ${promotedBoxes}
      <div class="box"><span>PROMEDIO<br>FINAL DE GRADO</span><b>${score(card.finalAverage, true)}</b></div>
      <div class="box"><span>ASISTENCIAS</span><b></b></div>
      <div class="box"><span>FOLIO</span><b></b></div>
    </div>
  </div>
  <table class="obs"><thead><tr><th class="gold" style="font-size:5pt">PERIODO DE<br>EVALUACIÓN</th><th class="gold">CAMPOS FORMATIVOS</th><th class="gold">OBSERVACIONES Y SUGERENCIAS SOBRE LOS APRENDIZAJES</th></tr></thead><tbody>${obsRows}</tbody></table>
  <footer class="foot">
    <div class="signs">
      <div><label>NOMBRE Y FIRMA DE LA DOCENTE O DEL DOCENTE:</label><b>${esc(card.teacher)}</b></div>
      <div><label>NOMBRE Y FIRMA DE LA DIRECTORA O DEL DIRECTOR:</label><b>${esc(options.director)}</b></div>
      <div><label>LUGAR DE EXPEDICIÓN:</label><b>${esc(options.place)}</b></div>
      <div><label>FECHA DE EXPEDICIÓN:</label><b>${esc(displayDate(options.date))}</b></div>
    </div>
    <div>
      <table class="parents"><thead><tr><th class="gold" colspan="3">FIRMA DE LA MADRE O PADRE DE FAMILIA O PERSONA TUTORA</th></tr></thead>
        <tbody><tr><td>1<sup>er</sup> periodo</td><td>2<sup>do</sup> periodo</td><td>3<sup>er</sup> periodo</td></tr></tbody></table>
      <div class="seal">SELLO<br>SISTEMA EDUCATIVO NACIONAL</div>
    </div>
  </footer>
</section>`
}

export function reportCardsHtml(cards: ReportCard[], options: ReportCardOptions) {
  return documentShell('Boletas de evaluación', boletaCss(options.orientation), cards.map((card) => reportCardPage(card, options)))
}

/* --- Listado oficial y estadística de inscripción --------------------- */

const enrollmentCss = `
@page { size: letter portrait; margin: 10mm; }
.page { width: 215.9mm; min-height: 279.4mm; padding: 10mm; font-size: 8pt; }
@media print { .page { width: auto; min-height: 0; padding: 0; } }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4mm; }
.head .logo-sep { height: 15mm; }
.brand { display: flex; align-items: center; gap: 3mm; }
.brand .logo-school { height: 19mm; }
.brand p { margin: 0 0 1mm; font-size: 8pt; }
.brand .school { color: #153d63; font-weight: 700; font-size: 9pt; }
h1 { font-size: 10.5pt; text-align: center; margin: 2mm 0 3mm; }
.meta { display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 8.5pt; }
.roster th { background: #d9e2f3; font-size: 6.5pt; }
.roster td { font-size: 7.5pt; height: 5.6mm; }
.roster thead { display: table-header-group; }
.roster tr { break-inside: avoid; }
.stats th, .stats td { text-align: center; font-size: 8pt; height: 6mm; }
.stats th { background: #d9e2f3; }
.stats td.label { text-align: left; font-weight: 700; }
h2 { font-size: 9pt; text-align: center; margin: 6mm 0 2mm; letter-spacing: 2pt; }
.moves td { height: 5.6mm; font-size: 7.5pt; }
.moves th { background: #d9e2f3; font-size: 7pt; }
.totals td { font-weight: 700; background: #f1f3f7; }
`

const enrollmentHead = () => `<header class="head">${sepLogo()}<div class="brand">${schoolLogo()}<div><p>Escuela Primaria</p><p class="school">${esc(officialSchool.name)}</p><p>C.C.T.: <b>${esc(officialSchool.cct)}</b></p></div></div></header>`

function rosterPage(report: GroupEnrollmentReport) {
  const cutoffLabel = new Date(`${report.cutoff}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  const rows = report.rows.map((row) => `<tr><td class="center">${row.number}</td><td class="center">${esc(row.matricula)}</td><td>${esc(row.firstSurname.toUpperCase())}</td><td>${esc(row.secondSurname.toUpperCase())}</td><td>${esc(row.names.toUpperCase())}</td><td>${esc(row.curp)}</td><td class="center">${esc(row.birthDate)}</td><td class="center">${row.sex}</td><td class="center">${row.age ?? ''}</td></tr>`).join('')
  return `<section class="page">${watermark()}${enrollmentHead()}
  <h1>LISTADO OFICIAL DEL GRUPO (INSCRIPCIÓN) DEL CICLO ESCOLAR ${esc(report.year.name)}</h1>
  <div class="meta"><span>Docente frente a grupo: <b>${esc(report.teacher)}</b></span><span>Grupo: <b>${esc(groupTitle(report.group))}</b> · ${esc(shiftLabel(report.group.shift))}</span></div>
  <table class="roster"><thead><tr><th>NÚMERO LISTA</th><th>MATRÍCULA</th><th>PRIMER APELLIDO</th><th>SEGUNDO APELLIDO</th><th>NOMBRE</th><th>CURP</th><th>FECHA NACIMIENTO</th><th>SEXO</th><th>Edad cumplida al ${esc(cutoffLabel)}</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="9" class="center">Sin alumnos inscritos</td></tr>'}</tbody></table>
</section>`
}

function movesTable(title: string, moves: GroupEnrollmentReport['altas']) {
  const filled = [...moves, ...Array.from({ length: Math.max(0, 9 - moves.length) }, () => null)]
  return `<h2>${title}</h2><table class="moves"><thead><tr><th style="width:8%">N°</th><th>Nombre</th><th style="width:12%">Edad</th><th style="width:20%">Fecha</th></tr></thead>
  <tbody>${filled.map((move, index) => `<tr><td class="center">${index + 1}</td><td>${esc(move?.name ?? '')}</td><td class="center">${move?.age ?? ''}</td><td class="center">${move ? esc(displayDate(move.date)) : ''}</td></tr>`).join('')}</tbody></table>`
}

function statsPage(report: GroupEnrollmentReport) {
  const { stats, ageLabels } = report
  const body = statRows.map(({ key, label }) => `<tr><td class="label">${label}</td>${[0, 1, 2].map((i) => `<td>${stats[key].h[i]}</td><td>${stats[key].m[i]}</td>`).join('')}<td><b>${total(stats[key], 'h')}</b></td><td><b>${total(stats[key], 'm')}</b></td></tr>`).join('')
  return `<section class="page">${watermark()}${enrollmentHead()}
  <h1>ESTADÍSTICA DEL GRUPO CICLO ESCOLAR ${esc(report.year.name)}</h1>
  <div class="meta"><span>Docente frente a grupo: <b>${esc(report.teacher)}</b></span><span>Grado y grupo: <b>${esc(groupTitle(report.group))}</b></span></div>
  <table class="stats"><thead><tr><th rowspan="2">Edad</th>${ageLabels.map((label) => `<th colspan="2">${esc(label)}</th>`).join('')}<th colspan="2">Total</th></tr>
    <tr>${Array.from({ length: 4 }, () => '<th>H</th><th>M</th>').join('')}</tr></thead><tbody>${body}</tbody></table>
  ${movesTable('ALTAS', report.altas)}${movesTable('BAJAS', report.bajas)}
</section>`
}

function summaryPage(reports: GroupEnrollmentReport[]) {
  const sum = (pick: (report: GroupEnrollmentReport) => number) => reports.reduce((value, report) => value + pick(report), 0)
  const cells = (report: GroupEnrollmentReport) => [
    total(report.stats.inicial, 'h'), total(report.stats.inicial, 'm'), total(report.stats.inicial, 'h') + total(report.stats.inicial, 'm'),
    total(report.stats.altas, 'h') + total(report.stats.altas, 'm'), total(report.stats.bajas, 'h') + total(report.stats.bajas, 'm'),
    total(report.stats.existencia, 'h'), total(report.stats.existencia, 'm'), total(report.stats.existencia, 'h') + total(report.stats.existencia, 'm'),
  ]
  const rows = reports.map((report) => `<tr><td class="label">${esc(groupTitle(report.group))}</td><td style="text-align:left">${esc(report.teacher)}</td>${cells(report).map((value) => `<td>${value}</td>`).join('')}</tr>`).join('')
  const totals = cells(reports[0]).map((_, index) => sum((report) => cells(report)[index]))
  return `<section class="page">${watermark()}${enrollmentHead()}
  <h1>CONCENTRADO GENERAL DE INSCRIPCIÓN DEL CICLO ESCOLAR ${esc(reports[0].year.name)}</h1>
  <table class="stats"><thead><tr><th rowspan="2">Grupo</th><th rowspan="2">Docente frente a grupo</th><th colspan="3">Inscripción inicial</th><th rowspan="2">Altas</th><th rowspan="2">Bajas</th><th colspan="3">Existencia</th></tr>
    <tr><th>H</th><th>M</th><th>Total</th><th>H</th><th>M</th><th>Total</th></tr></thead>
    <tbody>${rows}<tr class="totals"><td class="label" colspan="2">Total de la escuela</td>${totals.map((value) => `<td>${value}</td>`).join('')}</tr></tbody></table>
</section>`
}

export function enrollmentHtml(reports: GroupEnrollmentReport[], general: boolean) {
  const pages = reports.flatMap((report) => [rosterPage(report), statsPage(report)])
  return documentShell(general ? 'Inscripción general' : 'Listado de inscripción', enrollmentCss, general && reports.length ? [summaryPage(reports), ...pages] : pages)
}
