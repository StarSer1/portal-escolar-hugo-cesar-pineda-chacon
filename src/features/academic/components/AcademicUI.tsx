import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAcademic } from '@/features/academic/AcademicContext'
import { saveRecord } from '@/features/academic/services/academic.service'
import type { EditableCollection } from '@/types/models'

export const specialtyLabels: Record<string, string> = { general: 'Docente general', physical: 'Educación Física', english: 'Inglés', arts: 'Artes' }
export const statusLabels: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', planned: 'Planeado', closed: 'Cerrado', open: 'Abierto', withdrawn: 'Baja', transferred: 'Cambio de grupo' }
export const specialtyOptions = Object.entries(specialtyLabels).map(([value, label]) => ({ value, label }))
export const activeOptions = [{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }]
export const gradeOptions = [1, 2, 3, 4, 5, 6].map((grade) => ({ value: String(grade), label: `${grade}° de primaria` }))

export function fullName(student: { names: string; surnames: string }) { return `${student.names} ${student.surnames}`.trim() }
export function groupName(group: { grade: number; label: string; shift?: string }) { return `${group.grade}° ${group.label}${group.shift ? ` · ${group.shift}` : ''}` }
export function today() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function displayDate(value: string | undefined) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
export function errorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code.includes('permission-denied')) return 'No tienes permisos para esta operación o el registro incumple una regla de integridad. Revisa tu sesión y los datos.'
  if (code.includes('unavailable')) return 'No fue posible conectar. Revisa tu conexión e inténtalo de nuevo.'
  return error instanceof Error ? error.message : 'No fue posible guardar los cambios. Inténtalo de nuevo.'
}
export function matchesQuery(query: string, ...values: unknown[]) {
  const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return values.some((value) => normalize(value).includes(normalize(query.trim())))
}
export function StatusBadge({ value }: { value: string }) { return <span className={`badge ${['active', 'open'].includes(value) ? 'badge-success' : 'badge-muted'}`}>{statusLabels[value] ?? value}</span> }

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p className="page-description">{description}</p></div>{action}</header>
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) { return <div className="empty-state"><h3>{title}</h3>{children && <p>{children}</p>}</div> }
export function DataState({ children }: { children: ReactNode }) {
  const { loading, error, retry } = useAcademic()
  if (loading) return <div className="card empty-state" role="status"><span className="loading-dot" /> Cargando información académica…</div>
  if (error) return <div className="error-banner" role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={retry}>Volver a intentar</button></div>
  return <>{children}</>
}

