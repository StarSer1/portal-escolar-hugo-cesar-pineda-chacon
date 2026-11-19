/**
 * Modelo del contenido del sitio público y sus valores predeterminados.
 *
 * El director edita todo este contenido desde el panel (/panel/sitio); los
 * cambios se guardan en Firestore (colección `site`) y los archivos que sube,
 * en Cloudinary (ver docs/cloudinary.md). Los valores de este archivo son los que se muestran mientras una
 * sección no se haya guardado nunca desde el panel. Un texto vacío se muestra
 * como "Información por confirmar".
 */
const img = (path: string) => `/img/${path}`
const doc = (path: string) => `/documentos/${path}`

export interface Shift { name: string; days: string; hours: string }
export interface GeneralContent {
  name: string
  fullName: string
  tagline: string
  address: string
  phone: string
  email: string
  mapQuery: string
  mission: string
  vision: string
  history: string
  facebook: string
  instagram: string
  shifts: Shift[]
}

/** Fotos de la sección Conócenos y de los encabezados de cada página. */
export interface ImagesContent {
  mission: string
  history: string
  about: string
  students: string
  calendar: string
  documents: string
  contact: string
}

export interface Slide { tag: string; title: string; subtitle: string; text: string; image: string; actionLabel: string; actionHref: string }
export interface HomeContent { slides: Slide[]; galleryIntro: string }

export interface GalleryPhoto { src: string; alt: string }
export interface GalleryContent { photos: GalleryPhoto[] }

export type EventKind = 'ciclo' | 'suspension' | 'cte' | 'vacaciones' | 'festejo' | 'tarea'
/** `end` (opcional) marca el último día de un periodo, como las vacaciones. */
export interface SchoolEvent { date: string; end?: string; kind: EventKind; title: string; detail: string }
export interface CalendarContent { events: SchoolEvent[]; examples: boolean; pdf: string }

export interface DocumentCategory { name: string; icon: string; description: string }
export interface SchoolDocument { id: string; title: string; category: string; href: string; updated: string }
export interface DocumentsContent { categories: DocumentCategory[]; files: SchoolDocument[] }

export interface GradeTeacher { name: string; role: string; group: string }
export interface GradeInfo { grade: number; teachers: GradeTeacher[] }
export interface TeachingRole { title: string; text: string; photo: string; color: string }
export interface StudentsContent { intro: string; grades: GradeInfo[]; rolesIntro: string; roles: TeachingRole[]; evaluation: string }

export interface SiteContent {
  general: GeneralContent
  images: ImagesContent
  home: HomeContent
  gallery: GalleryContent
  students: StudentsContent
  calendar: CalendarContent
  documents: DocumentsContent
}
export type SiteSection = keyof SiteContent
export const siteSections: SiteSection[] = ['general', 'images', 'home', 'gallery', 'students', 'calendar', 'documents']

export const eventKinds: Record<EventKind, { label: string; tone: string }> = {
  ciclo: { label: 'Ciclo escolar', tone: 'blue' },
  suspension: { label: 'Sin clases', tone: 'red' },
  cte: { label: 'Consejo Técnico', tone: 'violet' },
  vacaciones: { label: 'Vacaciones', tone: 'yellow' },
  festejo: { label: 'Festejo escolar', tone: 'teal' },
  tarea: { label: 'Tarea o pendiente', tone: 'orange' },
}

/** Íconos disponibles para las categorías de documentos. */
export const documentIcons = [
  { value: 'file', label: 'Documento' },
  { value: 'enroll', label: 'Inscripción' },
  { value: 'inbox', label: 'Avisos' },
  { value: 'book', label: 'Libro' },
  { value: 'clock', label: 'Horario' },
  { value: 'calendar', label: 'Calendario' },
  { value: 'info', label: 'Información' },
  { value: 'school', label: 'Escuela' },
] as const

/** Colores disponibles para las tarjetas de docentes de la página Estudiantes. */
export const roleColors = [
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'violet', label: 'Morado' },
  { value: 'orange', label: 'Naranja' },
  { value: 'red', label: 'Rojo' },
  { value: 'teal', label: 'Turquesa' },
] as const

