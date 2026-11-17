/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  /** Cuenta de Cloudinary y preset sin firma para los archivos del sitio público. */
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string
  /** "signed" usa la Cloud Function signCloudinaryUpload (requiere plan Blaze). */
  readonly VITE_UPLOAD_SIGNING?: 'unsigned' | 'signed'
  /** "functions" crea las cuentas docentes con la Cloud Function createTeacherAccount (requiere plan Blaze). */
  readonly VITE_TEACHER_PROVISIONING?: 'browser' | 'functions'
  /** Clave de reCAPTCHA Enterprise para App Check (opcional). */
  readonly VITE_APPCHECK_SITE_KEY?: string
  /** Dirección pública del sitio, usada en sitemap.xml y etiquetas para redes sociales. */
  readonly VITE_SITE_URL?: string
  readonly VITE_USE_EMULATORS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
