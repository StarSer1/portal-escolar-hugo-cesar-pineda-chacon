/**
 * Campos formativos de la boleta oficial (Nueva Escuela Mexicana).
 * Cada materia del sistema se asigna a un campo; la boleta promedia las
 * calificaciones de las materias de cada campo.
 */
export const formativeFields = ['lenguajes', 'saberes', 'etica', 'humano'] as const
export type FormativeField = typeof formativeFields[number]

export const formativeLabels: Record<FormativeField, string> = {
  lenguajes: 'Lenguajes',
  saberes: 'Saberes y Pensamiento Científico',
  etica: 'Ética, Naturaleza y Sociedades',
  humano: 'De lo Humano y lo Comunitario',
}

export const formativeOptions = formativeFields.map((value) => ({ value, label: formativeLabels[value] }))

export const isFormativeField = (value: unknown): value is FormativeField => formativeFields.includes(value as FormativeField)

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Suggested field by subject name, used while the director has not chosen one. */
export function suggestFormativeField(name: string): FormativeField | undefined {
  const value = normalize(name)
  if (/lenguaje|espanol|ingles|lengua|lectura|escritura|arte|musica|danza|teatro/.test(value)) return 'lenguajes'
  if (/saberes|matematic|ciencia|conocimiento del medio|pensamiento/.test(value)) return 'saberes'
  if (/etica|naturaleza|sociedad|historia|geografia|civica|entidad/.test(value)) return 'etica'
  if (/humano|comunitario|fisica|socioemocional|vida saludable|tutoria|deporte/.test(value)) return 'humano'
  return undefined
}

/** The chosen field, else the suggestion by name. */
export function formativeFieldOf(subject: { name: string; formativeField?: string }): FormativeField | undefined {
  return isFormativeField(subject.formativeField) ? subject.formativeField : suggestFormativeField(subject.name)
}
