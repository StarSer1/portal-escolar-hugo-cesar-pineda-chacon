import { useMemo, useState } from 'react'
import { errorMessage } from '@/shared/errors'
import { Button, IconButton } from '@/shared/ui/Button'
import { Alert, Badge, PageHeader } from '@/shared/ui/Feedback'
import { CheckboxField, Field } from '@/shared/ui/Field'
import { saveSpecialistSchedules, useSpecialistSchedules } from '../scheduleStore'
import {
  DAYS, defaultSchedules, normalizeGroup, scheduleConflicts, scheduleGroups, schedulesHtml, subjectLabels, toneColors,
  type ScheduleTable, type SpecialistSchedules, type SpecialistSubject, type TableTone,
} from '../specialistSchedule'
import { PrintPreview } from './DocumentPreview'

const clone = (value: SpecialistSchedules): SpecialistSchedules => JSON.parse(JSON.stringify(value))
const emptyTable = (): ScheduleTable => ({
  title: 'Nueva tabla', subject: 'english', tone: 'orange',
  rows: [...['8:00 a 8:50', '8:50 a 9:40', '9:40 a 10:30'].map((time) => ({ time, recess: false, cells: ['', '', '', '', ''] })),
    { time: '10:30 a 11:00', recess: true, cells: ['', '', '', '', ''] },
    ...['11:00 a 11:50', '11:50 a 12:30'].map((time) => ({ time, recess: false, cells: ['', '', '', '', ''] }))],
})

function TableEditor({ table, index, onChange, onRemove }: { table: ScheduleTable; index: number; onChange: (table: ScheduleTable) => void; onRemove: () => void }) {
  const setRow = (rowIndex: number, change: Partial<ScheduleTable['rows'][number]>) => onChange({ ...table, rows: table.rows.map((row, i) => i === rowIndex ? { ...row, ...change } : row) })
  const setCell = (rowIndex: number, day: number, value: string) => setRow(rowIndex, { cells: table.rows[rowIndex].cells.map((cell, i) => i === day ? normalizeGroup(value) : cell) })
  return <section className="card schedule-editor" aria-label={`Tabla ${index + 1}: ${table.title}`}>
    <div className="card-heading">
      <div><h2>{table.title || `Tabla ${index + 1}`}</h2><p>Escribe en cada celda el grupo que atiende (por ejemplo 3A). Deja en blanco las horas libres.</p></div>
      <IconButton icon="trash" label={`Quitar la tabla ${table.title}`} onClick={onRemove} />
    </div>
    <div className="form-grid">
      <Field label="Título de la tabla"><input value={table.title} maxLength={120} onChange={(event) => onChange({ ...table, title: event.target.value })} /></Field>
      <Field label="Especialidad" hint="Se usa para las hojas por grupo.">
        <select value={table.subject} onChange={(event) => onChange({ ...table, subject: event.target.value as SpecialistSubject })}>
          {(Object.keys(subjectLabels) as SpecialistSubject[]).map((key) => <option key={key} value={key}>{subjectLabels[key].name}</option>)}
        </select>
      </Field>
      <Field label="Color del encabezado">
        <select value={table.tone} onChange={(event) => onChange({ ...table, tone: event.target.value as TableTone })}>
          {(Object.keys(toneColors) as TableTone[]).map((key) => <option key={key} value={key}>{toneColors[key].label}</option>)}
        </select>
      </Field>
    </div>
    <div className="table-wrap">
      <table className="data-table schedule-grid">
        <caption className="sr-only">Horario: {table.title}</caption>
        <thead><tr><th scope="col">Horario</th><th scope="col">Receso</th>{DAYS.map((day) => <th key={day} scope="col">{day}</th>)}<th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>
          <td><input aria-label={`Horario de la fila ${rowIndex + 1}`} value={row.time} maxLength={40} onChange={(event) => setRow(rowIndex, { time: event.target.value })} /></td>
          <td><input type="checkbox" aria-label={`La fila ${rowIndex + 1} es receso`} checked={row.recess} onChange={(event) => setRow(rowIndex, { recess: event.target.checked })} /></td>
          {row.recess ? <td colSpan={5} className="schedule-recess">RECESO</td>
            : row.cells.map((cell, day) => <td key={day}><input className="schedule-cell" aria-label={`${DAYS[day]}, ${row.time}`} value={cell} maxLength={4} onChange={(event) => setCell(rowIndex, day, event.target.value)} /></td>)}
          <td><IconButton icon="trash" label={`Quitar la fila ${row.time}`} onClick={() => onChange({ ...table, rows: table.rows.filter((_, i) => i !== rowIndex) })} /></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="form-actions"><Button size="sm" icon="plus" disabled={table.rows.length >= 12} onClick={() => onChange({ ...table, rows: [...table.rows, { time: '', recess: false, cells: ['', '', '', '', ''] }] })}>Agregar fila</Button></div>
  </section>
}

