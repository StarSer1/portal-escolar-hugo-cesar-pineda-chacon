import type { AcademicData, Guardian, Student } from '@/types/models'
import { groupTitle, officialSchool, WATERMARK } from './reports'

/**
 * Carta compromiso sobre la corresponsabilidad (texto oficial del ciclo).
 * Se llena con el alumno elegido, sus hermanos (alumnos con algún tutor en
 * común) y los tutores vinculados a su expediente.
 */
export interface LetterStudent { name: string; group: string }
export interface LetterGuardian { name: string; relationship: string; phone: string; primary: boolean }
export interface CommitmentLetter {
  cycle: string
  students: LetterStudent[]
  guardians: LetterGuardian[]
  guardianName: string
  fatherPhone: string
  motherPhone: string
  relativePhone: string
}

const fullName = (student: Student) => `${student.names} ${student.surnames}`.trim()

function currentGroup(data: AcademicData, studentId: string, yearId: string) {
  const enrollment = data.enrollments.find((item) => item.studentId === studentId && item.schoolYearId === yearId && item.status === 'active')
  const group = data.groups.find((item) => item.id === enrollment?.groupId)
  return group ? groupTitle(group) : ''
}

const isMother = (relationship: string) => /madre|mam[aá]|tutora/i.test(relationship)
const isFather = (relationship: string) => /padre|pap[aá]|tutor(?!a)/i.test(relationship) && !isMother(relationship)

export function buildCommitmentLetter(data: AcademicData, student: Student, yearId: string): CommitmentLetter {
  const links = data.studentGuardians.filter((link) => link.studentId === student.id)
  const guardians = links
    .map((link) => ({ link, guardian: data.guardians.find((item) => item.id === link.guardianId) }))
    .filter((entry): entry is { link: typeof entry.link; guardian: Guardian } => !!entry.guardian)
    .sort((a, b) => Number(b.link.primary) - Number(a.link.primary))
    .map(({ link, guardian }): LetterGuardian => ({ name: guardian.name, relationship: link.relationship, phone: guardian.phone, primary: link.primary }))
  // Hermanos: otros alumnos activos con al menos un tutor en común.
  const guardianIds = new Set(links.map((link) => link.guardianId))
  const siblingIds = new Set(data.studentGuardians.filter((link) => guardianIds.has(link.guardianId) && link.studentId !== student.id).map((link) => link.studentId))
  const siblings = data.students.filter((item) => siblingIds.has(item.id) && item.status === 'active' && currentGroup(data, item.id, yearId))
  const students = [student, ...siblings].slice(0, 3).map((item) => ({ name: fullName(item), group: currentGroup(data, item.id, yearId) }))
  const father = guardians.find((item) => isFather(item.relationship))
  const mother = guardians.find((item) => isMother(item.relationship))
  const relative = guardians.find((item) => item !== father && item !== mother && item.phone)
  return {
    cycle: data.schoolYears.find((year) => year.id === yearId)?.name ?? '',
    students, guardians,
    guardianName: guardians[0]?.name ?? '',
    fatherPhone: father?.phone ?? '',
    motherPhone: mother?.phone ?? '',
    relativePhone: relative?.phone ?? '',
  }
}

/* --- Documento imprimible ---------------------------------------------- */

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const asset = (path: string) => `${window.location.origin}${path}`

export interface LetterOptions { date: string; director: string }

