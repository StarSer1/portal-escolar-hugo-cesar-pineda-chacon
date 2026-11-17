/**
 * Cloud Functions del portal (requieren el plan Blaze).
 *
 * Solo hacen lo que el navegador no puede hacer de forma segura:
 * - Crear o retirar cuentas de Authentication para docentes. Así se puede
 *   desactivar el registro público de cuentas en Firebase Auth.
 * - Firmar las subidas a Cloudinary con el API secret, que nunca llega al navegador.
 *
 * Toda la información académica sigue escribiéndose desde el panel y la validan
 * las reglas de Firestore: estas funciones no escriben en Firestore.
 * Se activan en el sitio con VITE_TEACHER_PROVISIONING=functions y
 * VITE_UPLOAD_SIGNING=signed (ver docs/despliegue.md).
 */
import { createHash } from 'node:crypto'
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Pocas instancias: estas funciones las usa solo la dirección y así se limita el costo ante abusos.
setGlobalOptions({ region: 'us-central1', maxInstances: 3, memory: '256MiB' })
initializeApp()
const db = getFirestore()

const cloudinarySecret = defineSecret('CLOUDINARY_API_SECRET')
const cloudinaryKey = defineString('CLOUDINARY_API_KEY')
const cloudinaryCloud = defineString('CLOUDINARY_CLOUD_NAME')
const cloudinaryPreset = defineString('CLOUDINARY_SIGNED_PRESET')
// Cambiar a true después de activar App Check en la consola (ver docs/despliegue.md).
const enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true'

/** Misma condición que admin() en firestore.rules. */
async function requireDirector(request: CallableRequest) {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión para continuar.')
  const profile = (await db.doc(`users/${uid}`).get()).data()
  if (profile?.role !== 'admin' || profile.active !== true) throw new HttpsError('permission-denied', 'Solo la dirección puede realizar esta operación.')
  return uid
}

const emailPattern = /^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/

/** Crea la cuenta de acceso de un docente y devuelve su uid. El expediente lo guarda el panel. */
export const createTeacherAccount = onCall({ enforceAppCheck }, async (request) => {
  await requireDirector(request)
  const email = String(request.data?.email ?? '').trim().toLowerCase()
  const password = String(request.data?.password ?? '')
  if (!emailPattern.test(email) || email.length > 254) throw new HttpsError('invalid-argument', 'Escribe un correo electrónico válido.')
  if (password.length < 12 || password.length > 128) throw new HttpsError('invalid-argument', 'La contraseña inicial debe tener entre 12 y 128 caracteres.')
  const registry = (await db.doc(`teacherEmails/${email}`).get()).data()
  if (registry?.blocked) throw new HttpsError('failed-precondition', 'Este correo está reservado.')
  try {
    const user = await getAuth().createUser({ email, password, emailVerified: false, disabled: false })
    return { uid: user.uid }
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Ese correo ya tiene una cuenta en el portal.')
    if (code === 'auth/invalid-password') throw new HttpsError('invalid-argument', 'La contraseña no cumple la política de seguridad.')
    throw new HttpsError('internal', 'No se pudo crear la cuenta.')
  }
})

/**
 * Retira una cuenta recién creada cuando el alta del expediente no se completó.
 * Solo borra cuentas sin perfil de acceso y sin expediente docente vinculado.
 */
export const deleteOrphanTeacherAccount = onCall({ enforceAppCheck }, async (request) => {
  await requireDirector(request)
  const uid = String(request.data?.uid ?? '')
  if (!uid || uid.length > 128) throw new HttpsError('invalid-argument', 'Cuenta inválida.')
  const [profile, linked] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.collection('teachers').where('authUid', '==', uid).limit(1).get(),
  ])
  if (profile.exists || !linked.empty) throw new HttpsError('failed-precondition', 'La cuenta ya está vinculada a un expediente y no se borrará.')
  const user = await getAuth().getUser(uid).catch(() => null)
  if (!user) return { deleted: false }
  // Protección adicional: solo cuentas creadas hace menos de una hora.
  if (Date.now() - new Date(user.metadata.creationTime).getTime() > 60 * 60_000) throw new HttpsError('failed-precondition', 'La cuenta no es reciente; revísala en la consola de Firebase.')
  await getAuth().deleteUser(uid)
  return { deleted: true }
})

const uploadFolders = ['documentos', 'imagenes'] as const

/** Firma una subida a Cloudinary válida por una hora, solo para la dirección. */
export const signCloudinaryUpload = onCall({ enforceAppCheck, secrets: [cloudinarySecret] }, async (request) => {
  await requireDirector(request)
  const folder = String(request.data?.folder ?? '')
  if (!uploadFolders.includes(folder as typeof uploadFolders[number])) throw new HttpsError('invalid-argument', 'Carpeta no permitida.')
  const params = { folder: `portal-escolar/${folder}`, timestamp: Math.floor(Date.now() / 1000), upload_preset: cloudinaryPreset.value() }
  // Cloudinary firma los parámetros en orden alfabético: clave=valor unidos por & más el secreto.
  const payload = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&')
  const signature = createHash('sha1').update(payload + cloudinarySecret.value()).digest('hex')
  return {
    cloudName: cloudinaryCloud.value(), apiKey: cloudinaryKey.value(), timestamp: params.timestamp,
    signature, folder: params.folder, uploadPreset: params.upload_preset,
  }
})
