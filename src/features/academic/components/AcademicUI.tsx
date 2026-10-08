import { useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { saveRecord } from '@/features/academic/services/academic.service'
import { Button, IconButton } from '@/shared/ui/Button'
import { DataTable, type Column } from '@/shared/ui/DataTable'
import { Alert, Badge, EmptyState, PageHeader, type BadgeTone } from '@/shared/ui/Feedback'
import { Field, FilterSelect, FormSection, SearchField, Toolbar, type Option } from '@/shared/ui/Field'
import { Modal } from '@/shared/ui/Modal'
import type { EditableCollection } from '@/types/models'

export type { Option } from '@/shared/ui/Field'
export const specialtyLabels: Record<string, string> = { general: 'Docente general', physical: 'Educación Física', english: 'Inglés', arts: 'Artes' }
export const statusLabels: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', planned: 'Planeado', closed: 'Cerrado', open: 'Abierto', withdrawn: 'Baja', transferred: 'Cambio de grupo' }
export const specialtyOptions = Object.entries(specialtyLabels).map(([value, label]) => ({ value, label }))
export const activeOptions = [{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }]
export const gradeOptions = [1, 2, 3, 4, 5, 6].map((grade) => ({ value: String(grade), label: `${grade}° de primaria` }))

export function fullName(student: { names: string; surnames: string }) { return `${student.names} ${student.surnames}`.trim() }
export function initials(name: string) { return name.split(/\s+/).filter((word) => word && !word.endsWith('.')).slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase() }
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

const statusTones: Record<string, BadgeTone> = { active: 'success', open: 'success', planned: 'info', transferred: 'info', withdrawn: 'alert' }
export function StatusBadge({ value }: { value: string }) { return <Badge tone={statusTones[value] ?? 'muted'}>{statusLabels[value] ?? value}</Badge> }

export function DataState({ children }: { children: ReactNode }) {
  const { loading, error, retry } = useAcademic()
  if (loading) return <div className="card loading-state" role="status"><span className="spinner" aria-hidden="true" /> Cargando información académica…</div>
  if (error) return <Alert tone="error" role="alert" title="No pudimos cargar la información" action={<Button icon="refresh" onClick={retry}>Volver a intentar</Button>}>{error}</Alert>
  return <>{children}</>
}

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
  placeholder?: string
  maxLength?: number
  min?: string | number
  max?: string | number
  full?: boolean
  immutable?: boolean
  uppercase?: boolean
  /** Fields that share a section render together under its title. */
  section?: string
}
export interface RecordFilter { key: string; label: string; allLabel: string; options: Option[]; defaultValue?: string; match: (record: ManagedRecord, value: string) => boolean }

