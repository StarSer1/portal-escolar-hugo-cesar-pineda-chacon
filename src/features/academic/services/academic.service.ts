import {
  collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp,
  type DocumentData, type DocumentReference, type Transaction,
} from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { emptyAcademicData, type AcademicData, type EditableCollection } from '@/types/models'

const fields: Record<EditableCollection, string[]> = {
  students: ['names', 'surnames', 'curp', 'birthDate', 'sex', 'matricula', 'status'],
  guardians: ['name', 'email', 'phone', 'address', 'education', 'occupation', 'status'],
  studentGuardians: ['studentId', 'guardianId', 'relationship', 'primary'],
  teachers: ['name', 'email', 'phone', 'specialty', 'status'],
  schoolYears: ['name', 'startDate', 'endDate', 'status'],
  curriculumPlans: ['name', 'version', 'status'],
  subjectPlans: ['curriculumPlanId', 'name', 'grade', 'specialty', 'status'],
  groups: ['schoolYearId', 'curriculumPlanId', 'grade', 'label', 'shift', 'status', 'generalTeacherId', 'physicalTeacherId', 'englishTeacherId', 'artsTeacherId'],
  gradingPeriods: ['schoolYearId', 'name', 'order', 'startDate', 'endDate', 'status'],
}
const immutable: Partial<Record<EditableCollection, string[]>> = {
  studentGuardians: ['studentId', 'guardianId'],
  teachers: ['specialty'],
  schoolYears: ['startDate', 'endDate'],
  groups: ['schoolYearId', 'curriculumPlanId', 'grade'],
  subjectPlans: ['curriculumPlanId', 'grade', 'specialty'],
  gradingPeriods: ['schoolYearId', 'order'],
}

export function currentActor() {
  const actorId = auth.currentUser?.uid
  if (!actorId) throw new Error('Inicia sesión nuevamente para guardar los cambios.')
  return actorId
}

export function writeAudited(
  transaction: Transaction, entityType: string, ref: DocumentReference<DocumentData>,
  data: DocumentData, previous: DocumentData | undefined, actorId: string, action?: string,
) {
  const auditRef = doc(collection(db, 'auditLogs'))
  transaction.set(ref, {
    ...data, createdAt: previous?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp(),
    updatedBy: actorId, revision: (previous?.revision ?? 0) + 1, auditId: auditRef.id,
  })
  transaction.set(auditRef, {
    action: action ?? (previous ? 'update' : 'create'), entityType, entityId: ref.id,
    actorId, createdAt: serverTimestamp(), previousData: previous ?? null,
  })
  return auditRef.id
}

