import type { Borders, PaperSize, Workbook, Worksheet } from 'exceljs'
import { groupTitle, officialSchool, shiftCode, statRows, total, WATERMARK, type GroupEnrollmentReport } from './reports'

/**
 * Libro de Excel con el mismo diseño que los formatos de inscripción de la SEP:
 * hoja «Listado oficial» y hoja «Registro estadístico» por grupo. El general
 * agrega una hoja de concentrado con todos los grupos.
 * exceljs se descarga solo al generar el archivo.
 */
/** Tamaño carta (código 1 de Excel). */
const LETTER = 1 as PaperSize
const thin = { style: 'thin' as const, color: { argb: 'FF000000' } }
const border: Partial<Borders> = { top: thin, left: thin, bottom: thin, right: thin }
const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD9E2F3' } }
const font = (extra: object = {}) => ({ name: 'Aptos Narrow', size: 10, ...extra })

async function imageBuffer(path: string) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`No se pudo cargar la imagen ${path}.`)
  return response.arrayBuffer()
}

interface Logos { sep: number; school: number }

function addHeader(sheet: Worksheet, logos: Logos, lastCol: number) {
  sheet.addImage(logos.sep, { tl: { col: 0.1, row: 0.3 }, ext: { width: 230, height: 54 } })
  sheet.addImage(logos.school, { tl: { col: lastCol - 4.6, row: 0.1 }, ext: { width: 70, height: 70 } })
  const textCol = lastCol - 3
  sheet.getCell(2, textCol).value = 'Escuela Primaria'
  sheet.getCell(3, textCol).value = officialSchool.name
  sheet.getCell(3, textCol).font = font({ bold: true, color: { argb: 'FF153D63' } })
  sheet.getCell(4, textCol).value = { richText: [{ text: 'C.C.T.: ', font: font() }, { text: officialSchool.cct, font: font({ bold: true }) }] }
  if (WATERMARK) {
    sheet.headerFooter.oddHeader = `&C&"Arial,Bold"&16&KBE1E2D${WATERMARK} — DOCUMENTO DE PRUEBA`
    sheet.getCell(5, textCol).value = `${WATERMARK} — documento de prueba`
    sheet.getCell(5, textCol).font = font({ bold: true, color: { argb: 'FFBE1E2D' } })
  }
}

