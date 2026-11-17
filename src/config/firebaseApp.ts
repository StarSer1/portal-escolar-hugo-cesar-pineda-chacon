import { initializeApp } from 'firebase/app'

/**
 * Aplicación de Firebase compartida. Este módulo no carga Auth ni el SDK
 * completo de Firestore: el sitio público solo usa Firestore Lite y así
 * descarga mucho menos código. El panel y el área docente usan `firebase.ts`.
 */
export const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'
// Tests use an isolated demo project: never send synthetic records to production.
if (useEmulators && !import.meta.env.VITE_FIREBASE_PROJECT_ID?.startsWith('demo-')) {
  throw new Error('Los emuladores requieren un proyecto con prefijo demo-.')
}

/*
 * App Check (opcional): solo se activa si existe la clave de reCAPTCHA Enterprise.
 * Comprueba que las peticiones vienen del sitio real y no de scripts. Ver docs/despliegue.md.
 */
const appCheckKey = import.meta.env.VITE_APPCHECK_SITE_KEY
if (appCheckKey && !useEmulators) {
  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check')
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckKey), isTokenAutoRefreshEnabled: true })
}
