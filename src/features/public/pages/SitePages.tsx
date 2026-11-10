import { useState, type CSSProperties } from 'react'
import { Icon } from '@/shared/components/Icon'
import { PageHeader } from '../PublicLayout'
import { Photo } from '../components/Photo'
import { SchoolCalendar } from '../components/SchoolCalendar'
import { FindUs, Gallery, Pending, SectionTitle, ValuesStrip } from '../components/Sections'
import { displayDay } from '../school'
import { useSite } from '../SiteContent'

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties
/** 1.er, 2.°, 3.er… como se escribe el grado escolar. */
const gradeLabel = (grade: number) => `${grade}.${grade === 1 || grade === 3 ? 'er' : '°'} grado`

export function AboutPage() {
  const { general: school, images } = useSite().content
  return <>
    <PageHeader title="Conócenos" image={images.about}>{school.fullName}: {school.tagline.charAt(0).toLowerCase() + school.tagline.slice(1)}</PageHeader>
    <section className="section">
      <div className="about-rows">
        <article id="mision" className="about-row" data-reveal>
          <span className="photo-frame about-row-photo"><Photo src={images.mission} alt="Alumnos en clase" /></span>
          <div><h2 className="tone-text-orange">Misión</h2>{school.mission ? <p>{school.mission}</p> : <Pending />}</div>
        </article>
        <article id="vision" className="vision-card" data-reveal>
          <h2>Visión</h2>{school.vision ? <p>{school.vision}</p> : <Pending />}
        </article>
        <article id="historia" className="about-row is-reverse" data-reveal>
          <span className="photo-frame about-row-photo"><Photo src={images.history} alt="Alumnos en el salón" /></span>
          <div><h2 className="tone-text-red">Historia</h2>{school.history ? <p>{school.history}</p> : <Pending />}</div>
        </article>
      </div>
    </section>
    <section className="section section-flush" aria-label="Nuestros valores"><ValuesStrip /></section>
    <section className="section">
      <SectionTitle title="Galería">Nuestras instalaciones y actividades escolares.</SectionTitle>
      <Gallery />
    </section>
  </>
}

/** Botones de 1.° a 6.°; cada uno despliega a los docentes que imparten ese grado. */
function GradeSelector() {
  const { grades } = useSite().content.students
  const [selected, setSelected] = useState<number | null>(null)
  const current = grades.find((item) => item.grade === selected)
  return <>
    <ul className="grade-band" data-reveal>
      {[1, 2, 3, 4, 5, 6].map((grade) => <li key={grade}>
        <button type="button" aria-expanded={selected === grade} aria-controls="grade-teachers"
          onClick={() => setSelected((value) => value === grade ? null : grade)}>
          <strong>{grade}.°</strong><span>grado</span>
          <Icon name={selected === grade ? 'chevronUp' : 'chevronDown'} size={18} />
        </button>
      </li>)}
    </ul>
    <div id="grade-teachers" className="grade-teachers" aria-live="polite">
      {selected !== null && <div className="grade-teachers-panel" key={selected}>
        <h3>Docentes de {gradeLabel(selected)}</h3>
        {current?.teachers.length
          ? <ul>{current.teachers.map((teacher, position) => <li key={position}>
              <span className="grade-teacher-icon"><Icon name="teacher" size={22} /></span>
              <span><strong>{teacher.name}</strong>{(teacher.role || teacher.group) && <small>{[teacher.role, teacher.group && `Grupo ${teacher.group}`].filter(Boolean).join(' · ')}</small>}</span>
            </li>)}</ul>
          : <Pending>Los docentes de este grado se publicarán pronto.</Pending>}
      </div>}
    </div>
  </>
}

export function StudentsInfoPage() {
  const { students, images } = useSite().content
  return <>
    <PageHeader title="Estudiantes" image={images.students}>Grados, docentes y evaluación.</PageHeader>
    <section className="section">
      <SectionTitle title="De primero a sexto">{students.intro}</SectionTitle>
      <GradeSelector />
    </section>
    {students.roles.length > 0 && <section className="section section-tinted">
      <SectionTitle title="Sus docentes">{students.rolesIntro}</SectionTitle>
      <ul className="teacher-cards">{students.roles.map((role, position) => <li key={position} className={`teacher-card tone-${role.color}`} data-reveal style={delay(position * 90)}>
        <span className="photo-frame"><Photo src={role.photo} alt="" /></span>
        <div><h3>{role.title}</h3><p>{role.text}</p></div>
      </li>)}</ul>
    </section>}
    <section className="section">
      <div className="evaluation" data-reveal>
        <div>
          <h2>Evaluación</h2>
          <p>{students.evaluation}</p>
        </div>
        <ol className="scale" aria-label="Escala de calificación de 5 a 10">{[5, 6, 7, 8, 9, 10].map((value) => <li key={value}>{value}</li>)}</ol>
      </div>
    </section>
  </>
}

export function CalendarPage() {
  const { images } = useSite().content
  return <>
    <PageHeader title="Calendario" image={images.calendar}>Fechas del ciclo escolar, días sin clases y festejos.</PageHeader>
    <section className="section"><SchoolCalendar full /></section>
  </>
}

export function DocumentsPage() {
  const { documents, images } = useSite().content
  const known = new Set(documents.categories.map((category) => category.name))
  const loose = documents.files.filter((file) => !known.has(file.category))
  const categories = loose.length ? [...documents.categories, { name: 'Otros documentos', icon: 'file', description: 'Documentos generales de la escuela.' }] : documents.categories
  return <>
    <PageHeader title="Documentos" image={images.documents}>Requisitos, circulares, protocolos y formatos para descargar.</PageHeader>
    <section className="section">
      <div className="doc-list" data-reveal>
        {categories.map((category) => {
          const files = known.has(category.name) ? documents.files.filter((doc) => doc.category === category.name) : loose
          return <section key={category.name} className="doc-row">
            <Icon name={category.icon} size={28} />
            <div className="doc-row-text">
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              {files.length > 0 && <ul className="doc-files">{files.map((file) => <li key={file.id}>
                <a href={file.href} target="_blank" rel="noreferrer"><Icon name="download" size={18} /><span>{file.title}</span>{file.updated && <small>{displayDay(file.updated)}</small>}</a>
              </li>)}</ul>}
            </div>
            {!files.length && <span className="doc-empty">Próximamente</span>}
          </section>
        })}
      </div>
      <p className="note" data-reveal>Este sitio no emite constancias ni boletas oficiales; para solicitarlas, comunícate con la dirección.</p>
    </section>
  </>
}

export function ContactPage() {
  const { images } = useSite().content
  return <>
    <PageHeader title="Contáctanos" image={images.contact}>Visítanos o llámanos en horario escolar.</PageHeader>
    <section className="section">
      <SectionTitle title="Encuéntranos" />
      <FindUs />
    </section>
  </>
}
