import type { CSSProperties } from 'react'
import { Icon } from '@/shared/components/Icon'
import { PageHeader } from '../PublicLayout'
import { Photo } from '../components/Photo'
import { SchoolCalendar } from '../components/SchoolCalendar'
import { FindUs, Gallery, Pending, SectionTitle, ValuesStrip } from '../components/Sections'
import { aboutPhotos, documentCategories, pageImages, school, schoolDocuments } from '../school'

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties

const teachingRoles = [
  { title: 'Titular de grupo', text: 'Acompaña al grupo durante todo el ciclo escolar en las asignaturas generales.', photo: '/img/galeria/6.jpg', color: 'blue' },
  { title: 'Educación Física', text: 'Movimiento, juego y hábitos saludables dentro y fuera del aula.', photo: '/img/docentes/educacion-fisica.jpg', color: 'green' },
  { title: 'Inglés', text: 'El inglés como segunda lengua, con actividades para cada grado.', photo: '/img/galeria/5.jpg', color: 'violet' },
  { title: 'Artes', text: 'Expresión, creatividad y apreciación artística.', photo: '/img/galeria/4.jpg', color: 'orange' },
]

export function AboutPage() {
  return <>
    <PageHeader title="Conócenos" image={pageImages.about}>{school.fullName}: {school.tagline.charAt(0).toLowerCase() + school.tagline.slice(1)}</PageHeader>
    <section className="section">
      <div className="about-rows">
        <article id="mision" className="about-row" data-reveal>
          <span className="photo-frame about-row-photo"><Photo src={aboutPhotos.mission} alt="Alumnos en clase" /></span>
          <div><h2 className="tone-text-orange">Misión</h2>{school.mission ? <p>{school.mission}</p> : <Pending />}</div>
        </article>
        <article id="vision" className="vision-card" data-reveal>
          <h2>Visión</h2><p>{school.vision}</p>
        </article>
        <article id="historia" className="about-row is-reverse" data-reveal>
          <span className="photo-frame about-row-photo"><Photo src={aboutPhotos.history} alt="Alumnos en el salón" /></span>
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

export function StudentsInfoPage() {
  return <>
    <PageHeader title="Estudiantes" image={pageImages.students}>Grados, docentes y evaluación.</PageHeader>
    <section className="section">
      <SectionTitle title="De primero a sexto">La escuela atiende a niñas y niños de 1.° a 6.° grado de primaria, en turno matutino y vespertino.</SectionTitle>
      <ol className="grade-band" data-reveal>{[1, 2, 3, 4, 5, 6].map((grade) => <li key={grade}><strong>{grade}.°</strong><span>grado</span></li>)}</ol>
    </section>
    <section className="section section-tinted">
      <SectionTitle title="Sus docentes">Cada grupo tiene un docente titular y tres docentes de especialidad.</SectionTitle>
      <ul className="teacher-cards">{teachingRoles.map((role, position) => <li key={role.title} className={`teacher-card tone-${role.color}`} data-reveal style={delay(position * 90)}>
        <span className="photo-frame"><Photo src={role.photo} alt="" /></span>
        <div><h3>{role.title}</h3><p>{role.text}</p></div>
      </li>)}</ul>
    </section>
    <section className="section">
      <div className="evaluation" data-reveal>
        <div>
          <h2>Evaluación</h2>
          <p>Cada asignatura se califica en una escala de 0 a 10 al final de cada periodo de evaluación. Si tienes dudas sobre una calificación, acude a la dirección.</p>
        </div>
        <ol className="scale" aria-label="Escala de calificación de 0 a 10">{Array.from({ length: 11 }, (_, value) => <li key={value}>{value}</li>)}</ol>
      </div>
    </section>
  </>
}

export function CalendarPage() {
  return <>
    <PageHeader title="Calendario" image={pageImages.calendar}>Fechas del ciclo escolar, días sin clases y festejos.</PageHeader>
    <section className="section"><SchoolCalendar full /></section>
  </>
}

export function DocumentsPage() {
  return <>
    <PageHeader title="Documentos" image={pageImages.documents}>Requisitos, circulares y formatos para descargar.</PageHeader>
    <section className="section">
      <div className="doc-list" data-reveal>
        {documentCategories.map((category) => {
          const files = schoolDocuments.filter((doc) => doc.category === category.name)
          return <section key={category.name} className="doc-row">
            <Icon name={category.icon} size={28} />
            <div className="doc-row-text">
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              {files.length > 0 && <ul className="doc-files">{files.map((file) => <li key={file.href}>
                <a href={file.href} download><Icon name="download" size={18} /><span>{file.title}</span><small>{file.updated}</small></a>
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
  return <>
    <PageHeader title="Contáctanos" image={pageImages.contact}>Visítanos o llámanos en horario escolar.</PageHeader>
    <section className="section">
      <SectionTitle title="Encuéntranos" />
      <FindUs />
    </section>
  </>
}