export const defaultContent: SiteContent = {
  general: {
    name: 'Hugo César Piñeda Chacón',
    fullName: 'Escuela Primaria Hugo César Piñeda Chacón',
    tagline: 'Siempre tendrá los brazos abiertos al conocimiento.',
    address: 'Del Mesón S/N, Camino Real, 23088 La Paz, B.C.S.',
    phone: '+52 612 114 3049',
    email: '',
    mapQuery: 'Centros Escolares Hugo César Piñeda Chacón, Del Mesón, La Paz, B.C.S.',
    mission: '',
    vision: 'Ser una institución educativa reconocida por ofrecer una formación académica y humana de excelencia, donde los estudiantes desarrollen su máximo potencial, participen activamente en la sociedad y contribuyan al progreso de su comunidad mediante valores, respeto y responsabilidad.',
    history: '',
    facebook: '',
    instagram: '',
    shifts: [
      { name: 'Matutino', days: 'Lunes a viernes', hours: '7:00 a. m. a 1:00 p. m.' },
      { name: 'Vespertino', days: 'Lunes a viernes', hours: '1:00 p. m. a 6:00 p. m.' },
    ],
  },
  images: {
    mission: img('conocenos/mision.jpg'),
    history: img('conocenos/historia.jpg'),
    about: img('conocenos/historia.jpg'),
    students: img('galeria/5.jpg'),
    calendar: img('inicio/calendario.jpg'),
    documents: img('galeria/1.jpg'),
    contact: img('inicio/escuela.jpg'),
  },
  home: {
    slides: [
      {
        tag: 'Evento', title: 'Festival 2027', subtitle: 'Marzo - Junio',
        text: 'Bienvenidos a nuestro nuevo festival escolar, donde presentaremos a la reina de la escuela.',
        image: img('inicio/festival.jpg'), actionLabel: 'Detalles', actionHref: '/calendario',
      },
      {
        tag: 'Bienvenidos', title: 'Escuela Primaria', subtitle: 'Hugo César Piñeda Chacón',
        text: 'Conoce nuestra escuela, el calendario escolar y la información para las familias.',
        image: img('inicio/escuela.jpg'), actionLabel: 'Conócenos', actionHref: '/conocenos',
      },
      {
        tag: 'Ciclo escolar', title: 'Calendario', subtitle: 'escolar',
        text: 'Consulta las fechas del ciclo, los periodos de evaluación y los días sin clases.',
        image: img('inicio/calendario.jpg'), actionLabel: 'Ver calendario', actionHref: '/calendario',
      },
    ],
    galleryIntro: 'Nuestras instalaciones dentro del plantel, priorizando siempre la limpieza y el mantenimiento del mobiliario estudiantil.',
  },
  gallery: {
    photos: [
      { src: img('galeria/1.jpg'), alt: 'Salón de clases' },
      { src: img('galeria/2.jpg'), alt: 'Alumnos en clase' },
      { src: img('galeria/3.jpg'), alt: 'Alumnos dibujando' },
      { src: img('galeria/4.jpg'), alt: 'Trabajo manual de un alumno' },
      { src: img('galeria/5.jpg'), alt: 'Docente con un alumno' },
      { src: img('galeria/6.jpg'), alt: 'Grupo en el salón' },
    ],
  },
  students: {
    intro: 'La escuela atiende a niñas y niños de 1.° a 6.° grado de primaria, en turno matutino y vespertino. Selecciona un grado para conocer a sus docentes.',
    grades: [1, 2, 3, 4, 5, 6].map((grade) => ({ grade, teachers: [] })),
    rolesIntro: 'Cada grupo tiene un docente titular y tres docentes de especialidad.',
    roles: [
      { title: 'Titular de grupo', text: 'Acompaña al grupo durante todo el ciclo escolar en las asignaturas generales.', photo: img('galeria/6.jpg'), color: 'blue' },
      { title: 'Educación Física', text: 'Movimiento, juego y hábitos saludables dentro y fuera del aula.', photo: img('docentes/educacion-fisica.jpg'), color: 'green' },
      { title: 'Inglés', text: 'El inglés como segunda lengua, con actividades para cada grado.', photo: img('galeria/5.jpg'), color: 'violet' },
      { title: 'Artes', text: 'Expresión, creatividad y apreciación artística.', photo: img('galeria/4.jpg'), color: 'orange' },
    ],
    evaluation: 'Cada asignatura se califica en una escala de 5 a 10 al final de cada periodo de evaluación. Si tienes dudas sobre una calificación, acude a la dirección.',
  },
  calendar: {
    // Fechas de ejemplo hasta que la dirección publique las oficiales desde el panel.
    examples: true,
    pdf: '',
    events: [
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
      { date: '2027-03-19', kind: 'festejo', title: 'Festival 2027: presentación de la reina', detail: 'Inicio del festival escolar (marzo a junio) con la presentación de la reina de la escuela.' },
      { date: '2027-03-22', end: '2027-04-02', kind: 'vacaciones', title: 'Vacaciones de primavera', detail: 'Periodo vacacional de Semana Santa y Semana de Pascua.' },
      { date: '2027-04-30', kind: 'festejo', title: 'Día del Niño', detail: 'Festejo para los alumnos con juegos y actividades recreativas.' },
      { date: '2027-05-05', kind: 'suspension', title: 'Batalla de Puebla', detail: 'Suspensión de labores por el aniversario de la Batalla de Puebla.' },
      { date: '2027-05-10', kind: 'festejo', title: 'Día de las Madres', detail: 'Festival en honor a las mamás con números artísticos de los grupos.' },
      { date: '2027-05-28', kind: 'cte', title: 'Consejo Técnico Escolar', detail: 'Sesión de Consejo Técnico del personal docente. No hay clases para los alumnos.' },
      { date: '2027-07-09', kind: 'festejo', title: 'Ceremonia de graduación', detail: 'Ceremonia de fin de cursos de los alumnos de sexto grado.' },
      { date: '2027-07-16', kind: 'ciclo', title: 'Fin del ciclo escolar', detail: 'Último día de clases del ciclo 2026-2027.' },
    ],
  },
  documents: {
    categories: [
      { name: 'Inscripción', icon: 'enroll', description: 'Requisitos y pasos para inscribir o reinscribir a un alumno.' },
      { name: 'Formatos', icon: 'file', description: 'Formatos para llenar, firmar y entregar en la dirección.' },
      { name: 'Protocolos', icon: 'book', description: 'Protocolos de la SEP de Baja California Sur para prevenir y atender el maltrato, el acoso escolar y la violencia sexual.' },
      { name: 'Horarios', icon: 'clock', description: 'Horarios de clases de los docentes de especialidad.' },
      { name: 'Circulares', icon: 'inbox', description: 'Avisos de la dirección para las familias.' },
      { name: 'Reglamento', icon: 'school', description: 'Normas de convivencia de la escuela.' },
    ],
    files: [
      { id: 'carta-compromiso-2026-2027', title: 'Carta compromiso de corresponsabilidad, ciclo 2026-2027', category: 'Formatos', href: doc('carta-compromiso-2026-2027.pdf'), updated: '2026-09-01' },
      { id: 'protocolo-maltrato', title: 'Protocolo local para la erradicación del maltrato en educación básica', category: 'Protocolos', href: doc('protocolo-erradicacion-maltrato.pdf'), updated: '2026-11-10' },
      { id: 'protocolo-acoso-escolar', title: 'Protocolo local de erradicación del acoso escolar en educación básica', category: 'Protocolos', href: doc('protocolo-erradicacion-acoso-escolar.pdf'), updated: '2026-11-10' },
      { id: 'protocolo-violencia-sexual', title: 'Protocolo local para la erradicación de la violencia sexual en educación básica', category: 'Protocolos', href: doc('protocolo-erradicacion-violencia-sexual.pdf'), updated: '2026-11-10' },
      { id: 'horarios-especialistas', title: 'Horarios de docentes especialistas (Inglés, Educación Física y Artes)', category: 'Horarios', href: doc('horarios-docentes-especialistas.pdf'), updated: '2026-11-10' },
    ],
  },
}

