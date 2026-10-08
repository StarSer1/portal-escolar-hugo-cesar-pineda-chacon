import { cloneElement, useId, type ReactElement, type ReactNode } from 'react'

type Control = ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>

/**
 * Label above, control, then hint and error linked through aria-describedby.
 * The label holds only its text (plus " *" when required) so accessible names stay exact.
 */
export function Field({ label, required = false, hint, error, full = false, children }: { label: string; required?: boolean; hint?: ReactNode; error?: string; full?: boolean; children: Control }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={`field${full ? ' field-full' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{required ? ' *' : ''}</label>
      {cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && <p className="field-hint" id={hintId}>{hint}</p>}
      {error && <p className="field-error" id={errorId}>{error}</p>}
    </div>
  )
}

export function CheckboxField({ label, full = false, ...rest }: { label: string; full?: boolean; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`checkbox-field${full ? ' field-full' : ''}`}>
      <input type="checkbox" checked={rest.checked} disabled={rest.disabled} onChange={(event) => rest.onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/** A titled group of fields inside a form. */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      {description && <p className="form-section-description">{description}</p>}
      <div className="form-grid">{children}</div>
    </fieldset>
  )
}

export function SearchField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="search-field">
      <span className="sr-only">{label}</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M21 21l-4.3-4.3" /></svg>
      <input type="search" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export interface Option { value: string; label: string }

/** Select whose label is visually hidden; always starts with an "all" option. */
export function FilterSelect({ label, allLabel, value, options, onChange }: { label: string; allLabel: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  return (
    <label className="filter-field">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

export function Toolbar({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return <div className="toolbar">{children}{count !== undefined && <span className="record-count">{count}</span>}</div>
}
