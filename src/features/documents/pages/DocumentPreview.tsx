import { useEffect, useRef, useState } from 'react'
import { Field } from '@/shared/ui/Field'
import { Button } from '@/shared/ui/Button'
import type { Group, SchoolYear } from '@/types/models'
import { groupName } from '@/features/academic/components/AcademicUI'
import { ALL } from '../preferences'

/** Vista previa del documento; imprime el iframe para «Guardar como PDF». */
export function PrintPreview({ html, title, label }: { html: string; title: string; label: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(false), [html])
  function print() {
    const view = frame.current?.contentWindow
    if (!view) return
    view.focus()
    view.print()
  }
  return <section className="card doc-preview" aria-label={`Vista previa: ${title}`}>
    <div className="card-heading">
      <div><h2>Vista previa</h2><p>{title}. En la ventana de impresión elige «Guardar como PDF» para obtener el archivo.</p></div>
      <Button variant="primary" icon="download" disabled={!ready} onClick={print}>{label}</Button>
    </div>
    <iframe ref={frame} className="doc-frame" title={`Vista previa: ${title}`} srcDoc={html} onLoad={() => setReady(true)} />
  </section>
}

export function YearAndGroup({ years, yearId, onYear, groups, groupId, onGroup, allLabel }: {
  years: SchoolYear[]; yearId: string; onYear: (id: string) => void; groups: Group[]; groupId: string; onGroup: (id: string) => void; allLabel?: string
}) {
  return <>
    <Field label="Ciclo escolar">
      <select value={yearId} onChange={(event) => onYear(event.target.value)}>
        <option value="">Selecciona un ciclo</option>
        {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
      </select>
    </Field>
    <Field label="Grupo">
      <select value={groupId} disabled={!yearId} onChange={(event) => onGroup(event.target.value)}>
        <option value="">Selecciona un grupo</option>
        {allLabel && groups.length > 0 && <option value={ALL}>{allLabel}</option>}
        {groups.map((group) => <option key={group.id} value={group.id}>{groupName(group)}</option>)}
      </select>
    </Field>
  </>
}