export function watchAcademicData(onData: (data: AcademicData) => void, onError: (error: Error) => void) {
  const data = { ...emptyAcademicData }
  const names = Object.keys(data) as (keyof AcademicData)[]
  const initialized = new Set<keyof AcademicData>()
  let disposed = false
  const unsubscribe = names.map((name) => {
    const source = name === 'auditLogs'
      ? query(collection(db, name), orderBy('createdAt', 'desc'), limit(100))
      : collection(db, name)
    return onSnapshot(source, (snapshot) => {
      // Every snapshot is a new array; callers can safely derive memoized selectors.
      Object.assign(data, { [name]: snapshot.docs.map((record) => ({ ...record.data(), id: record.id })) })
      initialized.add(name)
      // Do not mount forms with partial catalog data: their initial cycle/group
      // selection must be derived only after every listener has initialized.
      if (!disposed && initialized.size === names.length) onData({ ...data })
    }, (error) => { if (!disposed) onError(error) })
  })
  return () => { disposed = true; unsubscribe.forEach((stop) => stop()) }
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
function validDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
function cleanInput(name: EditableCollection, input: Record<string, unknown>) {
  const data: DocumentData = {}
  for (const key of fields[name]) {
    data[key] = typeof input[key] === 'string' ? input[key].trim() : input[key] ?? ''
  }
  for (const key of ['name', 'names', 'surnames', 'label', 'relationship']) {
    if (key in data) check(typeof data[key] === 'string' && data[key].length > 0 && data[key].length <= 160, 'Completa los nombres y campos obligatorios (máximo 160 caracteres).')
  }
  if ('email' in data) check(!data.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email), 'Escribe un correo electrónico válido.')
  if ('grade' in data) check(Number.isInteger(data.grade) && data.grade >= 1 && data.grade <= 6, 'El grado debe estar entre primero y sexto.')
  if ('specialty' in data) check(['general', 'physical', 'english', 'arts'].includes(data.specialty), 'Selecciona el área docente.')
  if (name === 'students') {
    data.curp = String(data.curp).toUpperCase()
    data.matricula = String(data.matricula).toUpperCase()
    check(/^[A-Z0-9]{18}$/.test(data.curp), 'La CURP debe tener 18 letras y números.')
    check(/^[A-Z0-9-]{1,40}$/.test(data.matricula), 'La matrícula admite hasta 40 letras, números y guiones.')
    check(validDate(data.birthDate) && data.birthDate <= new Date().toISOString().slice(0, 10), 'Revisa la fecha de nacimiento.')
    check(['H', 'M'].includes(data.sex), 'Selecciona el sexo registrado.')
  }
  if (name === 'schoolYears' || name === 'gradingPeriods') {
    check(validDate(data.startDate) && validDate(data.endDate) && data.startDate <= data.endDate, 'Revisa las fechas de inicio y fin.')
  }
  if (name === 'gradingPeriods') check([1, 2, 3].includes(data.order), 'El periodo debe ser 1, 2 o 3.')
  if (name === 'studentGuardians') check(typeof data.primary === 'boolean', 'Indica si el tutor es el contacto principal.')
  if (name === 'curriculumPlans') check(typeof data.version === 'string' && data.version.length > 0 && data.version.length <= 40, 'Escribe la versión del plan.')
  if (name === 'groups') check(['matutino', 'vespertino'].includes(data.shift), 'Selecciona el turno.')
  if ('status' in data) {
    const statuses = name === 'schoolYears' ? ['active', 'closed', 'planned'] : name === 'gradingPeriods' ? ['open', 'closed'] : ['active', 'inactive']
    check(statuses.includes(data.status), 'El estado seleccionado no es válido.')
  }
  return data
}

