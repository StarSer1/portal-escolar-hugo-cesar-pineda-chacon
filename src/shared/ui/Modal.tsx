import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'

/**
 * Native modal dialog: traps focus, closes with Escape unless busy, and restores
 * focus to the opener. Forms pass `focusField` to start on their first editable field.
 */
export function Modal({ title, description, children, onClose, busy = false, wide = false, focusField = false }: { title: string; description?: ReactNode; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean; focusField?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog?.showModal()
    if (focusField) dialog?.querySelector<HTMLElement>('.modal-body :is(input, select, textarea):not(:disabled):not([readonly]):not([type="hidden"])')?.focus()
    return () => { dialog?.close(); previous?.focus() }
  }, [focusField])
  return (
    <dialog ref={ref} className={`modal${wide ? ' modal-wide' : ''}`} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
      <div className="modal-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p className="modal-description">{description}</p>}
        </div>
        <IconButton icon="close" label="Cerrar ventana" onClick={onClose} disabled={busy} />
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  )
}