function FieldControl({ field, draft, editing, onChange }: { field: FormField; draft: Draft; editing: boolean; onChange: (key: string, value: string) => void }) {
  const value = draft[field.key] ?? ''
  const locked = editing && field.immutable
  const hint = field.hint ?? (locked ? 'Se conserva desde el alta para proteger el historial.' : undefined)
  if (field.type === 'select') {
    const options = typeof field.options === 'function' ? field.options(draft) : field.options
    return <Field label={field.label} required={field.required} hint={hint} full={field.full}>
      <select name={field.key} value={value} disabled={locked} required={field.required} onChange={(event) => onChange(field.key, event.target.value)}>
        <option value="">Seleccionar…</option>
        {options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  }
  if (field.type === 'textarea') {
    return <Field label={field.label} required={field.required} hint={hint} full={field.full}>
      <textarea name={field.key} value={value} required={field.required} maxLength={field.maxLength ?? 500} rows={3} placeholder={field.placeholder} onChange={(event) => onChange(field.key, event.target.value)} />
    </Field>
  }
  return <Field label={field.label} required={field.required} hint={hint} full={field.full}>
    <input
      name={field.key}
      type={field.type ?? 'text'}
      value={value}
      disabled={locked}
      required={field.required}
      maxLength={field.maxLength ?? 120}
      min={field.min}
      max={field.max}
      placeholder={field.placeholder}
      className={field.uppercase ? 'text-mono' : undefined}
      onChange={(event) => onChange(field.key, field.uppercase ? event.target.value.toUpperCase() : event.target.value)}
    />
  </Field>
}

export function RecordFields({ fields, draft, onChange, editing = false }: { fields: FormField[]; draft: Draft; onChange: (key: string, value: string) => void; editing?: boolean }) {
  const sections: { title?: string; fields: FormField[] }[] = []
  for (const field of fields) {
    const last = sections.at(-1)
    if (last && last.title === field.section) last.fields.push(field)
    else sections.push({ title: field.section, fields: [field] })
  }
  return <div className="form-sections">
    {sections.map((section, index) => {
      const controls = section.fields.map((field) => <FieldControl key={field.key} field={field} draft={draft} editing={editing} onChange={onChange} />)
      return section.title ? <FormSection key={section.title} title={section.title}>{controls}</FormSection> : <div key={index} className="form-grid">{controls}</div>
    })}
  </div>
}

export function RecordManager({ title, singular, description, collection, records, fields, columns, searchFields, searchPlaceholder, validate, detail, emptyHint, beforeSave, nested = false, filters = [], initialSort }: {
  title: string; singular: string; description: string; collection: EditableCollection; records: ManagedRecord[]; fields: FormField[]; columns: Column<ManagedRecord>[]; searchFields: string[]
  searchPlaceholder?: string
  validate?: (draft: Draft, editingId?: string) => string | undefined
  detail?: (record: ManagedRecord) => void
  emptyHint?: string
  beforeSave?: (input: Record<string, unknown>, id?: string) => Record<string, unknown>
  nested?: boolean
  filters?: RecordFilter[]
  initialSort?: { key: string; direction: 'asc' | 'desc' }
}) {
  const { loading, error: dataError } = useAcademic()
  const [params, setParams] = useSearchParams()
  const blankDraft = (record: ManagedRecord | null) => Object.fromEntries(fields.map((field) => [field.key, String(record?.[field.key] ?? field.defaultValue ?? '')]))
  // "?nuevo=1" (from shortcuts such as "Registrar alumno") opens the add form directly.
  const [editing, setEditing] = useState<ManagedRecord | null | undefined>(() => params.get('nuevo') === '1' ? null : undefined)
  const [draft, setDraft] = useState<Draft>(() => blankDraft(null))
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => Object.fromEntries(filters.map((filter) => [filter.key, filter.defaultValue ?? ''])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const name = singular.toLowerCase()

  function open(record: ManagedRecord | null) {
    setDraft(blankDraft(record))
    setEditing(record); setError(''); setNotice('')
  }
  function close() {
    setEditing(undefined)
    if (params.has('nuevo')) setParams((current) => { const next = new URLSearchParams(current); next.delete('nuevo'); return next }, { replace: true })
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
      close()
    } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false) }
  }

  const statuses = Array.from(new Set(records.map((record) => String(record.status ?? '')).filter(Boolean)))
  const filtered = records.filter((record) => (!status || record.status === status)
    && filters.every((filter) => !filterValues[filter.key] || filter.match(record, filterValues[filter.key]))
    && matchesQuery(query, ...searchFields.map((field) => record[field])))
  const resetKey = [query, status, ...Object.values(filterValues)].join('|')

  return <>
    <PageHeader level={nested ? 2 : 1} title={title} description={description} actions={<Button variant="primary" icon="plus" onClick={() => open(null)} disabled={loading || !!dataError}>Agregar {name}</Button>} />
    {notice && <Alert tone="success" role="status">{notice}</Alert>}
    <DataState>
      <section className="card table-card" aria-label={title}>
        <Toolbar count={`${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`}>
          <SearchField label={`Buscar en ${title.toLowerCase()}`} placeholder={searchPlaceholder ?? `Buscar en ${title.toLowerCase()}…`} value={query} onChange={setQuery} />
          {filters.map((filter) => <FilterSelect key={filter.key} label={filter.label} allLabel={filter.allLabel} options={filter.options} value={filterValues[filter.key] ?? ''} onChange={(value) => setFilterValues((current) => ({ ...current, [filter.key]: value }))} />)}
          {statuses.length > 1 && <FilterSelect label="Filtrar por estado" allLabel="Todos los estados" options={statuses.map((value) => ({ value, label: statusLabels[value] ?? value }))} value={status} onChange={setStatus} />}
        </Toolbar>
        <DataTable
          caption={title}
          rows={filtered}
          columns={columns}
          rowKey={(record) => record.id}
          initialSort={initialSort}
          resetKey={resetKey}
          actions={(record) => <div className="row-actions">
            {detail && <Button size="sm" icon="file" onClick={() => detail(record)}>Ver expediente</Button>}
            <IconButton icon="pencil" label={`Editar ${name} ${String(record.name ?? record.names ?? record.label ?? '')}`.trim()} onClick={() => open(record)} />
          </div>}
          empty={records.length
            ? <EmptyState icon="search" title="Sin coincidencias">Prueba otra búsqueda o cambia los filtros.</EmptyState>
            : <EmptyState icon="plus" title={`Todavía no hay ${title.toLowerCase()}`}>{emptyHint ?? 'Agrega el primer registro para empezar a trabajar.'}</EmptyState>}
        />
      </section>
    </DataState>
    {editing !== undefined && <Modal title={`${editing ? 'Editar' : 'Agregar'} ${name}`} description="Los campos con * son obligatorios." onClose={close} busy={busy} focusField wide={fields.length > 6}>
      <form onSubmit={submit}>
        <fieldset className="form-fieldset" disabled={busy}>
          <RecordFields fields={fields} draft={draft} editing={!!editing} onChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))} />
        </fieldset>
        {error && <Alert tone="error" role="alert">{error}</Alert>}
        <div className="form-actions">
          <Button onClick={close} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button>
        </div>
      </form>
    </Modal>}
  </>
}