const css = `
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; } body { font-family: 'Open Sans', 'Segoe UI', Calibri, Arial, sans-serif; background: #5f6670; color: #111; }
@page { size: letter portrait; margin: 0; }
.page { position: relative; overflow: hidden; width: 215.9mm; height: 279.4mm; margin: 14px auto; background: #fff; box-shadow: 0 4px 18px rgb(0 0 0 / .35); }
@media print { body { background: #fff; } .page { margin: 0; box-shadow: none; break-after: page; } .page:last-child { break-after: auto; } }
.wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 10; }
.wm span { transform: rotate(-52deg); font: 900 130pt Arial, sans-serif; letter-spacing: 10pt; color: rgb(190 30 45 / .14); border: 6pt solid rgb(190 30 45 / .14); border-radius: 16pt; padding: 0 22pt; }
.head { position: absolute; top: 9mm; left: 18mm; right: 22mm; display: flex; justify-content: space-between; align-items: center; }
.head img { height: 17mm; }
.head p { margin: 0; text-align: right; font: 700 7.6pt Montserrat, Arial, sans-serif; line-height: 1.3; }
.head p span { font-weight: 400; }
.side { position: absolute; top: 33mm; bottom: 31mm; left: 3mm; width: 44mm; background: url('%ORLA%') repeat-y left top / 44mm auto; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 3mm 0 6mm; text-align: center; font: 700 7.5pt Arial, sans-serif; }
.side img { width: 32mm; }
.side b { display: block; padding: 0 2mm; background: rgb(255 255 255 / .75); }
.foot { position: absolute; left: 50mm; right: 4mm; bottom: 4mm; display: flex; align-items: flex-end; gap: 4mm; }
.foot div { flex: 1; text-align: center; color: #b4561a; font: 700 6pt Arial, sans-serif; border-bottom: 1.6pt solid #a6192e; padding-bottom: 2mm; margin-bottom: 4mm; }
.foot img { width: 30mm; }
.body { position: absolute; top: 35mm; left: 56mm; right: 20mm; bottom: 34mm; font-size: 10pt; line-height: 1.55; text-align: justify; }
.body p { margin: 0 0 2.6mm; }
h1 { color: #538135; font-size: 13pt; text-align: center; margin: 0 0 4mm; line-height: 1.3; }
h2 { color: #538135; font-size: 12pt; text-align: center; margin: 4mm 0 2.6mm; }
h2.blue { color: #0070c0; font-size: 13pt; line-height: 1.3; margin-top: 2mm; }
h3 { color: #c55a11; font-size: 10.5pt; margin: 4mm 0 1mm; }
.commit { text-indent: 10mm; } .commit em { font-style: normal; font-weight: 700; color: #0070c0; }
ul { margin: 0 0 2.6mm; padding-left: 5mm; } li { margin-bottom: 1mm; }
.hours { list-style: none; padding-left: 10mm; font-weight: 700; } .hours li { margin: 1.4mm 0; }
.blue { color: #0070c0; font-weight: 700; }
ol { padding-left: 6mm; margin: 0 0 2.6mm; } ol li { margin-bottom: 1.6mm; }
.sign { margin: 8mm auto 0; width: 80mm; text-align: center; font-size: 10pt; line-height: 1.4; }
.sign i { display: block; border-top: .8pt solid #111; margin: 14mm 0 1.5mm; }
.form { font-family: Arial, sans-serif; font-weight: 700; font-size: 10.5pt; text-align: left; }
.form p { display: flex; gap: 2mm; align-items: baseline; margin: 0 0 3.2mm; }
.form span { flex: 1; border-bottom: .8pt solid #111; font-weight: 400; min-height: 12pt; padding: 0 1mm; }
.form span.short { flex: 0 0 32mm; }
.ack { color: #4472c4; font-weight: 700; font-size: 11pt; text-align: justify; }
.date { text-align: right; font-weight: 700; font-size: 11pt; margin-top: 6mm; }
.note { color: #c00000; font-weight: 700; font-size: 9.5pt; } .note b { color: #111; }
`

const P = (html: string) => `<p>${html}</p>`
const commit = (html: string) => `<p class="commit"><em>Me comprometo a:</em> ${html}</p>`