/** Accesos de la portada y valores: forman parte del diseño, no del contenido editable. */
export const quickLinks = [
  { label: 'Calendario', text: 'Fechas del ciclo', href: '/calendario', icon: 'calendar', tone: 'orange' },
  { label: 'Documentos', text: 'Inscripción y formatos', href: '/documentos', icon: 'file', tone: 'teal' },
  { label: 'Conócenos', text: 'Misión, visión e historia', href: '/conocenos', icon: 'book', tone: 'red' },
  { label: 'Contáctanos', text: 'Dirección y horarios', href: '/contactanos', icon: 'phone', tone: 'violet' },
] as const

export const values = [
  { name: 'Calidad', icon: 'school', color: 'purple', text: 'Trabajamos cada día para ofrecer una educación de calidad.' },
  { name: 'Conocimiento', icon: 'book', color: 'green', text: 'Fomentamos la curiosidad y el gusto por aprender.' },
  { name: 'Constancia', icon: 'student', color: 'violet', text: 'Acompañamos el esfuerzo diario de cada alumno.' },
  { name: 'Liderazgo', icon: 'teacher', color: 'orange', text: 'Formamos alumnos que participan y proponen.' },
] as const

export const navLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Conócenos', href: '/conocenos' },
  { label: 'Estudiantes', href: '/estudiantes' },
  { label: 'Calendario', href: '/calendario' },
  { label: 'Documentos', href: '/documentos' },
  { label: 'Contáctanos', href: '/contactanos' },
]

export const mapUrls = (query: string) => ({
  embed: `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`,
  link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
})

/** Ciclo escolar vigente: de agosto a julio. */
export function currentCycle(today = new Date()) {
  const start = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1
  return { start, end: start + 1, label: `${start}-${start + 1}` }
}

/** Fecha AAAA-MM-DD en texto legible ("10 nov 2026"); cualquier otro texto se muestra tal cual. */
export function displayDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}
