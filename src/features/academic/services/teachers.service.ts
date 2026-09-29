import { deleteApp, getApp, initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, initializeAuth, inMemoryPersistence, signOut, type User } from 'firebase/auth'
import { collection, doc, getDoc, getDocFromServer, getDocs, runTransaction, serverTimestamp, type DocumentData } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import type { ActiveStatus, TeacherSpecialty } from '@/types/models'
import { currentActor, writeAudited } from './academic.service'

export interface TeacherInput {
  name: string
  email: string
  phone: string
  specialty: TeacherSpecialty
  status: ActiveStatus
  revision?: number
}
export function normalizeTeacherEmail(email: string) { return email.trim().toLowerCase() }

async function validateTeacher(input: TeacherInput, id?: string) {
  const data = {
    name: input.name.trim(), email: normalizeTeacherEmail(input.email), phone: input.phone.trim(),
    specialty: input.specialty, status: input.status,
  }
  if (!data.name || data.name.length > 160) throw new Error('Escribe el nombre del docente (máximo 160 caracteres).')
  if (!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(data.email) || data.email.length > 254) throw new Error('Escribe un correo electrónico válido y personal del docente.')
  if (data.phone.length > 40) throw new Error('El teléfono admite hasta 40 caracteres.')
  if (!['general', 'physical', 'english', 'arts'].includes(data.specialty)) throw new Error('Selecciona una especialidad válida.')
  if (!['active', 'inactive'].includes(data.status)) throw new Error('Selecciona un estado válido.')
  // This additional check recognizes unnormalized legacy records. Transactions
  // and teacherEmails enforce concurrent uniqueness for all new writes.
  const teachers = await getDocs(collection(db, 'teachers'))
  if (teachers.docs.some((record) => record.id !== id && normalizeTeacherEmail(String(record.data().email ?? '')) === data.email)) {
    throw new Error('Este correo ya está asignado a otro docente. Cada docente necesita un correo único.')
  }
  return data
}

