import { useCallback, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'
import { Button, IconButton } from '@/shared/ui/Button'
import { Alert, EmptyState, PageHeader } from '@/shared/ui/Feedback'
import { CheckboxField, FormSection } from '@/shared/ui/Field'
import { Modal } from '@/shared/ui/Modal'
import { TabPanel, Tabs } from '@/shared/ui/Tabs'
import { displayDay, documentIcons, eventKinds, roleColors, type EventKind, type SchoolDocument, type SchoolEvent, type SiteSection } from '../school'
import { useSite } from '../SiteContent'
import { eventDateLabel } from '../components/SchoolCalendar'
import { EditorCard, FileInput, ItemCard, list, SaveBar, SelectInput, TextInput, useSectionDraft, type DraftListener } from './EditorUI'
import { SitePreview, type PreviewPage } from './SitePreview'

const page = {
  home: { path: '/', label: 'Inicio' },
  about: { path: '/conocenos', label: 'Conócenos' },
  students: { path: '/estudiantes', label: 'Estudiantes' },
  calendar: { path: '/calendario', label: 'Calendario' },
  documents: { path: '/documentos', label: 'Documentos' },
  contact: { path: '/contactanos', label: 'Contáctanos' },
} satisfies Record<string, PreviewPage>

/** Cada sección indica las páginas donde se ve; la primera es la principal. */
const sections: { value: SiteSection; label: string; description: string; pages: PreviewPage[] }[] = [
  { value: 'home', label: 'Inicio', description: 'Carrusel de avisos y eventos de la portada.', pages: [page.home] },
  { value: 'calendar', label: 'Calendario', description: 'Fechas del ciclo, días sin clases y festejos.', pages: [page.calendar, page.home] },
  { value: 'documents', label: 'Documentos', description: 'Archivos para descargar y sus categorías.', pages: [page.documents] },
  { value: 'students', label: 'Estudiantes', description: 'Docentes por grado y evaluación.', pages: [page.students] },
  { value: 'general', label: 'Datos de la escuela', description: 'Contacto, horarios, misión, visión e historia.', pages: [page.contact, page.about, page.home] },
  { value: 'gallery', label: 'Galería', description: 'Fotos de la escuela.', pages: [page.home, page.about] },
  { value: 'images', label: 'Fotos de las páginas', description: 'Encabezados y fotos de Conócenos.', pages: [page.about, page.students, page.calendar, page.documents, page.contact, page.home] },
]

type EditorProps = { onDraftChange: DraftListener }

const previewPreference = 'sitio-vista-previa'
function initialPreview() {
  try {
    const saved = localStorage.getItem(previewPreference)
    if (saved) return saved === 'abierta'
  } catch { /* sin almacenamiento local */ }
  return window.matchMedia('(min-width: 1180px)').matches
}

export function SiteEditorPage() {
  const { error } = useSite()
  const [params, setParams] = useSearchParams()
  const tabsId = useId()
  const [draft, setDraft] = useState<{ section: SiteSection; dirty: boolean; value: unknown } | null>(null)
  const [preview, setPreview] = useState(initialPreview)
  const tab = sections.find((item) => item.value === params.get('seccion'))?.value ?? 'home'
  const current = sections.find((item) => item.value === tab)!
  const dirty = draft?.section === tab && draft.dirty
  const onDraftChange = useCallback<DraftListener>((section, dirty, value) => setDraft({ section, dirty, value }), [])

  function togglePreview(open: boolean) {
    setPreview(open)
    try { localStorage.setItem(previewPreference, open ? 'abierta' : 'cerrada') } catch { /* sin almacenamiento local */ }
  }

  function change(value: SiteSection) {
    if (value === tab) return
    if (dirty && !window.confirm('Tienes cambios sin guardar en esta sección. ¿Salir sin guardarlos?')) return
    setDraft(null)
    setParams({ seccion: value })
  }

  return <div className={preview ? 'site-editor-page has-preview' : 'site-editor-page'}>
    <PageHeader title="Sitio web" description="Todo lo que ven las familias en el sitio público. Los cambios se publican al pulsar «Guardar cambios»."
      actions={<>
        <Button icon="image" aria-pressed={preview} onClick={() => togglePreview(!preview)}>{preview ? 'Ocultar vista previa' : 'Vista previa'}</Button>
        <a className="btn btn-secondary" href={current.pages[0].path} target="_blank" rel="noreferrer"><Icon name="external" size={18} />Ver página publicada</a>
      </>} />
    {error && <Alert tone="warning" title="No se pudo leer el contenido guardado">El sitio muestra el contenido original. Revisa la conexión; si el problema continúa, verifica que las reglas de Firestore estén publicadas.</Alert>}
    <div className={preview ? 'site-editor-layout' : 'org-layout'}>
      <Tabs idBase={tabsId} label="Secciones del sitio" orientation={preview ? 'horizontal' : 'vertical'} value={tab} onChange={change}
        tabs={sections.map((item) => ({ value: item.value, label: item.label, description: preview ? undefined : item.description }))} />
      <TabPanel idBase={tabsId} value={tab}>
        <div className="site-editor" key={tab}>
          {tab === 'home' ? <HomeEditor onDraftChange={onDraftChange} />
            : tab === 'calendar' ? <CalendarEditor onDraftChange={onDraftChange} />
            : tab === 'documents' ? <DocumentsEditor onDraftChange={onDraftChange} />
            : tab === 'students' ? <StudentsEditor onDraftChange={onDraftChange} />
            : tab === 'general' ? <GeneralEditor onDraftChange={onDraftChange} />
            : tab === 'gallery' ? <GalleryEditor onDraftChange={onDraftChange} />
            : <ImagesEditor onDraftChange={onDraftChange} />}
        </div>
      </TabPanel>
      {preview && <SitePreview key={tab} section={tab} pages={current.pages} dirty={dirty}
        value={draft?.section === tab ? draft.value : undefined} onClose={() => togglePreview(false)} />}
    </div>
  </div>
}

/* --- Inicio ------------------------------------------------------------- */

const pageLinks = [
  { value: '/calendario', label: 'Calendario' },
  { value: '/documentos', label: 'Documentos' },
  { value: '/conocenos', label: 'Conócenos' },
  { value: '/estudiantes', label: 'Estudiantes' },
  { value: '/contactanos', label: 'Contáctanos' },
]

function HomeEditor({ onDraftChange }: EditorProps) {
  const draft = useSectionDraft('home', onDraftChange)
  const { slides } = draft.draft
  const setSlides = (value: typeof slides) => draft.update({ slides: value })
  return <>
    <EditorCard title="Carrusel de la portada" description="Cada diapositiva puede anunciar un evento, un aviso o invitar a visitar una sección."
      action={<Button icon="plus" onClick={() => setSlides([...slides, { tag: 'Evento', title: '', subtitle: '', text: '', image: '', actionLabel: 'Detalles', actionHref: '/calendario' }])}>Agregar diapositiva</Button>}>
      {!slides.length && <EmptyState compact icon="image" title="Sin diapositivas">La portada mostrará solo los accesos rápidos.</EmptyState>}
      <datalist id="page-links">{pageLinks.map((link) => <option key={link.value} value={link.value}>{link.label}</option>)}</datalist>
      <div className="site-items">{slides.map((slide, index) => <ItemCard key={index} index={index} count={slides.length} title={slide.title || 'Diapositiva sin título'}
        onMove={(to) => setSlides(list.move(slides, index, to))} onRemove={() => setSlides(list.remove(slides, index))}>
        <TextInput label="Etiqueta" value={slide.tag} maxLength={40} placeholder="Evento, Aviso, Bienvenidos…" onChange={(tag) => setSlides(list.set(slides, index, { tag }))} />
        <TextInput label="Título" required value={slide.title} maxLength={80} onChange={(title) => setSlides(list.set(slides, index, { title }))} />
        <TextInput label="Subtítulo" value={slide.subtitle} maxLength={80} placeholder="Opcional, por ejemplo las fechas" onChange={(subtitle) => setSlides(list.set(slides, index, { subtitle }))} />
        <TextInput label="Texto" multiline value={slide.text} maxLength={400} onChange={(text) => setSlides(list.set(slides, index, { text }))} />
        <FileInput label="Foto de fondo" folder="imagenes" value={slide.image} onChange={(image) => setSlides(list.set(slides, index, { image }))} hint="Usa una foto horizontal, de preferencia de 1920 × 1080 px o más." />
        <TextInput label="Texto del botón" value={slide.actionLabel} maxLength={30} placeholder="Déjalo vacío para no mostrar botón" onChange={(actionLabel) => setSlides(list.set(slides, index, { actionLabel }))} />
        <TextInput label="El botón lleva a" value={slide.actionHref} maxLength={300} list="page-links" hint="Una página del sitio (/calendario) o una dirección completa (https://…)." onChange={(actionHref) => setSlides(list.set(slides, index, { actionHref }))} />
      </ItemCard>)}</div>
    </EditorCard>
    <EditorCard title="Texto de la galería">
      <div className="form-grid">
        <TextInput label="Texto bajo el título «Galería»" multiline value={draft.draft.galleryIntro} maxLength={300} onChange={(galleryIntro) => draft.update({ galleryIntro })} />
      </div>
    </EditorCard>
    <SaveBar draft={draft} onSave={() => void draft.save((value) => value.slides.some((slide) => !slide.title.trim()) ? 'Cada diapositiva necesita un título.' : '')} />
  </>
}

/* --- Calendario --------------------------------------------------------- */

const kindOptions = (Object.keys(eventKinds) as EventKind[]).map((kind) => ({ value: kind, label: eventKinds[kind].label }))

function CalendarEditor({ onDraftChange }: EditorProps) {
  const draft = useSectionDraft('calendar', onDraftChange)
  const { events } = draft.draft
  const [editing, setEditing] = useState<{ index: number; event: SchoolEvent } | null>(null)
  const sorted = events.map((event, index) => ({ event, index })).sort((a, b) => a.event.date.localeCompare(b.event.date))

  function saveEvent(event: SchoolEvent) {
    const next = editing && editing.index >= 0 ? list.set(events, editing.index, event) : [...events, event]
    draft.update({ events: next.map((item) => item.end ? item : { date: item.date, kind: item.kind, title: item.title, detail: item.detail }).sort((a, b) => a.date.localeCompare(b.date)) })
    setEditing(null)
  }

  return <>
    <EditorCard title="Fechas del ciclo escolar" description="Aparecen en el calendario de la portada y en la página Calendario."
      action={<Button icon="plus" onClick={() => setEditing({ index: -1, event: { date: '', kind: 'festejo', title: '', detail: '' } })}>Agregar fecha</Button>}>
      {!events.length ? <EmptyState compact icon="calendar" title="Sin fechas">Agrega el inicio del ciclo, los días sin clases y los festejos.</EmptyState>
        : <div className="table-wrap"><table className="data-table">
          <caption className="sr-only">Fechas del calendario escolar</caption>
          <thead><tr><th scope="col">Fecha</th><th scope="col">Tipo</th><th scope="col">Título</th><th scope="col" className="cell-actions">Acciones</th></tr></thead>
          <tbody>{sorted.map(({ event, index }) => <tr key={index}>
            <td className="nowrap">{eventDateLabel(event)}</td>
            <td><span className={`kind-dot tone-${eventKinds[event.kind].tone}`} aria-hidden="true" />{eventKinds[event.kind].label}</td>
            <td><strong>{event.title}</strong></td>
            <td className="cell-actions"><div className="row-actions">
              <IconButton icon="pencil" label={`Editar ${event.title}`} onClick={() => setEditing({ index, event })} />
              <IconButton icon="trash" label={`Quitar ${event.title}`} onClick={() => { if (window.confirm(`¿Quitar «${event.title}» del calendario?`)) draft.update({ events: list.remove(events, index) }) }} />
            </div></td>
          </tr>)}</tbody>
        </table></div>}
    </EditorCard>
    <EditorCard title="Opciones del calendario">
      <div className="form-grid">
        <CheckboxField full label="Mostrar el aviso «Fechas de ejemplo» (desactívalo al publicar las fechas oficiales)" checked={draft.draft.examples} onChange={(examples) => draft.update({ examples })} />
        <FileInput label="Calendario oficial en PDF (opcional)" folder="documentos" value={draft.draft.pdf} onChange={(pdf) => draft.update({ pdf })} hint="Si lo agregas, aparece el botón «Calendario oficial (PDF)» junto a las próximas fechas." />
      </div>
    </EditorCard>
    <SaveBar draft={draft} onSave={() => void draft.save()} />
    {editing && <EventModal initial={editing.event} isNew={editing.index < 0} onCancel={() => setEditing(null)} onSave={saveEvent} />}
  </>
}

function EventModal({ initial, isNew, onCancel, onSave }: { initial: SchoolEvent; isNew: boolean; onCancel: () => void; onSave: (event: SchoolEvent) => void }) {
  const [event, setEvent] = useState<SchoolEvent>({ ...initial, end: initial.end ?? '' })
  const [error, setError] = useState('')
  function submit() {
    if (!event.date) return setError('Indica la fecha.')
    if (!event.title.trim()) return setError('Escribe el título del evento.')
    if (event.end && event.end < event.date) return setError('La fecha final no puede ser anterior a la de inicio.')
    onSave({ ...event, title: event.title.trim(), detail: event.detail.trim(), end: event.end && event.end !== event.date ? event.end : undefined })
  }
  return <Modal title={isNew ? 'Agregar fecha' : 'Editar fecha'} onClose={onCancel} focusField>
    <form className="form" onSubmit={(submitEvent) => { submitEvent.preventDefault(); submit() }}>
      {error && <Alert tone="error" role="alert">{error}</Alert>}
      <div className="form-grid">
        <TextInput label="Fecha" type="date" required value={event.date} onChange={(date) => setEvent({ ...event, date })} />
        <TextInput label="Hasta (opcional)" type="date" value={event.end ?? ''} hint="Solo para periodos de varios días, como vacaciones." onChange={(end) => setEvent({ ...event, end })} />
        <SelectInput label="Tipo" full value={event.kind} options={kindOptions} onChange={(kind) => setEvent({ ...event, kind: kind as EventKind })} />
        <TextInput label="Título" required full value={event.title} maxLength={100} onChange={(title) => setEvent({ ...event, title })} />
        <TextInput label="Descripción" multiline value={event.detail} maxLength={500} onChange={(detail) => setEvent({ ...event, detail })} />
      </div>
      <div className="form-actions">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" type="submit" icon="check">{isNew ? 'Agregar' : 'Aplicar cambios'}</Button>
      </div>
    </form>
  </Modal>
}

/* --- Documentos --------------------------------------------------------- */

const todayIso = () => new Date().toLocaleDateString('en-CA')

function DocumentsEditor({ onDraftChange }: EditorProps) {
  const draft = useSectionDraft('documents', onDraftChange)
  const { categories, files } = draft.draft
  const [editing, setEditing] = useState<SchoolDocument | null>(null)
  const categoryOptions = categories.map((category) => ({ value: category.name, label: category.name }))

  function renameCategory(index: number, name: string) {
    const previous = categories[index].name
    draft.update({
      categories: list.set(categories, index, { name }),
      files: files.map((file) => file.category === previous ? { ...file, category: name } : file),
    })
  }
  function removeCategory(index: number) {
    const count = files.filter((file) => file.category === categories[index].name).length
    if (count && !window.confirm(`La categoría «${categories[index].name}» tiene ${count} documento(s); se mostrarán en «Otros documentos». ¿Quitarla?`)) return
    draft.update({ categories: list.remove(categories, index) })
  }
  function saveFile(file: SchoolDocument) {
    draft.update({ files: files.some((item) => item.id === file.id) ? files.map((item) => item.id === file.id ? file : item) : [...files, file] })
    setEditing(null)
  }

  return <>
    <EditorCard title="Documentos publicados" description="Archivos que las familias pueden abrir o descargar."
      action={<Button icon="plus" onClick={() => setEditing({ id: crypto.randomUUID(), title: '', category: categories[0]?.name ?? '', href: '', updated: todayIso() })}>Agregar documento</Button>}>
      {!files.length ? <EmptyState compact icon="file" title="Sin documentos">Las categorías se mostrarán como «Próximamente».</EmptyState>
        : <div className="table-wrap"><table className="data-table">
          <caption className="sr-only">Documentos publicados</caption>
          <thead><tr><th scope="col">Documento</th><th scope="col">Categoría</th><th scope="col">Fecha</th><th scope="col" className="cell-actions">Acciones</th></tr></thead>
          <tbody>{files.map((file, index) => <tr key={file.id}>
            <td><a href={file.href} target="_blank" rel="noreferrer"><strong>{file.title}</strong></a></td>
            <td>{categories.some((category) => category.name === file.category) ? file.category : <span className="muted">Otros documentos</span>}</td>
            <td className="nowrap">{displayDay(file.updated)}</td>
            <td className="cell-actions"><div className="row-actions">
              <IconButton icon="chevronUp" label="Subir" disabled={index === 0} onClick={() => draft.update({ files: list.move(files, index, index - 1) })} />
              <IconButton icon="chevronDown" label="Bajar" disabled={index === files.length - 1} onClick={() => draft.update({ files: list.move(files, index, index + 1) })} />
              <IconButton icon="pencil" label={`Editar ${file.title}`} onClick={() => setEditing(file)} />
              <IconButton icon="trash" label={`Quitar ${file.title}`} onClick={() => { if (window.confirm(`¿Quitar «${file.title}» del sitio?`)) draft.update({ files: list.remove(files, index) }) }} />
            </div></td>
          </tr>)}</tbody>
        </table></div>}
    </EditorCard>
    <EditorCard title="Categorías" description="Grupos en los que se ordenan los documentos en la página."
      action={<Button icon="plus" onClick={() => draft.update({ categories: [...categories, { name: '', icon: 'file', description: '' }] })}>Agregar categoría</Button>}>
      <div className="site-items">{categories.map((category, index) => <ItemCard key={index} index={index} count={categories.length} title={category.name || 'Categoría sin nombre'}
        onMove={(to) => draft.update({ categories: list.move(categories, index, to) })} onRemove={() => removeCategory(index)}>
        <TextInput label="Nombre" required value={category.name} maxLength={50} onChange={(name) => renameCategory(index, name)} />
        <SelectInput label="Ícono" value={category.icon} options={documentIcons} onChange={(icon) => draft.update({ categories: list.set(categories, index, { icon }) })} />
        <TextInput label="Descripción" full value={category.description} maxLength={200} onChange={(description) => draft.update({ categories: list.set(categories, index, { description }) })} />
      </ItemCard>)}</div>
    </EditorCard>
    <SaveBar draft={draft} onSave={() => void draft.save((value) => {
      const names = value.categories.map((category) => category.name.trim())
      if (names.some((name) => !name)) return 'Cada categoría necesita un nombre.'
      if (new Set(names).size !== names.length) return 'Hay dos categorías con el mismo nombre.'
      return ''
    })} />
    {editing && <DocumentModal initial={editing} isNew={!files.some((file) => file.id === editing.id)} categories={categoryOptions} onCancel={() => setEditing(null)} onSave={saveFile} />}
  </>
}

function DocumentModal({ initial, isNew, categories, onCancel, onSave }: { initial: SchoolDocument; isNew: boolean; categories: { value: string; label: string }[]; onCancel: () => void; onSave: (file: SchoolDocument) => void }) {
  const [file, setFile] = useState(initial)
  const [error, setError] = useState('')
  function submit() {
    if (!file.title.trim()) return setError('Escribe el nombre del documento.')
    if (!file.href.trim()) return setError('Sube el archivo o escribe su dirección.')
    onSave({ ...file, title: file.title.trim(), href: file.href.trim() })
  }
  return <Modal title={isNew ? 'Agregar documento' : 'Editar documento'} onClose={onCancel} wide focusField>
    <form className="form" onSubmit={(event) => { event.preventDefault(); submit() }}>
      {error && <Alert tone="error" role="alert">{error}</Alert>}
      <div className="form-grid">
        <TextInput label="Nombre del documento" required full value={file.title} maxLength={150} placeholder="Ej. Circular de inicio de ciclo" onChange={(title) => setFile({ ...file, title })} />
        <SelectInput label="Categoría" value={file.category} options={categories} onChange={(category) => setFile({ ...file, category })} />
        <TextInput label="Fecha de publicación" type="date" value={file.updated} onChange={(updated) => setFile({ ...file, updated })} />
        <FileInput label="Archivo" required folder="documentos" value={file.href} onChange={(href) => setFile((current) => ({ ...current, href }))}
          onUploaded={(upload) => setFile((current) => current.title.trim() ? current : { ...current, title: upload.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') })} />
      </div>
      <div className="form-actions">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" type="submit" icon="check">{isNew ? 'Agregar' : 'Aplicar cambios'}</Button>
      </div>
    </form>
  </Modal>
}

/* --- Estudiantes -------------------------------------------------------- */

const roleSuggestions = ['Titular de grupo', 'Educación Física', 'Inglés', 'Artes', 'USAER', 'Apoyo']
const gradeName = (grade: number) => `${grade}.${grade === 1 || grade === 3 ? 'er' : '°'} grado`

function StudentsEditor({ onDraftChange }: EditorProps) {
  const draft = useSectionDraft('students', onDraftChange)
  const { grades, roles } = draft.draft
  // Siempre seis grados, en orden, aunque un documento antiguo tenga menos.
  const allGrades = [1, 2, 3, 4, 5, 6].map((grade) => grades.find((item) => item.grade === grade) ?? { grade, teachers: [] })
  const setTeachers = (grade: number, teachers: typeof allGrades[number]['teachers']) =>
    draft.update({ grades: allGrades.map((item) => item.grade === grade ? { grade, teachers } : item) })

  return <>
    <EditorCard title="Docentes por grado" description="Al tocar un grado en la página Estudiantes se muestran sus docentes, en el orden de esta lista.">
      <datalist id="role-suggestions">{roleSuggestions.map((role) => <option key={role} value={role} />)}</datalist>
      <div className="grade-editor">{allGrades.map(({ grade, teachers }) => <FormSection key={grade} title={gradeName(grade)}>
        {teachers.map((teacher, index) => <div className="grade-teacher-row field-full" key={index}>
          <TextInput label="Nombre" required value={teacher.name} maxLength={120} placeholder="Profra. Nombre Apellido" onChange={(name) => setTeachers(grade, list.set(teachers, index, { name }))} />
          <TextInput label="Asignatura o función" value={teacher.role} maxLength={60} list="role-suggestions" onChange={(role) => setTeachers(grade, list.set(teachers, index, { role }))} />
          <TextInput label="Grupo" value={teacher.group} maxLength={20} placeholder="A, B, A y B…" onChange={(group) => setTeachers(grade, list.set(teachers, index, { group }))} />
          <div className="row-actions">
            <IconButton icon="chevronUp" label="Subir" disabled={index === 0} onClick={() => setTeachers(grade, list.move(teachers, index, index - 1))} />
            <IconButton icon="trash" label={`Quitar a ${teacher.name || 'este docente'}`} onClick={() => setTeachers(grade, list.remove(teachers, index))} />
          </div>
        </div>)}
        <div className="field-full"><Button size="sm" icon="plus" onClick={() => setTeachers(grade, [...teachers, { name: '', role: '', group: '' }])}>Agregar docente a {gradeName(grade)}</Button></div>
      </FormSection>)}</div>
    </EditorCard>
    <EditorCard title="Textos de la página">
      <div className="form-grid">
        <TextInput label="Introducción de los grados" multiline value={draft.draft.intro} maxLength={400} onChange={(intro) => draft.update({ intro })} />
        <TextInput label="Introducción de «Sus docentes»" multiline value={draft.draft.rolesIntro} maxLength={300} onChange={(rolesIntro) => draft.update({ rolesIntro })} />
        <TextInput label="Evaluación" multiline value={draft.draft.evaluation} maxLength={600} hint="La escala que se muestra junto a este texto es de 5 a 10." onChange={(evaluation) => draft.update({ evaluation })} />
      </div>
    </EditorCard>
    <EditorCard title="Tarjetas «Sus docentes»" description="Describen las funciones docentes de cada grupo."
      action={<Button icon="plus" onClick={() => draft.update({ roles: [...roles, { title: '', text: '', photo: '', color: 'blue' }] })}>Agregar tarjeta</Button>}>
      <div className="site-items">{roles.map((role, index) => <ItemCard key={index} index={index} count={roles.length} title={role.title || 'Tarjeta sin título'}
        onMove={(to) => draft.update({ roles: list.move(roles, index, to) })} onRemove={() => draft.update({ roles: list.remove(roles, index) })}>
        <TextInput label="Título" required value={role.title} maxLength={60} onChange={(title) => draft.update({ roles: list.set(roles, index, { title }) })} />
        <SelectInput label="Color" value={role.color} options={roleColors} onChange={(color) => draft.update({ roles: list.set(roles, index, { color }) })} />
        <TextInput label="Descripción" multiline value={role.text} maxLength={300} onChange={(text) => draft.update({ roles: list.set(roles, index, { text }) })} />
        <FileInput label="Foto" folder="imagenes" value={role.photo} onChange={(photo) => draft.update({ roles: list.set(roles, index, { photo }) })} />
      </ItemCard>)}</div>
    </EditorCard>
    <SaveBar draft={draft} onSave={() => void draft.save((value) => {
      if (value.grades.some((grade) => grade.teachers.some((teacher) => !teacher.name.trim()))) return 'Escribe el nombre de cada docente o quita la fila vacía.'
      if (value.roles.some((role) => !role.title.trim())) return 'Cada tarjeta necesita un título.'
      return ''
    })} />
  </>
}

/* --- Datos de la escuela ------------------------------------------------ */

function GeneralEditor({ onDraftChange }: EditorProps) {
  const draft = useSectionDraft('general', onDraftChange)
  const value = draft.draft
  const shifts = value.shifts
  return <>
    <EditorCard title="Datos de la escuela">
      <div className="form-sections">
        <FormSection title="Nombre">
          <TextInput label="Nombre corto" required value={value.name} maxLength={80} hint="Aparece junto al escudo." onChange={(name) => draft.update({ name })} />
          <TextInput label="Nombre completo" required value={value.fullName} maxLength={120} onChange={(fullName) => draft.update({ fullName })} />
          <TextInput label="Lema" full value={value.tagline} maxLength={160} onChange={(tagline) => draft.update({ tagline })} />
        </FormSection>
        <FormSection title="Contacto">
          <TextInput label="Dirección" full required value={value.address} maxLength={200} onChange={(address) => draft.update({ address })} />
          <TextInput label="Teléfono" required value={value.phone} maxLength={40} onChange={(phone) => draft.update({ phone })} />
          <TextInput label="Correo electrónico" type="email" value={value.email} maxLength={120} onChange={(email) => draft.update({ email })} />
          <TextInput label="Búsqueda para el mapa" full value={value.mapQuery} maxLength={200} hint="Texto con el que Google Maps encuentra la escuela. Si está vacío se usa la dirección." onChange={(mapQuery) => draft.update({ mapQuery })} />
          <TextInput label="Facebook" type="url" value={value.facebook} maxLength={300} placeholder="https://facebook.com/…" onChange={(facebook) => draft.update({ facebook })} />
          <TextInput label="Instagram" type="url" value={value.instagram} maxLength={300} placeholder="https://instagram.com/…" onChange={(instagram) => draft.update({ instagram })} />
        </FormSection>
        <FormSection title="Horarios" description="Turnos que se muestran en Contáctanos y en la portada.">
          {shifts.map((shift, index) => <div className="grade-teacher-row field-full" key={index}>
            <TextInput label="Turno" value={shift.name} maxLength={40} onChange={(name) => draft.update({ shifts: list.set(shifts, index, { name }) })} />
            <TextInput label="Días" value={shift.days} maxLength={60} onChange={(days) => draft.update({ shifts: list.set(shifts, index, { days }) })} />
            <TextInput label="Horario" value={shift.hours} maxLength={60} onChange={(hours) => draft.update({ shifts: list.set(shifts, index, { hours }) })} />
            <div className="row-actions"><IconButton icon="trash" label={`Quitar turno ${shift.name}`} onClick={() => draft.update({ shifts: list.remove(shifts, index) })} /></div>
          </div>)}
          <div className="field-full"><Button size="sm" icon="plus" onClick={() => draft.update({ shifts: [...shifts, { name: '', days: 'Lunes a viernes', hours: '' }] })}>Agregar turno</Button></div>
        </FormSection>
        <FormSection title="Misión, visión e historia" description="Si un texto queda vacío, la página muestra «Información por confirmar».">
          <TextInput label="Misión" multiline value={value.mission} maxLength={1500} onChange={(mission) => draft.update({ mission })} />
          <TextInput label="Visión" multiline value={value.vision} maxLength={1500} onChange={(vision) => draft.update({ vision })} />
          <TextInput label="Historia" multiline value={value.history} maxLength={4000} onChange={(history) => draft.update({ history })} />
        </FormSection>
      </div>
    </EditorCard>
    <SaveBar draft={draft} onSave={() => void draft.save((current) => !current.name.trim() || !current.fullName.trim() ? 'El nombre de la escuela es obligatorio.' : '')} />
  </>
}

/* --- Galería ------------------------------------------------------------ */

function GalleryEditor({ onDraftChange }: EditorProps) {
  const draft = useSectionDraft('gallery', onDraftChange)
  const { photos } = draft.draft
  return <>
    <EditorCard title="Galería" description="Fotos que se muestran en la portada y en Conócenos."
      action={<Button icon="plus" onClick={() => draft.update({ photos: [...photos, { src: '', alt: '' }] })}>Agregar foto</Button>}>
      {!photos.length && <EmptyState compact icon="image" title="Sin fotos">La galería mostrará un aviso de que pronto habrá fotos.</EmptyState>}
      <div className="site-items">{photos.map((photo, index) => <ItemCard key={index} index={index} count={photos.length} title={photo.alt || 'Foto sin descripción'}
        onMove={(to) => draft.update({ photos: list.move(photos, index, to) })} onRemove={() => draft.update({ photos: list.remove(photos, index) })}>
        <FileInput label="Foto" required folder="imagenes" value={photo.src} onChange={(src) => draft.update({ photos: list.set(photos, index, { src }) })} />
        <TextInput label="Descripción" full required value={photo.alt} maxLength={120} hint="Se muestra al ampliar la foto y la leen los lectores de pantalla." onChange={(alt) => draft.update({ photos: list.set(photos, index, { alt }) })} />
      </ItemCard>)}</div>
    </EditorCard>
    <SaveBar draft={draft} onSave={() => void draft.save((value) => value.photos.some((photo) => !photo.src.trim() || !photo.alt.trim()) ? 'Cada foto necesita archivo y descripción.' : '')} />
  </>
}

/* --- Fotos de las páginas ----------------------------------------------- */

const imageFields = [
  { key: 'mission', label: 'Foto de Misión (Conócenos y portada)' },
  { key: 'history', label: 'Foto de Historia (Conócenos y portada)' },
  { key: 'about', label: 'Encabezado de Conócenos' },
  { key: 'students', label: 'Encabezado de Estudiantes' },
  { key: 'calendar', label: 'Encabezado de Calendario' },
  { key: 'documents', label: 'Encabezado de Documentos' },
  { key: 'contact', label: 'Encabezado de Contáctanos' },
] as const

function ImagesEditor({ onDraftChange }: EditorProps) {
  const draft = useSectionDraft('images', onDraftChange)
  return <>
    <EditorCard title="Fotos de las páginas" description="Los encabezados se ven mejor con fotos horizontales y amplias.">
      <div className="form-grid">{imageFields.map((field) => <FileInput key={field.key} label={field.label} folder="imagenes" value={draft.draft[field.key]} onChange={(value) => draft.update({ [field.key]: value })} />)}</div>
    </EditorCard>
    <SaveBar draft={draft} onSave={() => void draft.save()} />
  </>
}