function rosterSheet(workbook: Workbook, name: string, report: GroupEnrollmentReport, logos: Logos) {
  const sheet = workbook.addWorksheet(name, { pageSetup: { paperSize: LETTER, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.5, header: 0.3, footer: 0.3 } } })
  sheet.columns = [9.3, 11.3, 14, 14, 22, 21.9, 12, 9.6, 13].map((width) => ({ width, style: { font: font() } }))
  addHeader(sheet, logos, 9)
  sheet.mergeCells('A7:I7')
  const title = sheet.getCell('A7')
  title.value = `LISTADO OFICIAL DEL GRUPO (INSCRIPCIÓN) DEL CICLO ESCOLAR ${report.year.name}`
  title.font = font({ bold: true, size: 12 }); title.alignment = { horizontal: 'center' }
  sheet.getCell('A9').value = `Docente frente a grupo: ${report.teacher}`
  sheet.mergeCells('F9:I9')
  sheet.getCell('F9').value = `Grupo: ${groupTitle(report.group)}`
  sheet.getCell('F9').alignment = { horizontal: 'right' }
  const cutoff = new Date(`${report.cutoff}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  const headers = ['NÚMERO LISTA', 'MATRICULA', 'PRIMER APELLIDO', 'SEGUNDO APELLIDO', 'NOMBRE', 'CURP', 'FECHA NACIMIENTO', 'SEXO', `Edad cumplida hasta el ${cutoff}`]
  const head = sheet.getRow(10)
  head.values = headers
  head.height = 42
  head.eachCell((cell) => { cell.font = font({ bold: true, size: 9 }); cell.fill = headerFill; cell.border = border; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } })
  const [cy, cm, cd] = report.cutoff.split('-').map(Number)
  report.rows.forEach((row, index) => {
    const excelRow = sheet.getRow(11 + index)
    excelRow.values = [row.number, row.matricula, row.firstSurname.toUpperCase(), row.secondSurname.toUpperCase(), row.names.toUpperCase(), row.curp, row.birthDate, row.sex,
      row.age === null ? '' : { formula: `DATEDIF(G${11 + index},DATE(${cy},${cm},${cd}),"Y")`, result: row.age }]
    excelRow.eachCell({ includeEmpty: true }, (cell, col) => { if (col <= 9) { cell.border = border; cell.alignment = { horizontal: [1, 2, 7, 8, 9].includes(col) ? 'center' : 'left', vertical: 'middle' } } })
  })
  sheet.views = [{ state: 'frozen', ySplit: 10 }]
  sheet.pageSetup.printTitlesRow = '10:10'
  return sheet
}

function statsSheet(workbook: Workbook, name: string, report: GroupEnrollmentReport, logos: Logos) {
  const sheet = workbook.addWorksheet(name, { pageSetup: { paperSize: LETTER, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.5, header: 0.3, footer: 0.3 } } })
  sheet.columns = [4.1, 10.1, 8.7, 8.7, 8.7, 8.7, 8.7, 8.7, 9.1, 9.1, 9.1, 3.1].map((width) => ({ width, style: { font: font() } }))
  addHeader(sheet, logos, 12)
  sheet.mergeCells('A8:L8')
  sheet.getCell('A8').value = `ESTADÍSTICA DEL GRUPO CICLO ESCOLAR ${report.year.name}`
  sheet.getCell('A8').font = font({ bold: true, size: 12 }); sheet.getCell('A8').alignment = { horizontal: 'center' }
  sheet.mergeCells('B10:F10'); sheet.getCell('B10').value = `Docente frente a grupo: ${report.teacher}`
  sheet.mergeCells('H10:L10'); sheet.getCell('H10').value = `Grado y grupo: ${groupTitle(report.group)}`
  const boxed = (ref: string, value: string | number, bold = false) => {
    const cell = sheet.getCell(ref); cell.value = value; cell.border = border
    cell.alignment = { horizontal: 'center', vertical: 'middle' }; if (bold) { cell.font = font({ bold: true }); cell.fill = headerFill }
  }
  sheet.mergeCells('B11:C11'); boxed('B11', 'Edad', true)
  ;['D11:E11', 'F11:G11', 'H11:I11'].forEach((range, index) => { sheet.mergeCells(range); boxed(range.slice(0, 3), report.ageLabels[index], true) })
  sheet.mergeCells('J11:K11'); boxed('J11', 'Total', true)
  sheet.mergeCells('B12:C12'); boxed('B12', 'Sexo', true)
  ;['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach((col, index) => boxed(`${col}12`, index % 2 ? 'M' : 'H', true))
  statRows.forEach(({ key, label }, index) => {
    const row = 13 + index
    sheet.mergeCells(`B${row}:C${row}`); boxed(`B${row}`, label, true)
    sheet.getCell(`B${row}`).alignment = { horizontal: 'left', vertical: 'middle' }
    const counts = report.stats[key]
    ;[0, 1, 2].forEach((i) => { boxed(`${['D', 'F', 'H'][i]}${row}`, counts.h[i]); boxed(`${['E', 'G', 'I'][i]}${row}`, counts.m[i]) })
    const totals = sheet.getCell(`J${row}`); totals.value = { formula: `SUM(D${row},F${row},H${row})`, result: total(counts, 'h') }
    const totalsM = sheet.getCell(`K${row}`); totalsM.value = { formula: `SUM(E${row},G${row},I${row})`, result: total(counts, 'm') }
    for (const cell of [totals, totalsM]) { cell.border = border; cell.font = font({ bold: true }); cell.alignment = { horizontal: 'center' } }
  })
  let row = 21
  for (const [title, moves] of [['ALTAS', report.altas], ['BAJAS', report.bajas]] as const) {
    sheet.mergeCells(`A${row}:L${row + 1}`)
    const heading = sheet.getCell(`A${row}`); heading.value = title
    heading.font = font({ bold: true, size: 12 }); heading.alignment = { horizontal: 'center', vertical: 'middle' }
    row += 2
    boxed(`B${row}`, 'N°', true); sheet.mergeCells(`C${row}:H${row}`); boxed(`C${row}`, 'Nombre', true)
    boxed(`I${row}`, 'Edad', true); sheet.mergeCells(`J${row}:K${row}`); boxed(`J${row}`, 'Fecha', true)
    const lines = Math.max(9, moves.length)
    for (let index = 0; index < lines; index += 1) {
      row += 1
      const move = moves[index]
      boxed(`B${row}`, index + 1); sheet.mergeCells(`C${row}:H${row}`); boxed(`C${row}`, move?.name ?? '')
      sheet.getCell(`C${row}`).alignment = { horizontal: 'left' }
      boxed(`I${row}`, move?.age ?? ''); sheet.mergeCells(`J${row}:K${row}`); boxed(`J${row}`, move?.date ?? '')
    }
    row += 2
  }
  return sheet
}

function summarySheet(workbook: Workbook, reports: GroupEnrollmentReport[], logos: Logos) {
  const sheet = workbook.addWorksheet('Concentrado', { pageSetup: { paperSize: LETTER, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
  sheet.columns = [10, 34, 8, 8, 9, 8, 8, 8, 8, 9].map((width) => ({ width, style: { font: font() } }))
  addHeader(sheet, logos, 10)
  sheet.mergeCells('A7:J7')
  sheet.getCell('A7').value = `CONCENTRADO GENERAL DE INSCRIPCIÓN DEL CICLO ESCOLAR ${reports[0]?.year.name ?? ''}`
  sheet.getCell('A7').font = font({ bold: true, size: 12 }); sheet.getCell('A7').alignment = { horizontal: 'center' }
  const style = (cell: ReturnType<Worksheet['getCell']>, bold = false) => { cell.border = border; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; if (bold) { cell.font = font({ bold: true }); cell.fill = headerFill } }
  sheet.mergeCells('A9:A10'); sheet.mergeCells('B9:B10'); sheet.mergeCells('C9:E9'); sheet.mergeCells('F9:F10'); sheet.mergeCells('G9:G10'); sheet.mergeCells('H9:J9')
  const heads: [string, string][] = [['A9', 'Grupo'], ['B9', 'Docente frente a grupo'], ['C9', 'Inscripción inicial'], ['F9', 'Altas'], ['G9', 'Bajas'], ['H9', 'Existencia'],
    ['C10', 'H'], ['D10', 'M'], ['E10', 'Total'], ['H10', 'H'], ['I10', 'M'], ['J10', 'Total']]
  for (const [ref, value] of heads) { sheet.getCell(ref).value = value; style(sheet.getCell(ref), true) }
  reports.forEach((report, index) => {
    const r = 11 + index
    const values = [groupTitle(report.group), report.teacher, total(report.stats.inicial, 'h'), total(report.stats.inicial, 'm'), { formula: `C${r}+D${r}`, result: total(report.stats.inicial, 'h') + total(report.stats.inicial, 'm') },
      total(report.stats.altas, 'h') + total(report.stats.altas, 'm'), total(report.stats.bajas, 'h') + total(report.stats.bajas, 'm'),
      total(report.stats.existencia, 'h'), total(report.stats.existencia, 'm'), { formula: `H${r}+I${r}`, result: total(report.stats.existencia, 'h') + total(report.stats.existencia, 'm') }]
    sheet.getRow(r).values = values
    sheet.getRow(r).eachCell({ includeEmpty: true }, (cell, col) => { if (col <= 10) { style(cell); if (col === 2) cell.alignment = { horizontal: 'left' } } })
  })
  const last = 10 + reports.length
  const totalRow = sheet.getRow(last + 1)
  totalRow.values = ['Total', '', ...['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((col) => ({ formula: `SUM(${col}11:${col}${last})`, result: reports.reduce((sum, report, index) => {
    const cell = sheet.getCell(`${col}${11 + index}`).value
    return sum + (typeof cell === 'number' ? cell : (cell as { result: number }).result)
  }, 0) }))]
  totalRow.eachCell({ includeEmpty: true }, (cell, col) => { if (col <= 10) style(cell, true) })
}

const sheetName = (report: GroupEnrollmentReport, kind: string) => `${report.group.grade}${report.group.label} ${shiftCode(report.group.shift)} ${kind}`.slice(0, 31)

export async function enrollmentWorkbook(reports: GroupEnrollmentReport[], general: boolean) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Portal escolar'
  workbook.created = new Date()
  const [sep, school] = await Promise.all([imageBuffer('/img/documentos/sep-bcs.png'), imageBuffer('/img/documentos/escudo-escuela.png')])
  const logos = { sep: workbook.addImage({ buffer: sep, extension: 'png' }), school: workbook.addImage({ buffer: school, extension: 'png' }) }
  if (general) summarySheet(workbook, reports, logos)
  for (const report of reports) {
    rosterSheet(workbook, general ? sheetName(report, 'Listado') : `Listado oficial ${report.year.name}`, report, logos)
    statsSheet(workbook, general ? sheetName(report, 'Estadística') : `Registro estadístico ${report.year.name}`, report, logos)
  }
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function enrollmentFileName(reports: GroupEnrollmentReport[], general: boolean) {
  const year = reports[0]?.year.name ?? ''
  if (general) return `${officialSchool.cct}_GENERAL_INSCRIPCION ${year}.xlsx`
  const { group } = reports[0]
  return `${officialSchool.cct}_${group.grade}_${group.label}_${shiftCode(group.shift)} PERIODO_INSCRIPCION ${year}.xlsx`
}