/** Password is sent only to Firebase Authentication, never Firestore or logs. */
export async function saveTeacher(input: TeacherInput, options: { id?: string; password?: string } = {}) {
  const actorId = currentActor()
  const profile = await getDoc(doc(db, 'users', actorId))
  if (profile.data()?.role !== 'admin' || profile.data()?.active !== true) throw new Error('Solo dirección puede administrar cuentas docentes.')
  const data = await validateTeacher(input, options.id)
  const ref = options.id ? doc(db, 'teachers', options.id) : doc(collection(db, 'teachers'))
  const original = options.id ? (await getDoc(ref)).data() : undefined
  if (options.id && !original) throw new Error('El docente ya no existe. Actualiza la página.')
  if (original?.authUid && options.password !== undefined) throw new Error('Este docente ya tiene cuenta. Su contraseña no se consulta ni se reemplaza desde este formulario.')
  if (!options.id && options.password === undefined) throw new Error('Asigna una contraseña inicial para crear el acceso docente.')
  if (options.password !== undefined && (options.password.length < 12 || options.password.length > 128)) {
    throw new Error('La contraseña inicial debe tener entre 12 y 128 caracteres.')
  }
  if (original?.authUid && original.email !== data.email) throw new Error('El correo de una cuenta habilitada no puede cambiarse desde el expediente.')
  const registry = await getDoc(doc(db, 'teacherEmails', data.email))
  if (registry.exists() && (registry.data().blocked || (registry.data().teacherId && registry.data().teacherId !== ref.id))) {
    throw new Error('Este correo ya está reservado o pertenecía a registros de prueba repetidos. Usa un correo personal diferente.')
  }

  const secondary = options.password !== undefined ? initializeApp(getApp().options, `teacher-provision-${crypto.randomUUID()}`) : undefined
  const secondaryAuth = secondary ? initializeAuth(secondary, { persistence: inMemoryPersistence }) : undefined
  let createdUser: User | undefined
  let committed = false
  try {
    if (secondaryAuth && options.password !== undefined) {
      if (import.meta.env.VITE_USE_EMULATORS === 'true') connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
      // This isolated, memory-only Auth instance cannot replace the director's session.
      const result = await createUserWithEmailAndPassword(secondaryAuth, data.email, options.password)
      createdUser = result.user
    }
    await runTransaction(db, async (transaction) => {
      const previous = (await transaction.get(ref)).data()
      if (options.id && !previous) throw new Error('El docente ya no existe.')
      if (!options.id && previous) throw new Error('El registro ya existe. Actualiza la página.')
      if (input.revision !== undefined && previous?.revision !== input.revision) throw new Error('Otra persona modificó el docente. Actualiza y vuelve a intentarlo.')
      if (previous && (previous.authUid ?? '') !== (original?.authUid ?? '')) throw new Error('La cuenta del docente cambió. Actualiza la página.')
      if (previous && previous.specialty !== data.specialty) throw new Error('La especialidad original se conserva para proteger las asignaciones.')
      if (previous?.authUid && previous.email !== data.email) throw new Error('No se puede cambiar el correo de una cuenta habilitada.')
      const emailRef = doc(db, 'teacherEmails', data.email)
      const emailSlot = await transaction.get(emailRef)
      if (emailSlot.exists() && (emailSlot.data().blocked || (emailSlot.data().teacherId && emailSlot.data().teacherId !== ref.id))) throw new Error('Este correo ya está reservado por otro docente.')
      const oldEmail = normalizeTeacherEmail(previous?.email ?? '')
      const oldRef = oldEmail && oldEmail !== data.email && !oldEmail.includes('/') ? doc(db, 'teacherEmails', oldEmail) : undefined
      const oldSlot = oldRef ? (await transaction.get(oldRef)).data() : undefined
      const authUid = createdUser?.uid ?? previous?.authUid ?? ''
      const userRef = authUid ? doc(db, 'users', authUid) : undefined
      const userProfile = userRef ? (await transaction.get(userRef)).data() : undefined
      if (createdUser && userProfile) throw new Error('La cuenta ya está vinculada. No se reemplazará su perfil de acceso.')
      if (!createdUser && userRef && (!userProfile || userProfile.role !== 'teacher' || userProfile.teacherId !== ref.id)) {
        throw new Error('El perfil de acceso está incompleto. Solicita una revisión de la cuenta antes de editarla.')
      }
      if (auth.currentUser?.uid !== actorId) throw new Error('Tu sesión cambió. Inicia sesión como director nuevamente.')
      transaction.set(emailRef, { teacherId: ref.id, blocked: false, updatedAt: serverTimestamp(), updatedBy: actorId })
      if (oldRef && oldSlot?.teacherId === ref.id && !oldSlot.blocked) {
        transaction.set(oldRef, { teacherId: '', blocked: false, updatedAt: serverTimestamp(), updatedBy: actorId })
      }
      writeAudited(transaction, 'teachers', ref, { ...data, authUid }, previous, actorId)
      if (userRef) {
        const nextProfile: DocumentData = {
          role: 'teacher', teacherId: ref.id, displayName: data.name, email: data.email, active: data.status === 'active',
          createdAt: userProfile?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: actorId,
        }
        transaction.set(userRef, nextProfile)
      }
    })
    committed = true
    return { id: ref.id, accountCreated: !!createdUser }
  } catch (error) {
    if (createdUser && !committed) {
      // Auth and Firestore cannot share a transaction. Confirm the final state
      // before compensating, including a possibly lost commit response.
      try {
        const [savedProfile, savedTeacher] = await Promise.all([
          getDocFromServer(doc(db, 'users', createdUser.uid)), getDocFromServer(ref),
        ])
        if (savedProfile.data()?.teacherId === ref.id && savedTeacher.data()?.authUid === createdUser.uid) {
          committed = true
          return { id: ref.id, accountCreated: true }
        }
        if (!savedProfile.exists() && savedTeacher.data()?.authUid !== createdUser.uid) await deleteUser(createdUser)
        else throw new Error('Estado de la cuenta requiere revisión')
      } catch {
        throw new Error('No se pudo confirmar el alta ni completar su recuperación. Dirección debe revisar este correo en Firebase Authentication antes de volver a intentarlo. No se guardó ninguna contraseña en el expediente.')
      }
    }
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'auth/email-already-in-use') throw new Error('Ese correo ya tiene una cuenta en el portal. No se creará otra ni se reemplazará su contraseña.')
    if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') throw new Error('La contraseña no cumple la política de seguridad. Usa una contraseña más larga y revisa los requisitos de Firebase.')
    throw error
  } finally {
    if (secondaryAuth) await signOut(secondaryAuth).catch(() => {})
    if (secondary) await deleteApp(secondary).catch(() => {})
  }
}
