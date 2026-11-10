import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { errorMessage } from '@/shared/errors'
import { Icon } from '@/shared/components/Icon'
import { Button, IconButton } from '@/shared/ui/Button'
import { Alert } from '@/shared/ui/Feedback'
import { Field } from '@/shared/ui/Field'
import { defaultContent, type SiteContent, type SiteSection } from '../school'
import { saveSiteSection, uploadLimits, uploadsConfigured, uploadSiteFile, useSite, type UploadFolder } from '../SiteContent'

/**
 * Borrador local de una sección: se edita sin afectar el sitio hasta "Guardar".
 * Si otra persona guarda mientras no hay cambios pendientes, el borrador se actualiza.
 * Cada cambio del borrador se informa a la página para la vista previa.
 */
export type DraftListener = (section: SiteSection, dirty: boolean, draft: unknown) => void
export function useSectionDraft<S extends SiteSection>(section: S, onDraftChange: DraftListener) {
  const { content } = useSite()
  const remote = content[section]
  const [draft, setDraft] = useState<SiteContent[S]>(remote)
  const [baseline, setBaseline] = useState<SiteContent[S]>(remote)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  useEffect(() => {
    if (dirtyRef.current) return
    setDraft(remote)
    setBaseline(remote)
  }, [remote])
  useEffect(() => { onDraftChange(section, dirty, draft) }, [section, dirty, draft, onDraftChange])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = (change: Partial<SiteContent[S]>) => { setNotice(''); setDraft((current) => ({ ...current, ...change })) }

  async function save(validate?: (value: SiteContent[S]) => string) {
    const problem = validate?.(draft) ?? ''
    if (problem) { setError(problem); setNotice(''); return }
    setSaving(true); setError(''); setNotice('')
    try {
      await saveSiteSection(section, draft)
      setBaseline(draft)
      setNotice('Cambios publicados. Ya se ven en el sitio.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally { setSaving(false) }
  }

  return {
    draft, update, dirty, saving, error, notice, save,
    discard: () => { setDraft(baseline); setError(''); setNotice('') },
    restoreDefaults: () => { setDraft(defaultContent[section]); setError(''); setNotice('Se cargó el contenido original. Pulsa "Guardar cambios" para publicarlo.') },
  }
}

/** Barra fija al pie con los mensajes y los botones de la sección. */
interface DraftStatus { error: string; notice: string; saving: boolean; dirty: boolean; discard: () => void; restoreDefaults: () => void }
export function SaveBar({ draft, onSave }: { draft: DraftStatus; onSave: () => void }) {
  return <div className="site-editor-bar">
    {draft.error && <Alert tone="error" role="alert">{draft.error}</Alert>}
    {draft.notice && !draft.error && <Alert tone="success" role="status">{draft.notice}</Alert>}
    <div className="site-editor-actions">
      <Button variant="quiet" size="sm" icon="refresh" onClick={() => { if (window.confirm('¿Cargar el contenido original de esta sección? No se publica hasta que guardes.')) draft.restoreDefaults() }} disabled={draft.saving}>Contenido original</Button>
      <span className="site-editor-state">{draft.dirty ? 'Cambios sin guardar' : 'Todo guardado'}</span>
      <Button onClick={draft.discard} disabled={!draft.dirty || draft.saving}>Descartar</Button>
      <Button variant="primary" icon="check" loading={draft.saving} disabled={!draft.dirty} onClick={onSave}>Guardar cambios</Button>
    </div>
  </div>
}

export function TextInput({ label, value, onChange, required, hint, full, multiline, type = 'text', maxLength = 2000, placeholder, list }: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean; hint?: ReactNode; full?: boolean
  multiline?: boolean; type?: string; maxLength?: number; placeholder?: string; list?: string
}) {
  return <Field label={label} required={required} hint={hint} full={full || multiline}>
    {multiline
      ? <textarea rows={4} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      : <input type={type} value={value} maxLength={maxLength} placeholder={placeholder} list={list} onChange={(event) => onChange(event.target.value)} />}
  </Field>
}

export function SelectInput({ label, value, onChange, options, full }: { label: string; value: string; onChange: (value: string) => void; options: readonly { value: string; label: string }[]; full?: boolean }) {
  return <Field label={label} full={full}>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {!options.some((option) => option.value === value) && <option value={value}>{value || 'Selecciona una opción'}</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </Field>
}

/** Nombre legible de un archivo a partir de su dirección. */
function fileName(url: string) {
  const last = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '')
  return last || url
}

/**
 * Archivo del sitio: se sube desde la computadora (botón o arrastrando) o se
 * escribe su dirección (por ejemplo /img/galeria/1.jpg o un enlace de Drive).
 * Las fotos muestran una miniatura grande para comprobar que es la correcta.
 */
export function FileInput({ label, value, onChange, folder, required, hint, onUploaded }: {
  label: string; value: string; onChange: (value: string) => void; folder: UploadFolder; required?: boolean; hint?: ReactNode
  /** Se llama con el archivo original después de subirlo (por ejemplo, para proponer un nombre). */
  onUploaded?: (file: File) => void
}) {
  const inputId = useId()
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [broken, setBroken] = useState('')
  const limits = uploadLimits[folder]
  const busy = progress !== null
  const isImage = folder === 'imagenes'

  async function upload(file: File | undefined) {
    if (!file || busy) return
    setProgress(0); setError('')
    try {
      onChange(await uploadSiteFile(file, folder, setProgress))
      onUploaded?.(file)
    } catch (caught) { setError(errorMessage(caught)) } finally { setProgress(null) }
  }

  return <div className={`field field-full file-input${dragging ? ' is-dragging' : ''}`}
    onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true) } }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }}
    onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]) }}>
    <label htmlFor={`${inputId}-url`}>{label}{required ? ' *' : ''}</label>
    <div className={`file-input-box${isImage ? ' is-image' : ''}`}>
      {isImage
        ? <span className="file-input-preview">
          {value && broken !== value ? <img src={value} alt="Vista previa de la foto" onError={() => setBroken(value)} />
            : <span className="file-input-empty"><Icon name={value ? 'warning' : 'image'} size={26} />{value ? 'No se pudo mostrar la foto' : 'Sin foto'}</span>}
        </span>
        : <span className="file-input-doc"><Icon name="file" size={26} /><span>{value ? fileName(value) : 'Sin archivo'}</span></span>}
      <div className="file-input-controls">
        <div className="file-input-row">
          <label className={`btn btn-secondary file-input-button${busy ? ' is-busy' : ''}`}>
            {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="upload" size={18} />}
            {busy ? `Subiendo… ${progress}%` : value ? 'Cambiar archivo' : 'Subir archivo'}
            <input type="file" className="sr-only" accept={limits.accept} disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = '' }} />
          </label>
          {value && <a className="btn btn-quiet" href={value} target="_blank" rel="noreferrer"><Icon name="external" size={18} />Abrir</a>}
        </div>
        {busy && <progress className="file-input-progress" max={100} value={progress} aria-label="Avance de la subida" />}
        <p className="file-input-drop">{isImage ? 'o arrastra una foto aquí' : 'o arrastra el archivo aquí'}</p>
        <details className="file-input-url">
          <summary>Escribir la dirección</summary>
          <input id={`${inputId}-url`} type="text" value={value} placeholder={isImage ? 'https://… o /img/galeria/1.jpg' : 'https://… o /documentos/archivo.pdf'} onChange={(event) => onChange(event.target.value)} aria-describedby={`${inputId}-hint`} />
        </details>
      </div>
    </div>
    <p className="field-hint" id={`${inputId}-hint`}>
      {!uploadsConfigured && <strong>La subida aún no está configurada; por ahora escribe la dirección. </strong>}
      {hint ?? limits.label}
    </p>
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>
}

