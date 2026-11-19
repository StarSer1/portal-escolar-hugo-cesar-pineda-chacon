import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { groupName, today } from '@/features/academic/components/AcademicUI'
import { Alert, EmptyState } from '@/shared/ui/Feedback'
import { Field } from '@/shared/ui/Field'
import { buildCommitmentLetter, commitmentLetterHtml } from '../commitmentLetter'
import { groupStudents, sortGroups, WATERMARK } from '../reports'
import { DEFAULT_DIRECTOR, DIRECTOR_KEY, useRemembered } from '../preferences'
import { PrintPreview, YearAndGroup } from './DocumentPreview'

/** Carta compromiso de un alumno: se elige el alumno y se llenan sus tutores. */
export function CommitmentLetterTab({ yearId, setYearId }: { yearId: string; setYearId: (id: string) => void }) {
  const { data } = useAcademic()
  const [groupId, setGroupId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [director, setDirector] = useRemembered(DIRECTOR_KEY, DEFAULT_DIRECTOR)
  const [date, setDate] = useState(today())
  const groups = sortGroups(data.groups.filter((item) => item.schoolYearId === yearId))
  const group = groups.find((item) => item.id === groupId)
  const students = group ? groupStudents(data, group) : []
  const student = students.find((item) => item.id === studentId)
  const letter = useMemo(() => student ? buildCommitmentLetter(data, student, yearId) : null, [data, student, yearId])
  const html = useMemo(() => letter ? commitmentLetterHtml(letter, { date, director }) : '', [letter, date, director])
  const missingPhones = letter?.guardians.filter((guardian) => !guardian.phone) ?? []

  return <>
    <section className="card">
      <div className="card-heading"><div><h2>Carta compromiso</h2><p>Elige al alumno: la carta se llena con su grado y grupo, sus hermanos inscritos y los tutores vinculados a su expediente.</p></div></div>
      <div className="form-grid">
        <YearAndGroup years={data.schoolYears} yearId={yearId} onYear={(id) => { setYearId(id); setGroupId(''); setStudentId('') }} groups={groups} groupId={groupId} onGroup={(id) => { setGroupId(id); setStudentId('') }} />
        <Field label="Alumno">
          <select value={studentId} disabled={!group} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">{group ? 'Selecciona un alumno' : 'Primero elige el grupo'}</option>
            {students.map((item) => <option key={item.id} value={item.id}>{item.surnames} {item.names}</option>)}
          </select>
        </Field>
        <Field label="Fecha de la carta">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Director del plantel (firma)" hint="Se recuerda en esta computadora y se usa también en las boletas." full>
          <input value={director} maxLength={120} onChange={(event) => setDirector(event.target.value)} />
        </Field>
      </div>
    </section>
    {letter && <section className="card" aria-labelledby="letter-guardians">
      <div className="card-heading"><div><h2 id="letter-guardians">Datos que se llenarán</h2><p>Para corregirlos, edita el expediente del alumno o del tutor.</p></div></div>
      {!letter.guardians.length
        ? <Alert tone="warning">Este alumno no tiene tutores vinculados; la carta saldrá con esos datos en blanco. <Link to="/panel/alumnos">Vincula un tutor en Alumnos</Link>.</Alert>
        : <ul className="letter-facts">
          {letter.guardians.map((guardian, index) => <li key={index}><strong>{guardian.name}</strong> · {guardian.relationship || 'Sin parentesco'}{guardian.primary ? ' · contacto principal' : ''} · {guardian.phone || <span className="text-muted">sin teléfono</span>}</li>)}
          {letter.students.slice(1).map((sibling) => <li key={sibling.name}>Hermano(a) inscrito: <strong>{sibling.name}</strong> · {sibling.group}</li>)}
        </ul>}
      {missingPhones.length > 0 && <Alert tone="info">Sin teléfono registrado: {missingPhones.map((guardian) => guardian.name).join(', ')}. Esa línea quedará en blanco para llenarse a mano.</Alert>}
    </section>}
    {WATERMARK && letter && <Alert tone="info">La carta se genera con la marca de agua «{WATERMARK}» mientras el sistema está en etapa de prueba. La firma del director y la del tutor se hacen a mano.</Alert>}
    {!group ? <section className="card"><EmptyState icon="file" title="Elige el grupo del alumno">Selecciona ciclo y grupo; después elige al alumno.</EmptyState></section>
      : !students.length ? <section className="card"><EmptyState icon="students" title="Sin alumnos inscritos">Este grupo no tiene inscripciones activas.</EmptyState></section>
        : !letter ? <section className="card"><EmptyState icon="student" title="Elige un alumno">La carta se genera en cuanto eliges al alumno de {groupName(group)}.</EmptyState></section>
          : <PrintPreview html={html} title={`Carta compromiso de ${letter.students[0].name}`} label="Imprimir o guardar PDF" />}
  </>
}
