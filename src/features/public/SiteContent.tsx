import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { defaultContent, eventKinds, siteSections, type SiteContent, type SiteSection } from './school'

interface SiteState {
  content: SiteContent
  /** Secciones que ya se guardaron alguna vez desde el panel. */
  saved: Partial<Record<SiteSection, boolean>>
  ready: boolean
  error: string
}

const SiteContext = createContext<SiteState>({ content: defaultContent, saved: {}, ready: false, error: '' })

/**
 * Toma de un documento de Firestore solo los campos que existen en el valor
 * predeterminado y con el mismo tipo; lo demás conserva el valor original.
 * Así un documento incompleto o antiguo nunca rompe el sitio.
 */
function mergeSection<T extends object>(fallback: T, data: Record<string, unknown> | undefined): T {
  if (!data) return fallback
  const result = { ...fallback } as Record<string, unknown>
  for (const [key, original] of Object.entries(fallback)) {
    const value = data[key]
    if (Array.isArray(original) ? Array.isArray(value) : typeof value === typeof original && value !== null) result[key] = value
  }
  return result as T
}

function sanitize(content: SiteContent): SiteContent {
  const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  const events = content.calendar.events
    .filter((event) => validDate(event.date) && event.kind in eventKinds && typeof event.title === 'string')
    .map((event) => validDate(event.end) && event.end! >= event.date ? event : { ...event, end: undefined })
    .sort((a, b) => a.date.localeCompare(b.date))
  return { ...content, calendar: { ...content.calendar, events } }
}

/* --- Vista previa ---------------------------------------------------------
 * El editor muestra el sitio real dentro de un iframe con este nombre. Esa
 * copia del sitio recibe por postMessage el borrador de la sección que se
 * edita y lo muestra en lugar del contenido publicado. Nada se guarda.
 */
export const previewFrameName = 'vista-previa-sitio'
export type PreviewMessage =
  | { type: 'site-preview'; section: SiteSection; value: unknown }
  | { type: 'site-preview-ready' }

const isPreviewFrame = () => typeof window !== 'undefined' && window.name === previewFrameName && window.parent !== window

function usePreviewOverride() {
  const [override, setOverride] = useState<Partial<SiteContent> | null>(null)
  useEffect(() => {
    if (!isPreviewFrame()) return
    const receive = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'site-preview') return
      const { section, value } = event.data
      if (!siteSections.includes(section) || !value || typeof value !== 'object') return
      setOverride({ [section]: mergeSection(defaultContent[section], value as Record<string, unknown>) })
    }
    // En la vista previa no se sale del sitio público ni se abren llamadas o correos.
    const block = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link || link.target === '_blank') return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin || /^\/(iniciar-sesion|panel|docente)/.test(url.pathname)) event.preventDefault()
    }
    window.addEventListener('message', receive)
    document.addEventListener('click', block, true)
    window.parent.postMessage({ type: 'site-preview-ready' } satisfies PreviewMessage, window.location.origin)
    return () => { window.removeEventListener('message', receive); document.removeEventListener('click', block, true) }
  }, [])
  return override
}

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SiteState>({ content: defaultContent, saved: {}, ready: false, error: '' })
  const override = usePreviewOverride()
  useEffect(() => onSnapshot(collection(db, 'site'), (snapshot) => {
    const records = new Map(snapshot.docs.map((entry) => [entry.id, entry.data()]))
    const content = Object.fromEntries(siteSections.map((section) => [section, mergeSection(defaultContent[section], records.get(section))])) as unknown as SiteContent
    setState({ content: sanitize(content), saved: Object.fromEntries(siteSections.map((section) => [section, records.has(section)])), ready: true, error: '' })
  }, () => {
    // Sin conexión o sin reglas publicadas: el sitio sigue mostrando el contenido predeterminado.
    setState((current) => ({ ...current, ready: true, error: 'No se pudo cargar el contenido guardado del sitio.' }))
  }), [])
  const value = useMemo(() => override ? { ...state, content: sanitize({ ...state.content, ...override }) } : state, [state, override])
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export const useSite = () => useContext(SiteContext)

/** Guarda una sección completa del sitio. */
export async function saveSiteSection<S extends SiteSection>(section: S, value: SiteContent[S]) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Tu sesión terminó. Vuelve a iniciar sesión para guardar.')
  const clean = JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  await setDoc(doc(db, 'site', section), { ...clean, updatedAt: serverTimestamp(), updatedBy: uid })
}

/* --- Archivos (Cloudinary) -------------------------------------------------
 * Los documentos y fotos que sube el director se guardan en Cloudinary con un
 * "upload preset" sin firma. Las restricciones de tipo y tamaño también deben
 * configurarse en ese preset (ver docs/cloudinary.md).
 */
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
export const uploadsConfigured = Boolean(cloudName && uploadPreset)

export const uploadLimits = {
  documentos: { bytes: 25 * 1024 * 1024, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*', extensions: /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|webp|gif)$/i, label: 'PDF, Word, Excel, PowerPoint o imagen de hasta 25 MB' },
  imagenes: { bytes: 10 * 1024 * 1024, accept: 'image/jpeg,image/png,image/webp,image/gif', extensions: /\.(jpe?g|png|webp|gif)$/i, label: 'JPG, PNG o WebP de hasta 10 MB' },
} as const
export type UploadFolder = keyof typeof uploadLimits

interface CloudinaryResult { secure_url: string; resource_type: string; format?: string; error?: { message: string } }

/**
 * Sube un archivo y devuelve su dirección pública. `onProgress` recibe de 0 a 100.
 * Las fotos se entregan optimizadas (formato y calidad automáticos).
 */
export function uploadSiteFile(file: File, folder: UploadFolder, onProgress?: (percent: number) => void) {
  const limit = uploadLimits[folder]
  if (!uploadsConfigured) return Promise.reject(new Error('La subida de archivos aún no está configurada: faltan los datos de Cloudinary en .env.local. Mientras tanto puedes escribir la dirección del archivo.'))
  if (!limit.extensions.test(file.name)) return Promise.reject(new Error(folder === 'imagenes' ? 'Selecciona una foto JPG, PNG o WebP.' : `Ese tipo de archivo no se admite. Usa ${limit.label}.`))
  if (file.size > limit.bytes) return Promise.reject(new Error(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo es ${limit.bytes / 1024 / 1024} MB.`))

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', uploadPreset!)
  form.append('folder', `portal-escolar/${folder}`)
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`)
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)) }
    request.onerror = () => reject(new Error('No se pudo conectar con el servicio de archivos. Revisa tu conexión e inténtalo de nuevo.'))
    request.onload = () => {
      let result: CloudinaryResult | null = null
      try { result = JSON.parse(request.responseText) as CloudinaryResult } catch { /* respuesta inesperada */ }
      if (request.status >= 300 || !result?.secure_url) return reject(new Error(`No se pudo subir el archivo${result?.error?.message ? `: ${result.error.message}` : '.'}`))
      const optimize = result.resource_type === 'image' && result.format !== 'pdf'
      resolve(optimize ? result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/') : result.secure_url)
    }
    request.send(form)
  })
}