/** Tarjeta de un elemento de lista con controles para moverlo o quitarlo. */
export function ItemCard({ title, index, count, onMove, onRemove, children }: { title: string; index: number; count: number; onMove: (to: number) => void; onRemove: () => void; children: ReactNode }) {
  return <div className="site-item">
    <div className="site-item-head">
      <h3><span className="site-item-number">{index + 1}</span>{title}</h3>
      <div className="row-actions">
        <IconButton icon="chevronUp" label="Subir" disabled={index === 0} onClick={() => onMove(index - 1)} />
        <IconButton icon="chevronDown" label="Bajar" disabled={index === count - 1} onClick={() => onMove(index + 1)} />
        <IconButton icon="trash" label="Quitar" onClick={onRemove} />
      </div>
    </div>
    <div className="form-grid">{children}</div>
  </div>
}

/** Utilidades inmutables para las listas del borrador. */
export const list = {
  set: <T,>(items: T[], index: number, change: Partial<T>) => items.map((item, position) => position === index ? { ...item, ...change } : item),
  remove: <T,>(items: T[], index: number) => items.filter((_, position) => position !== index),
  move: <T,>(items: T[], from: number, to: number) => {
    if (to < 0 || to >= items.length) return items
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
  },
}

export function EditorCard({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section className="card">
    <div className="card-heading">
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action}
    </div>
    {children}
  </section>
}