export async function saveRecord(name: EditableCollection, input: Record<string, unknown>, id?: string): Promise<string> {
  const actorId = currentActor()
  const data = cleanInput(name, input)
  const stableId = name === 'gradingPeriods' ? `${data.schoolYearId}_${data.order}`
    : name === 'studentGuardians' ? `${data.studentId}_${data.guardianId}` : undefined
  check(!id || !stableId || id === stableId, 'No se puede cambiar la relación de un registro existente.')
  const ref = id || stableId ? doc(db, name, id ?? stableId!) : doc(collection(db, name))
  await runTransaction(db, async (transaction) => {
    const previousSnapshot = await transaction.get(ref)
    const previous = previousSnapshot.data()
    if (!id && previous) throw new Error('Este registro ya existe. Edítalo desde la lista.')
    if (id && !previous) throw new Error('El registro ya no existe. Actualiza la página.')
    if (input.revision !== undefined && previous?.revision !== input.revision) throw new Error('Otra persona actualizó este registro. Recarga antes de guardar.')
    for (const key of immutable[name] ?? []) {
      check(!previous || previous[key] === data[key], 'El ciclo, grado y relación original se conservan para proteger el historial. Crea un nuevo registro para cambiarlos.')
    }
    const requireRecord = async (collectionName: string, recordId: string) => {
      check(typeof recordId === 'string' && recordId.length > 0 && !recordId.includes('/'), 'Selecciona todas las relaciones requeridas.')
      const snapshot = await transaction.get(doc(db, collectionName, recordId))
      check(snapshot.exists(), 'Uno de los registros relacionados ya no existe.')
      return snapshot.data()
    }
    let currentYearSlot: { ref: DocumentReference<DocumentData>; schoolYearId: string } | undefined
    if (name === 'schoolYears') {
      const slotRef = doc(db, 'academicSettings', 'currentYear')
      const slot = await transaction.get(slotRef)
      const currentId = slot.data()?.schoolYearId as string | undefined
      if (data.status === 'active') {
        check(!currentId || currentId === ref.id, 'Ya hay un ciclo activo. Cierra el anterior antes de activar este.')
        currentYearSlot = { ref: slotRef, schoolYearId: ref.id }
      } else if (currentId === ref.id || (!currentId && previous?.status === 'active')) {
        currentYearSlot = { ref: slotRef, schoolYearId: '' }
      }
    }
    if (name === 'groups') {
      const year = await requireRecord('schoolYears', data.schoolYearId)
      const plan = await requireRecord('curriculumPlans', data.curriculumPlanId)
      check(previous || year.status !== 'closed', 'No se pueden crear grupos en un ciclo cerrado.')
      check(data.status === 'inactive' || plan.status === 'active', 'Activa primero el plan de estudios.')
      for (const specialty of ['general', 'physical', 'english', 'arts']) {
        const teacher = await requireRecord('teachers', data[`${specialty}TeacherId`])
        check(teacher.specialty === specialty && (data.status === 'inactive' || teacher.status === 'active'), 'Asigna los cuatro profesores activos, cada uno en su especialidad.')
      }
    }
    if (name === 'subjectPlans') await requireRecord('curriculumPlans', data.curriculumPlanId)
    if (name === 'gradingPeriods') {
      const year = await requireRecord('schoolYears', data.schoolYearId)
      check(data.startDate >= year.startDate && data.endDate <= year.endDate, 'El periodo debe quedar dentro de las fechas del ciclo.')
      check(data.status !== 'open' || year.status !== 'closed', 'No se puede abrir un periodo de un ciclo cerrado.')
      for (const order of [1, 2, 3].filter((order) => order !== data.order)) {
        const other = await transaction.get(doc(db, 'gradingPeriods', `${data.schoolYearId}_${order}`))
        check(!other.exists() || data.endDate < other.data().startDate || data.startDate > other.data().endDate,
          'Las fechas se cruzan con otro periodo del mismo ciclo. Usa rangos separados.')
      }
    }
    // Unique student identifiers are reserved in the same transaction as the student.
    const identifierWrites: { ref: DocumentReference<DocumentData>; studentId: string }[] = []
    if (name === 'students') {
      for (const key of ['curp', 'matricula']) {
        const identifierRef = doc(db, 'studentIdentifiers', `${key}_${data[key]}`)
        const identifier = await transaction.get(identifierRef)
        check(!identifier.exists() || !identifier.data().studentId || identifier.data().studentId === ref.id, `Ya existe un alumno con esa ${key === 'curp' ? 'CURP' : 'matrícula'}.`)
        identifierWrites.push({ ref: identifierRef, studentId: ref.id })
        if (previous?.[key] && previous[key] !== data[key]) {
          const priorRef = doc(db, 'studentIdentifiers', `${key}_${previous[key]}`)
          const priorIdentifier = await transaction.get(priorRef)
          // Legacy students may predate reservation documents. Never release
          // another student's reservation or create a nonexistent empty slot.
          if (priorIdentifier.data()?.studentId === ref.id) identifierWrites.push({ ref: priorRef, studentId: '' })
        }
      }
    }
    let guardianSlot: { ref: DocumentReference<DocumentData>; linkId: string } | undefined
    let oldPrimary: { ref: DocumentReference<DocumentData>; data: DocumentData } | undefined
    if (name === 'studentGuardians') {
      await requireRecord('students', data.studentId)
      await requireRecord('guardians', data.guardianId)
      const slotRef = doc(db, 'guardianSlots', data.studentId)
      const slot = await transaction.get(slotRef)
      const priorId = slot.data()?.linkId
      if (data.primary && priorId && priorId !== ref.id) {
        const priorRef = doc(db, 'studentGuardians', priorId)
        const prior = await transaction.get(priorRef)
        if (prior.exists()) oldPrimary = { ref: priorRef, data: prior.data() }
      }
      if (data.primary || priorId === ref.id) guardianSlot = { ref: slotRef, linkId: data.primary ? ref.id : '' }
    }
    for (const identifier of identifierWrites) transaction.set(identifier.ref, { studentId: identifier.studentId, updatedAt: serverTimestamp() })
    if (currentYearSlot) transaction.set(currentYearSlot.ref, { schoolYearId: currentYearSlot.schoolYearId, updatedAt: serverTimestamp(), updatedBy: actorId })
    if (oldPrimary) writeAudited(transaction, 'studentGuardians', oldPrimary.ref, { ...oldPrimary.data, primary: false }, oldPrimary.data, actorId)
    if (guardianSlot) transaction.set(guardianSlot.ref, { studentId: data.studentId, linkId: guardianSlot.linkId, updatedAt: serverTimestamp() })
    writeAudited(transaction, name, ref, data, previous, actorId)
  })
  return ref.id
}

