import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { app, useEmulators } from './firebaseApp'

/*
 * Servicios del panel y del área docente. No se activa la caché persistente de
 * Firestore a propósito: guardaría datos personales de alumnos en el navegador,
 * y en la escuela las computadoras son compartidas.
 */
export const auth = getAuth(app)
export const db = getFirestore(app)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