/** Contenido de cada hoja: el texto es fijo, así la paginación también. */
function pagesContent(letter: CommitmentLetter, options: LetterOptions) {
  const longDate = /^\d{4}-\d{2}-\d{2}$/.test(options.date)
    ? new Date(`${options.date}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    : options.date
  const studentLines = [0, 1, 2].map((index) => {
    const student = letter.students[index]
    return `<p>Nombre del alumno(a): <span>${esc(student?.name ?? '')}</span></p><p>Grado y grupo: <span class="short">${esc(student?.group ?? '')}</span></p>`
  }).join('')
  return [
    `<h1>Carta compromiso sobre la corresponsabilidad<br>en la educación y bienestar de los alumnos del Ciclo Escolar ${esc(letter.cycle)}</h1>
    <p><b>Estimados Padres, Madres y Tutores:</b></p>
    ${P('La educación de nuestras niñas, niños y adolescentes es una tarea compartida entre la escuela y la familia. Para alcanzar nuestro objetivo común de garantizar su pleno desarrollo, bienestar y aprendizaje, es fundamental que trabajemos en equipo, basándonos en un marco de respeto, comunicación y responsabilidades claras.')}
    ${P('El propósito de este documento es recordar las obligaciones que todos tenemos, fundamentadas en el <b>Interés Superior de la Niñez</b>, y establecer un compromiso formal para asegurar un entorno escolar seguro, estable y propicio para el aprendizaje. Este acuerdo se sustenta en dos pilares legales: la <b>Ley General de los Derechos de Niñas, Niños y Adolescentes (LGDNNA)</b> y la <b>Ley General de Educación (LGE)</b>.')}
    <h2>Marco legal de nuestras responsabilidades compartidas</h2>
    ${P('La ley es clara al señalar que <b>la familia es el núcleo fundamental de la sociedad y el primer espacio de protección y desarrollo.</b>')}
    <ul><li>La <b>LGDNNA</b> establece que quienes ejercen la patria potestad, tutela o guarda y custodia tienen la <b>responsabilidad primordial</b> de la crianza y el desarrollo de niñas, niños y adolescentes lo que incluye la satisfacción de sus <b>necesidades de alimentación</b>, salud y educación para su desarrollo integral (Art. 103). Asimismo, garantiza su <b>Derecho a la Protección de la Salud</b> (Art. 50) y su <b>Derecho a una Vida Libre de Violencia</b>, que incluye cualquier forma de <b>negligencia u omisión de cuidados</b> (Art. 46).</li>
    <li>La <b>Ley General de Educación</b> refuerza esta idea, señalando como obligación de los padres el "hacer que sus hijas, hijos o pupilos [...] reciban la educación" y <b>"participar en el proceso educativo [...] al revisar su progreso, desempeño y conducta"</b> (Art. 129).</li></ul>
    ${P('Basados en este marco, les invitamos a comprometerse activamente en los siguientes puntos clave que impactan directamente en la vida escolar de sus hijos:')}`,

    `<h2 class="blue">Compromisos fundamentales para el bienestar y el logro educativo de las niñas y niños</h2>
    <h3>1. Sobre la asistencia, participación y seguimiento académico</h3>
    ${P('El éxito académico de un estudiante depende en gran medida del apoyo que recibe en casa. Este acompañamiento es una de las responsabilidades más importantes para garantizar su <b>Derecho a una Educación de Calidad</b>.')}
    ${commit('Asegurar la asistencia diaria de mi hijo(a), tutelado(a); dar seguimiento constante a su desempeño académico, apoyándole en la realización de sus tareas, proveyendo los materiales necesarios para sus actividades escolares y fomentando un ambiente en casa que valore el aprendizaje. Asimismo, me comprometo a <b>asistir puntualmente a las reuniones y convocatorias</b> que realicen docentes y directivos para conocer su progreso y colaborar en su formación, así como para participar en acciones de mejora de los espacios físicos del plantel.')}
    <h3>2. Sobre la alimentación</h3>
    ${P('Una alimentación adecuada es la base para la salud, el desarrollo y la capacidad de aprendizaje. El no proveerla vulnera su <b>derecho a un desarrollo integral</b> y afecta directamente su rendimiento escolar.')}
    ${commit('Asegurar que mi hijo(a) asista a la escuela habiendo <b>desayunado de manera adecuada</b> y a proveerle un <b>refrigerio saludable que incluya la cantidad suficiente de agua simple potable</b> para consumir durante la jornada escolar. Asimismo, a atender las recomendaciones que resulten de la participación de mi hijo(a) en la Jornada de Salud Escolar en el marco de la <b>Estrategia Nacional: “Vive Saludable, Vive Feliz”.</b>')}`,

    `<h3 style="margin-top:0">3. Sobre la puntualidad en la hora de entrada</h3>
    ${P('La llegada puntual al inicio de la jornada escolar es indispensable para el correcto desarrollo del proceso educativo. La impuntualidad afecta directamente el aprovechamiento de la jornada escolar.')}
    ${commit('Garantizar que mi hija(o), tutelado(a) se presente en la escuela minutos antes de las 8:00 am, entendiendo que los retrasos le hacen perder instrucciones valiosas, interrumpen la dinámica del grupo y le generan inseguridad. Considere que el acceso al plantel es a partir de las 7:40 am.')}
    <h3>4. Sobre la puntualidad en la hora de salida</h3>
    ${P('El retiro puntual de los alumnos al finalizar la jornada es un acto fundamental de cuidado que impacta directamente en su <b>bienestar emocional y su derecho a la seguridad</b>.')}
    ${commit('Acudir personalmente, o asegurar que la persona autorizada lo haga, a recoger a mi hija(o), tutelado(a) a la hora exacta de la salida de acuerdo al grado que curse:')}
    <p class="blue" style="margin-bottom:0">Horario de salida:</p>
    <ul class="hours"><li>- Estudiantes de 1er. grado: 12:15 hrs.</li><li>- Estudiantes de 2do. grado: 12:20 hrs.</li><li>- Estudiantes de 3º y 4º grado: 12:25 hrs.</li><li>- Estudiantes de 5° y 6° grado: 12:30 hrs.</li></ul>
    ${P('Comprendo que la espera prolongada le genera ansiedad, miedo y un sentimiento de abandono, lo cual es contrario a su interés superior.')}
    <h3>5. Sobre la atención en casos de malestar o emergencia en la escuela.</h3>
    ${P('La salud e integridad física de los alumnos es nuestra máxima prioridad. La falta de atención por parte de la familia en una situación de salud es considerada por la ley como <b>omisión de cuidados y negligencia</b>.')}
    ${commit('Mantener mis datos de contacto actualizados y a <b>atender de manera inmediata</b> los llamados de la escuela en caso de que mi hija(o), tutelado(a) presente algún malestar o sufra un accidente, y a <b>acudir a la brevedad posible</b> para brindarle la atención que requiera. También a notificar al maestro(a) en casos de que mi hijo(a) no asista a la escuela por motivos de enfermedad haciendo llegar el justificante médico correspondiente.')}`,

    `<h2 class="blue" style="margin-top:0">Protocolo a seguir ante el incumplimiento reiterado de los compromisos</h2>
    ${P('Confiamos en que esta carta fortalecerá nuestra colaboración. Sin embargo, es nuestra obligación, en apego al principio del <b>Interés Superior de la Niñez</b>, actuar cuando se detecta que un alumno se encuentra en una situación que vulnera sus derechos de manera sistemática.')}
    ${P('Un patrón de incumplimiento reiterado a los compromisos aquí descritos —sea por impuntualidad constante, inasistencia a reuniones, falta de seguimiento académico o desatención en casos de salud e higiene— puede ser interpretado como una <b>omisión de cuidados o negligencia</b> que afecta el desarrollo integral del menor.')}
    ${P('Por lo tanto, en caso de reincidencia, la Dirección de la escuela seguirá el siguiente protocolo:')}
    <ol><li><b>Registro y diálogo:</b> Se documentará cada incidencia y se buscará un diálogo directo con el padre, madre o tutor para establecer acuerdos específicos.</li>
    <li><b>Notificación formal:</b> Si la conducta persiste, la escuela emitirá una notificación por escrito, recordando los compromisos firmados.</li>
    <li><b>Intervención de autoridades:</b> Como última instancia, y si se considera que la persistencia de la(s) falta(s) vulnera los derechos del alumno, la Dirección del plantel tiene la obligación legal de dar parte a la <b>Procuraduría de Protección de Niñas, Niños y Adolescentes</b> para que evalúe la situación y determine las medidas conducentes para garantizar el bienestar del menor.</li></ol>
    ${P('Esta medida no busca ser punitiva, sino garantizar la protección integral del alumno, tal como lo mandata la ley.')}
    ${P('Agradecemos profundamente su colaboración. Al firmar este documento, reafirmamos nuestra alianza y nuestra responsabilidad compartida para que cada uno de nuestros alumnos ejerza plenamente sus derechos.')}
    <div class="sign">Atentamente<i></i>${esc(options.director)}<br>Director del plantel</div>`,

    `<p class="ack">He leído y comprendido los compromisos y el protocolo aquí establecidos, y me sumo a ellos por el bienestar de mi hijo(a), tutelado(a).</p>
    <div class="form">
      <p style="margin-bottom:4mm">Registre el nombre completo de su(s) hijo(s) (as) y el grupo</p>
      ${studentLines}
      <p style="margin-top:6mm">Nombre del padre, madre o tutor: <span>${esc(letter.guardianName)}</span></p>
      <p>No. Celular del padre o tutor: <span>${esc(letter.fatherPhone)}</span></p>
      <p>No. Celular de la madre o tutora: <span>${esc(letter.motherPhone)}</span></p>
      <p>No. Celular de un familiar mayor de edad: <span>${esc(letter.relativePhone)}</span></p>
      <p style="margin-top:10mm">Firma: <span></span></p>
    </div>
    <p class="date">Fecha: ${esc(longDate)}</p>
    <p class="note"><b>NOTA:</b> Esta carta compromiso habiendo sido leída, comprendida y firmada será integrada al expediente escolar del alumno(a) y su versión digital se hará llegar al padre, madre de familia o tutor(a).</p>`,
  ]
}

export function commitmentLetterHtml(letter: CommitmentLetter, options: LetterOptions) {
  const wm = WATERMARK ? `<div class="wm" aria-hidden="true"><span>${esc(WATERMARK)}</span></div>` : ''
  const frame = `
    <header class="head"><img src="${asset('/img/documentos/sep-bcs.png')}" alt=""><p>GOBIERNO DEL ESTADO DE BAJA CALIFORNIA SUR<br>SECRETARÍA DE EDUCACIÓN PÚBLICA<br>EDUCACIÓN BÁSICA<br><span>DIRECCIÓN DE PRIMARIA</span></p></header>
    <aside class="side"><img src="${asset('/img/documentos/escudo-escuela.png')}" alt=""><b>ESCUELA PRIMARIA</b><b>PROFR. HUGO CÉSAR<br>PIÑEDA CHACÓN</b><b>TURNO MATUTINO</b><b>C.C.T.: ${esc(officialSchool.cct)}</b><b>pinedachacontm@<br>hotmail.com</b><b>${esc(officialSchool.zone)}A. ZONA ESCOLAR</b></aside>
    <footer class="foot"><div>Del mesón entre Antonio Wilson González y camino del triunfo, fraccionamiento Camino Real.<br>Mpio. De La Paz, Baja California Sur. C.P. 23088</div><img src="${asset('/img/documentos/50-aniversario.png')}" alt=""></footer>`
  const pages = pagesContent(letter, options).map((content) => `<section class="page">${wm}${frame}<div class="body">${content}</div></section>`)
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Carta compromiso</title><style>${css.replace('%ORLA%', asset('/img/documentos/orla.png'))}</style></head><body>${pages.join('')}</body></html>`
}