export async function enrollStudent(input: { studentId: string; groupId: string; startDate: string; reason?: string }): Promise<void> {
  const actorId = currentActor()
  check(validDate(input.startDate), 'Selecciona una fecha válida de inscripción.')
  const newRef = doc(collection(db, 'enrollments'))
  await runTransaction(db, async (transaction) => {
    const student = await transaction.get(doc(db, 'students', input.studentId))
    const group = await transaction.get(doc(db, 'groups', input.groupId))
    check(student.exists() && student.data().status === 'active', 'Selecciona un alumno activo.')
    check(group.exists() && group.data().status === 'active', 'Selecciona un grupo activo.')
    const schoolYearId = group.data().schoolYearId as string
    const year = await transaction.get(doc(db, 'schoolYears', schoolYearId))
    check(year.exists() && year.data().status === 'active', 'El ciclo escolar debe estar activo para inscribir.')
    check(input.startDate >= year.data().startDate && input.startDate <= year.data().endDate, 'La fecha de inscripción debe quedar dentro del ciclo.')
    const slotRef = doc(db, 'enrollmentSlots', `${input.studentId}_${schoolYearId}`)
    const slot = await transaction.get(slotRef)
    const previousId = slot.data()?.currentEnrollmentId as string | undefined
    const previousRef = previousId ? doc(db, 'enrollments', previousId) : undefined
    const previous = previousRef ? (await transaction.get(previousRef)).data() : undefined
    if (!previousId && slot.data()?.previousEnrollmentId) {
      const last = await transaction.get(doc(db, 'enrollments', slot.data()!.previousEnrollmentId))
      check(!last.exists() || input.startDate >= last.data().endDate, 'El reingreso no puede ser anterior a la última baja del ciclo.')
    }
    if (previous) {
      check(previous.groupId !== input.groupId, 'El alumno ya está inscrito en este grupo.')
      check(input.startDate >= previous.startDate, 'La fecha de cambio no puede ser anterior a la inscripción vigente.')
      check((input.reason ?? '').trim().length > 0, 'Escribe el motivo del cambio de grupo.')
    }
    if (previous && previousRef) writeAudited(transaction, 'enrollments', previousRef, {
      ...previous, status: 'transferred', endDate: input.startDate, reason: input.reason?.trim() ?? '',
    }, previous, actorId, 'transfer')
    writeAudited(transaction, 'enrollments', newRef, {
      studentId: input.studentId, groupId: input.groupId, schoolYearId, startDate: input.startDate,
      endDate: '', status: 'active', reason: input.reason?.trim() ?? '',
    }, undefined, actorId, 'enroll')
    transaction.set(slotRef, {
      studentId: input.studentId, schoolYearId, currentEnrollmentId: newRef.id,
      previousEnrollmentId: previousId ?? '', updatedBy: actorId, updatedAt: serverTimestamp(),
    })
  })
}

export async function withdrawEnrollment(enrollmentId: string, endDate: string, reason: string): Promise<void> {
  const actorId = currentActor()
  check(validDate(endDate) && reason.trim().length > 0, 'Escribe una fecha válida y el motivo de baja.')
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, 'enrollments', enrollmentId)
    const snapshot = await transaction.get(ref)
    const previous = snapshot.data()
    check(previous?.status === 'active', 'La inscripción ya no está activa.')
    check(endDate >= previous.startDate, 'La baja no puede ser anterior a la inscripción.')
    const year = await transaction.get(doc(db, 'schoolYears', previous.schoolYearId))
    check(year.exists() && endDate <= year.data().endDate, 'La fecha de baja debe quedar dentro del ciclo.')
    const slotRef = doc(db, 'enrollmentSlots', `${previous.studentId}_${previous.schoolYearId}`)
    const slot = await transaction.get(slotRef)
    check(slot.data()?.currentEnrollmentId === enrollmentId, 'La inscripción cambió. Actualiza la página.')
    writeAudited(transaction, 'enrollments', ref, { ...previous, status: 'withdrawn', endDate, reason: reason.trim() }, previous, actorId, 'withdraw')
    transaction.set(slotRef, {
      studentId: previous.studentId, schoolYearId: previous.schoolYearId,
      currentEnrollmentId: '', previousEnrollmentId: enrollmentId,
      updatedBy: actorId, updatedAt: serverTimestamp(),
    })
  })
}