/** Horarios de docentes especialistas: vista para imprimir y editor de la dirección. */
export function SchedulesTab() {
  const live = useSpecialistSchedules()
  const [draft, setDraft] = useState<SpecialistSchedules | null>(null)
  const [includeGroups, setIncludeGroups] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const editing = draft !== null
  const current = draft ?? live.schedules
  const html = useMemo(() => schedulesHtml(current, includeGroups), [current, includeGroups])
  const conflicts = scheduleConflicts(current)
  const invalid = [...new Set(current.tables.flatMap((table) => table.rows.flatMap((row) => row.recess ? [] : row.cells)).filter((code) => code && !/^[1-6][A-Z]$/.test(code)))]
  const changed = editing && JSON.stringify(draft) !== JSON.stringify(live.schedules)

  function update(change: (value: SpecialistSchedules) => void) {
    setDraft((value) => { const next = clone(value ?? live.schedules); change(next); return next })
    setMessage('')
  }
  async function save() {
    if (!draft) return
    setBusy(true); setError(''); setMessage('')
    try { await saveSpecialistSchedules(draft, live.revision); setDraft(null); setMessage('Horario guardado. Queda registrado en Actividad.') }
    catch (caught) { setError(errorMessage(caught)) }
    finally { setBusy(false) }
  }

  return <>
    <section className="card">
      <div className="card-heading">
        <div><h2>Horarios de docentes especialistas</h2><p>Inglés, Educación Física y Artes. Las hojas por grupo se arman solas a partir de las tablas por especialidad.</p></div>
        <Badge tone={live.saved ? 'success' : 'muted'}>{live.saved ? 'Versión guardada' : 'Horario original'}</Badge>
      </div>
      <div className="form-grid">
        <CheckboxField label="Incluir las hojas por grupo (una tabla por grupo)" checked={includeGroups} onChange={setIncludeGroups} />
      </div>
      <div className="form-actions">
        {!editing
          ? <Button variant="primary" icon="pencil" disabled={!live.ready} onClick={() => { setDraft(clone(live.schedules)); setMessage('') }}>Editar horario</Button>
          : <>
            <Button disabled={busy} onClick={() => { setDraft(null); setError('') }}>Descartar cambios</Button>
            <Button disabled={busy} icon="refresh" onClick={() => { if (window.confirm('¿Volver al horario original que entregó la subdirección? Tus cambios se reemplazan al guardar.')) update((value) => Object.assign(value, clone(defaultSchedules))) }}>Restaurar horario original</Button>
            <Button variant="primary" icon="check" loading={busy} disabled={!changed} onClick={save}>{busy ? 'Guardando…' : 'Guardar horario'}</Button>
          </>}
      </div>
      {live.error && <Alert tone="error" role="alert">No se pudo leer el horario guardado: {live.error}. Se muestra el horario original y la edición está deshabilitada.</Alert>}
      {error && <Alert tone="error" role="alert">{error}</Alert>}
      {message && <Alert tone="success" role="status">{message}</Alert>}
    </section>
    {conflicts.length > 0 && <Alert tone="warning" title="Grupos con dos clases a la misma hora">{conflicts.join(' · ')}</Alert>}
    {invalid.length > 0 && <Alert tone="warning">Revisa estas celdas: {invalid.join(', ')}. Un grupo se escribe con su grado y su letra, por ejemplo 4B.</Alert>}
    {editing && <>
      <PageHeader level={2} title="Editar horario" description={`${current.tables.length} tablas · ${scheduleGroups(current).length} grupos con clases de especialista`} />
      {current.tables.map((table, index) => <TableEditor key={index} index={index} table={table}
        onChange={(next) => update((value) => { value.tables[index] = next })}
        onRemove={() => { if (window.confirm(`¿Quitar la tabla «${table.title}»?`)) update((value) => { value.tables.splice(index, 1) }) }} />)}
      <div className="form-actions"><Button icon="plus" disabled={current.tables.length >= 12} onClick={() => update((value) => { value.tables.push(emptyTable()) })}>Agregar tabla</Button></div>
      <section className="card">
        <div className="card-heading"><div><h2>Firma al pie</h2><p>Aparece en cada hoja del horario.</p></div></div>
        <div className="form-grid">
          <Field label="Nombre"><input value={current.signerName} maxLength={160} onChange={(event) => update((value) => { value.signerName = event.target.value })} /></Field>
          <Field label="Cargo"><input value={current.signerRole} maxLength={160} onChange={(event) => update((value) => { value.signerRole = event.target.value })} /></Field>
        </div>
      </section>
    </>}
    <PrintPreview html={html} title={editing ? 'Horario con tus cambios (sin guardar)' : 'Horarios de docentes especialistas'} label="Imprimir o guardar PDF" />
  </>
}
