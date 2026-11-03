/**
 * Contenido del sitio público. Edita este archivo para actualizar textos,
 * fotos, eventos y documentos. Las fotos van en `public/img/` con los nombres
 * indicados; mientras falte una, el sitio muestra un recuadro "Foto pendiente".
 * Un texto `null` se muestra como "Información por confirmar".
 */
const img = (path: string) => `/img/${path}`

export const school = {
  name: 'Hugo César Piñeda Chacón',
  fullName: 'Escuela Primaria Hugo César Piñeda Chacón',
  tagline: 'Siempre tendrá los brazos abiertos al conocimiento.',
  address: 'Del Mesón S/N, Camino Real, 23088 La Paz, B.C.S.',
  phone: '+52 612 114 3049',
  email: null as string | null,
  shifts: [
    { name: 'Matutino', days: 'Lunes a viernes', hours: '7:00 a. m. a 1:00 p. m.' },
    { name: 'Vespertino', days: 'Lunes a viernes', hours: '1:00 p. m. a 6:00 p. m.' },
  ],
  mapQuery: 'Centros Escolares Hugo César Piñeda Chacón, Del Mesón, La Paz, B.C.S.',
  mission: null as string | null,
  vision: 'Ser una institución educativa reconocida por ofrecer una formación académica y humana de excelencia, donde los estudiantes desarrollen su máximo potencial, participen activamente en la sociedad y contribuyan al progreso de su comunidad mediante valores, respeto y responsabilidad.',
  history: null as string | null,
  social: { facebook: null as string | null, instagram: null as string | null },
}

export const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(school.mapQuery)}&z=16&output=embed`
export const mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.mapQuery)}`

export interface Slide { tag: string; title: string; subtitle?: string; text: string; image: string; action?: { label: string; href: string } }
export const slides: Slide[] = [
  {
    tag: 'Evento', title: 'Festival 2026', subtitle: 'Marzo - Junio',
    text: 'Bienvenidos a nuestro nuevo festival escolar, donde presentaremos a la reina de la escuela.',
    image: img('inicio/festival.jpg'), action: { label: 'Detalles', href: '/calendario' },
  },
  {
    tag: 'Bienvenidos', title: 'Escuela Primaria', subtitle: 'Hugo César Piñeda Chacón',
    text: 'Conoce nuestra escuela, el calendario escolar y la información para las familias.',
    image: img('inicio/escuela.jpg'), action: { label: 'Conócenos', href: '/conocenos' },
  },
  {
    tag: 'Ciclo escolar', title: 'Calendario', subtitle: 'escolar',
    text: 'Consulta las fechas del ciclo, los periodos de evaluación y los días sin clases.',
    image: img('inicio/calendario.jpg'), action: { label: 'Ver calendario', href: '/calendario' },
  },
]

export const quickLinks = [
  { label: 'Calendario', text: 'Fechas del ciclo', href: '/calendario', icon: 'calendar', tone: 'orange' },
  { label: 'Documentos', text: 'Inscripción y formatos', href: '/documentos', icon: 'file', tone: 'teal' },
  { label: 'Conócenos', text: 'Misión, visión e historia', href: '/conocenos', icon: 'book', tone: 'red' },
  { label: 'Contáctanos', text: 'Dirección y horarios', href: '/contactanos', icon: 'phone', tone: 'violet' },
] as const

export const aboutPhotos = { mission: img('conocenos/mision.jpg'), history: img('conocenos/historia.jpg') }

/** Fotos de fondo de los encabezados de cada página. */
export const pageImages = {
  about: img('conocenos/historia.jpg'),
  students: img('galeria/5.jpg'),
  calendar: img('inicio/calendario.jpg'),
  documents: img('galeria/1.jpg'),
  contact: img('inicio/escuela.jpg'),
}

export const gallery: { src: string; alt: string }[] = [
  { src: img('galeria/1.jpg'), alt: 'Salón de clases' },
  { src: img('galeria/2.jpg'), alt: 'Alumnos en clase' },
  { src: img('galeria/3.jpg'), alt: 'Alumnos dibujando' },
  { src: img('galeria/4.jpg'), alt: 'Trabajo manual de un alumno' },
  { src: img('galeria/5.jpg'), alt: 'Docente con un alumno' },
  { src: img('galeria/6.jpg'), alt: 'Grupo en el salón' },
]

export const values = [
  { name: 'Calidad', icon: 'school', color: 'purple', text: 'Trabajamos cada día para ofrecer una educación de calidad.' },
  { name: 'Conocimiento', icon: 'book', color: 'green', text: 'Fomentamos la curiosidad y el gusto por aprender.' },
  { name: 'Constancia', icon: 'student', color: 'violet', text: 'Acompañamos el esfuerzo diario de cada alumno.' },
  { name: 'Liderazgo', icon: 'teacher', color: 'orange', text: 'Formamos alumnos que participan y proponen.' },
] as const

/** Imagen del calendario oficial del ciclo; colócala en public/img/calendario-escolar.png */
export const calendarImage = img('calendario-escolar.png')
/** PDF descargable del calendario (opcional), por ejemplo '/documentos/calendario.pdf'. */
export const calendarPdf: string | null = null

export type EventKind = 'ciclo' | 'suspension' | 'cte' | 'vacaciones' | 'festejo'
export const eventKinds: Record<EventKind, { label: string; tone: string }> = {
  ciclo: { label: 'Ciclo escolar', tone: 'blue' },
  suspension: { label: 'Sin clases', tone: 'red' },
  cte: { label: 'Consejo Técnico', tone: 'violet' },
  vacaciones: { label: 'Vacaciones', tone: 'yellow' },
  festejo: { label: 'Festejo escolar', tone: 'teal' },
}
/** `end` (opcional) marca el último día de un periodo, como las vacaciones. */
export interface SchoolEvent { date: string; end?: string; kind: EventKind; title: string; detail: string }