export function Modal({ title, children, onClose, busy = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog?.showModal()
    return () => { dialog?.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className={`modal${wide ? ' modal-wide' : ''}`} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="modal-heading"><h2 id={titleId}>{title}</h2><button className="icon-button" type="button" aria-label="Cerrar ventana" onClick={onClose} disabled={busy}>×</button></div>
    <div className="modal-body">{children}</div>
  </dialog>
}

export type Option = { value: string; label: string }
export type Draft = Record<string, string>
export type ManagedRecord = { id: string; [key: string]: unknown }
export interface FormField {
  key: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea'
  required?: boolean
  options?: Option[] | ((draft: Draft) => Option[])
  defaultValue?: string
  hint?: string
  maxLength?: number
  min?: string | number
  max?: string | number
  full?: boolean
  immutable?: boolean
  uppercase?: boolean
}
export interface TableColumn { label: string; render: (record: ManagedRecord) => ReactNode }

export function RecordFields({ fields, draft, onChange, editing = false }: { fields: FormField[]; draft: Draft; onChange: (key: string, value: string) => void; editing?: boolean }) {
  return <div className="form-grid">{fields.map((field) => {
    const options = typeof field.options === 'function' ? field.options(draft) : field.options
    return <label className={`field${field.full ? ' field-full' : ''}`} key={field.key}><span>{field.label}{field.required ? ' *' : ''}</span>
      {field.type === 'select' ? <select name={field.key} value={draft[field.key] ?? ''} disabled={editing && field.immutable} required={field.required} onChange={(event) => onChange(field.key, event.target.value)}><option value="">Seleccionar…</option>{options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : field.type === 'textarea' ? <textarea name={field.key} value={draft[field.key] ?? ''} required={field.required} maxLength={field.maxLength ?? 500} rows={3} onChange={(event) => onChange(field.key, event.target.value)} />
          : <input name={field.key} type={field.type ?? 'text'} value={draft[field.key] ?? ''} disabled={editing && field.immutable} required={field.required} maxLength={field.maxLength ?? 120} min={field.min} max={field.max} onChange={(event) => onChange(field.key, field.uppercase ? event.target.value.toUpperCase() : event.target.value)} />}
      {field.hint && <small>{field.hint}</small>}
    </label>
  })}</div>
}

export function RecordManager({ title, singular, description, collection, records, fields, columns, searchFields, validate, detail, emptyHint, beforeSave }: {
  title: string; singular: string; description: string; collection: EditableCollection; records: ManagedRecord[]; fields: FormField[]; columns: TableColumn[]; searchFields: string[]
  validate?: (draft: Draft, editingId?: string) => string | undefined
  detail?: (record: ManagedRecord) => void
  emptyHint?: string
  beforeSave?: (input: Record<string, unknown>, id?: string) => Record<string, unknown>
}) {
  const { loading, error: dataError } = useAcademic()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<ManagedRecord | null | undefined>(undefined)
  const [draft, setDraft] = useState<Draft>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  function open(record: ManagedRecord | null) {
    setDraft(Object.fromEntries(fields.map((field) => [field.key, String(record?.[field.key] ?? field.defaultValue ?? '')])))
    setEditing(record); setError(''); setNotice('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalized = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]))
    const invalid = validate?.(normalized, editing?.id)
    if (invalid) { setError(invalid); return }
    setBusy(true); setError('')
    try {
      const values = Object.fromEntries(fields.map((field) => [field.key, field.type === 'number' || field.key === 'grade' || field.key === 'order' ? Number(normalized[field.key]) : normalized[field.key]]))
      await saveRecord(collection, { ...(beforeSave ? beforeSave(values, editing?.id) : values), ...(editing ? { revision: editing.revision } : {}) }, editing?.id)
      setNotice(`${singular} ${editing ? 'actualizado' : 'registrado'} correctamente.`)
      setEditing(undefined)
    } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false) }
  }
  const filtered = records.filter((record) => (!status || record.status === status) && matchesQuery(query, ...searchFields.map((field) => record[field])))
  const statuses = Array.from(new Set(records.map((record) => String(record.status ?? '')).filter(Boolean)))
  return <>
    <PageHeading eyebrow="Gestión académica" title={title} description={description} action={<button className="btn btn-primary" onClick={() => open(null)} disabled={loading || !!dataError}>+ Agregar {singular.toLowerCase()}</button>} />
    {notice && <p className="success-banner" role="status">{notice}</p>}
    <DataState><section className="card">
      <div className="toolbar"><label className="search-field"><span className="sr-only">Buscar en {title.toLowerCase()}</span><input className="search-input" type="search" placeholder={`Buscar en ${title.toLowerCase()}…`} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        {statuses.length > 0 && <label className="filter-field"><span className="sr-only">Filtrar por estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value] ?? value}</option>)}</select></label>}
        <span className="record-count">{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span>
      </div>
      {filtered.length ? <div className="table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.label} scope="col">{column.label}</th>)}<th scope="col">Acciones</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}>{columns.map((column) => <td key={column.label}>{column.render(record)}</td>)}<td><div className="row-actions">{detail && <button className="btn btn-small btn-secondary" onClick={() => detail(record)}>Ver expediente</button>}<button className="btn btn-small btn-quiet" onClick={() => open(record)} aria-label={`Editar ${singular.toLowerCase()} ${String(record.name ?? record.names ?? record.label ?? '')}`}>Editar</button></div></td></tr>)}</tbody></table></div>
        : <EmptyState title={records.length ? 'Sin coincidencias' : `Todavía no hay ${title.toLowerCase()}`}>{records.length ? 'Prueba otra búsqueda o cambia el filtro.' : emptyHint ?? `Agrega el primer registro para empezar a trabajar.`}</EmptyState>}
    </section></DataState>
    {editing !== undefined && <Modal title={`${editing ? 'Editar' : 'Agregar'} ${singular.toLowerCase()}`} onClose={() => setEditing(undefined)} busy={busy}><form onSubmit={submit}>
      <p className="form-help">Los campos con * son obligatorios.</p>
      <fieldset className="form-fieldset" disabled={busy}><RecordFields fields={fields} draft={draft} editing={!!editing} onChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))} /></fieldset>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setEditing(undefined)} disabled={busy}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form></Modal>}
  </>
}