/**
 * Fechas importantes del ciclo (AAAA-MM-DD). Mientras la dirección no publique
 * las oficiales, son FECHAS DE EJEMPLO para mostrar el calendario; reemplázalas
 * y cambia `eventsAreExamples` a false.
 */
export const eventsAreExamples = true
export const schoolEvents: SchoolEvent[] = [
  { date: '2026-08-31', kind: 'ciclo', title: 'Inicio del ciclo escolar', detail: 'Primer día de clases del ciclo 2026-2027. Recepción de alumnos en ambos turnos.' },
  { date: '2026-09-16', kind: 'suspension', title: 'Día de la Independencia', detail: 'Suspensión de labores por la conmemoración de la Independencia de México.' },
  { date: '2026-09-25', kind: 'cte', title: 'Consejo Técnico Escolar', detail: 'Sesión de Consejo Técnico del personal docente. No hay clases para los alumnos.' },
  { date: '2026-10-30', kind: 'cte', title: 'Consejo Técnico Escolar', detail: 'Sesión de Consejo Técnico del personal docente. No hay clases para los alumnos.' },
  { date: '2026-11-16', kind: 'suspension', title: 'Revolución Mexicana', detail: 'Suspensión de labores por el aniversario de la Revolución Mexicana.' },
  { date: '2026-11-27', kind: 'cte', title: 'Consejo Técnico Escolar', detail: 'Sesión de Consejo Técnico del personal docente. No hay clases para los alumnos.' },
  { date: '2026-12-18', kind: 'festejo', title: 'Festival navideño', detail: 'Convivencia de fin de año con presentaciones de los grupos. Se invita a las familias.' },
  { date: '2026-12-21', end: '2027-01-06', kind: 'vacaciones', title: 'Vacaciones de invierno', detail: 'Periodo vacacional de invierno. Las clases se reanudan el 7 de enero.' },
  { date: '2027-01-29', kind: 'cte', title: 'Consejo Técnico Escolar', detail: 'Sesión de Consejo Técnico del personal docente. No hay clases para los alumnos.' },
  { date: '2027-02-01', kind: 'suspension', title: 'Día de la Constitución', detail: 'Suspensión de labores por el aniversario de la Constitución Mexicana.' },
  { date: '2027-02-24', kind: 'festejo', title: 'Día de la Bandera', detail: 'Ceremonia cívica de honores a la bandera en el patio de la escuela.' },
  { date: '2027-02-26', kind: 'cte', title: 'Consejo Técnico Escolar', detail: 'Sesión de Consejo Técnico del personal docente. No hay clases para los alumnos.' },
  { date: '2027-03-15', kind: 'suspension', title: 'Natalicio de Benito Juárez', detail: 'Suspensión de labores por el natalicio de Benito Juárez.' },
  { date: '2027-03-19', kind: 'festejo', title: 'Festival 2026: presentación de la reina', detail: 'Inicio del festival escolar (marzo a junio) con la presentación de la reina de la escuela.' },
  { date: '2027-03-22', end: '2027-04-02', kind: 'vacaciones', title: 'Vacaciones de primavera', detail: 'Periodo vacacional de Semana Santa y Semana de Pascua.' },
  { date: '2027-04-30', kind: 'festejo', title: 'Día del Niño', detail: 'Festejo para los alumnos con juegos y actividades recreativas.' },
  { date: '2027-05-05', kind: 'suspension', title: 'Batalla de Puebla', detail: 'Suspensión de labores por el aniversario de la Batalla de Puebla.' },
  { date: '2027-05-10', kind: 'festejo', title: 'Día de las Madres', detail: 'Festival en honor a las mamás con números artísticos de los grupos.' },
  { date: '2027-05-28', kind: 'cte', title: 'Consejo Técnico Escolar', detail: 'Sesión de Consejo Técnico del personal docente. No hay clases para los alumnos.' },
  { date: '2027-07-09', kind: 'festejo', title: 'Ceremonia de graduación', detail: 'Ceremonia de fin de cursos de los alumnos de sexto grado.' },
  { date: '2027-07-16', kind: 'ciclo', title: 'Fin del ciclo escolar', detail: 'Último día de clases del ciclo 2026-2027.' },
]

export type DocumentCategory = 'Inscripción' | 'Circulares' | 'Formatos' | 'Reglamento'
export const documentCategories: { name: DocumentCategory; icon: string; description: string }[] = [
  { name: 'Inscripción', icon: 'enroll', description: 'Requisitos y pasos para inscribir o reinscribir a un alumno.' },
  { name: 'Circulares', icon: 'inbox', description: 'Avisos de la dirección para las familias.' },
  { name: 'Formatos', icon: 'file', description: 'Formatos para entregar en la dirección.' },
  { name: 'Reglamento', icon: 'book', description: 'Normas de convivencia de la escuela.' },
]
/** Archivos publicados; colócalos en public/documentos/ y regístralos aquí. */
export const schoolDocuments: { title: string; category: DocumentCategory; href: string; updated: string }[] = []

export const navLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Conócenos', href: '/conocenos' },
  { label: 'Estudiantes', href: '/estudiantes' },
  { label: 'Calendario', href: '/calendario' },
  { label: 'Documentos', href: '/documentos' },
  { label: 'Contáctanos', href: '/contactanos' },
]

/** Ciclo escolar vigente: de agosto a julio. */
export function currentCycle(today = new Date()) {
  const start = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1
  return { start, end: start + 1, label: `${start}-${start + 1}` }
}
