import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { collection, connectFirestoreEmulator, getDocs, getFirestore } from 'firebase/firestore/lite'
import { app, useEmulators } from '@/config/firebaseApp'
import { safeUrl } from '@/shared/safeUrl'
import { defaultContent, eventKinds, siteSections, type SiteContent, type SiteSection } from './school'

/*
 * Contenido del sitio público.
 *
 * Para aguantar picos de visitas, cada visitante lee la colección `site` una
 * sola vez (7 documentos como máximo) con Firestore Lite: sin conexión en vivo
 * y sin descargar el SDK completo. El último contenido recibido se guarda en el
 * navegador y se muestra de inmediato en la siguiente visita.
 * El editor del panel usa su propia escucha en vivo (admin/siteStore.ts).
 */

const liteDb = getFirestore(app)
if (useEmulators) connectFirestoreEmulator(liteDb, '127.0.0.1', 8080)

export type SiteRecords = Partial<Record<SiteSection, Record<string, unknown>>>

interface SiteState {
  content: SiteContent
  /** Hay contenido real (de la base o de la caché local) y ya se puede mostrar. */
  ready: boolean
  error: string
}

const SiteContext = createContext<SiteState>({ content: defaultContent, ready: false, error: '' })

/* --- Normalización ----------------------------------------------------------
 * Un documento incompleto, antiguo o alterado nunca rompe el sitio: se toman
 * solo los campos conocidos con el tipo correcto y las direcciones se sanean.
 */
const str = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const list = (value: unknown) => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as Record<string, unknown>[] : []

function mergeSection<T extends object>(fallback: T, data: Record<string, unknown> | undefined): T {
  if (!data) return fallback
  const result = { ...fallback } as Record<string, unknown>
  for (const [key, original] of Object.entries(fallback)) {
    const value = data[key]
    if (Array.isArray(original) ? Array.isArray(value) : typeof value === typeof original && value !== null) result[key] = value
  }
  return result as T
}

function normalize(content: SiteContent): SiteContent {
  const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  const { general, images, home, gallery, students, calendar, documents } = content
  return {
    general: {
      ...general,
      facebook: safeUrl(general.facebook), instagram: safeUrl(general.instagram),
      shifts: list(general.shifts).map((shift) => ({ name: str(shift.name), days: str(shift.days), hours: str(shift.hours) })),
    },
    images: Object.fromEntries(Object.entries(images).map(([key, value]) => [key, safeUrl(value)])) as unknown as SiteContent['images'],
    home: {
      ...home,
      slides: list(home.slides).map((slide) => ({
        tag: str(slide.tag), title: str(slide.title), subtitle: str(slide.subtitle), text: str(slide.text),
        image: safeUrl(slide.image), actionLabel: str(slide.actionLabel), actionHref: safeUrl(slide.actionHref),
      })),
    },
    gallery: { photos: list(gallery.photos).map((photo) => ({ src: safeUrl(photo.src), alt: str(photo.alt) })).filter((photo) => photo.src) },
    students: {
      ...students,
      grades: list(students.grades).map((grade) => ({
        grade: typeof grade.grade === 'number' ? grade.grade : 0,
        teachers: list(grade.teachers).map((teacher) => ({ name: str(teacher.name), role: str(teacher.role), group: str(teacher.group) })),
      })),
      roles: list(students.roles).map((role) => ({ title: str(role.title), text: str(role.text), photo: safeUrl(role.photo), color: str(role.color, 'blue') })),
    },
    calendar: {
      examples: calendar.examples, pdf: safeUrl(calendar.pdf),
      events: list(calendar.events)
        .filter((event) => validDate(event.date) && str(event.kind) in eventKinds && typeof event.title === 'string')
        .map((event) => ({
          date: event.date as string, kind: event.kind as SiteContent['calendar']['events'][number]['kind'],
          title: str(event.title), detail: str(event.detail),
          ...(validDate(event.end) && event.end >= (event.date as string) ? { end: event.end } : {}),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    },
    documents: {
      categories: list(documents.categories).map((category) => ({ name: str(category.name), icon: str(category.icon, 'file'), description: str(category.description) })),
      files: list(documents.files).map((file) => ({ id: str(file.id), title: str(file.title), category: str(file.category), href: safeUrl(file.href), updated: str(file.updated) }))
        .filter((file) => file.href && file.title),
    },
  }
}

/** Arma el contenido completo a partir de los documentos guardados (los que falten usan los valores originales). */
export function buildContent(records: SiteRecords, override?: Partial<Record<SiteSection, unknown>>): SiteContent {
  const merged = Object.fromEntries(siteSections.map((section) => {
    const source = (override?.[section] ?? records[section]) as Record<string, unknown> | undefined
    return [section, mergeSection(defaultContent[section], source)]
  })) as unknown as SiteContent
  return normalize(merged)
}

/* --- Caché local --------------------------------------------------------- */
const cacheKey = 'sitio-contenido-v1'
function readCache(): SiteRecords | null {
  try {
    const raw = localStorage.getItem(cacheKey)
    const parsed = raw ? JSON.parse(raw) as { records?: SiteRecords } : null
    return parsed?.records && typeof parsed.records === 'object' ? parsed.records : null
  } catch { return null }
}
function writeCache(records: SiteRecords) {
  try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), records })) } catch { /* sin almacenamiento */ }
}

/* --- Vista previa -----------------------------------------------------------
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
  const [override, setOverride] = useState<Partial<Record<SiteSection, unknown>> | null>(null)
  useEffect(() => {
    if (!isPreviewFrame()) return
    const receive = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'site-preview') return
      const { section, value } = event.data
      if (!siteSections.includes(section) || !value || typeof value !== 'object') return
      setOverride({ [section]: value })
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

/* --- Proveedor ----------------------------------------------------------- */
const retryDelays = [2_000, 5_000, 15_000, 30_000, 60_000]
const refreshAfter = 10 * 60_000

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<SiteRecords | null>(readCache)
  const [error, setError] = useState('')
  const [failed, setFailed] = useState(false)
  const override = usePreviewOverride()

  useEffect(() => {
    let disposed = false
    let timer: number | undefined
    let lastFetch = 0
    async function load(attempt = 0) {
      window.clearTimeout(timer)
      lastFetch = Date.now()
      try {
        const snapshot = await getDocs(collection(liteDb, 'site'))
        if (disposed) return
        const next = Object.fromEntries(snapshot.docs.filter((entry) => siteSections.includes(entry.id as SiteSection)).map((entry) => [entry.id, entry.data()])) as SiteRecords
        setRecords(next); setError(''); setFailed(false)
        writeCache(next)
      } catch {
        if (disposed) return
        // Sin conexión o servicio saturado: se sigue mostrando lo último conocido y se reintenta.
        setError('No se pudo actualizar el contenido del sitio.')
        setFailed(true)
        if (attempt < retryDelays.length) timer = window.setTimeout(() => void load(attempt + 1), retryDelays[attempt])
      }
    }
    // Al volver a la pestaña después de un rato, se buscan cambios.
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - lastFetch > refreshAfter) void load() }
    void load()
    document.addEventListener('visibilitychange', onVisible)
    return () => { disposed = true; window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const value = useMemo<SiteState>(() => ({
    content: buildContent(records ?? {}, override ?? undefined),
    // Si nunca se pudo leer la base ni hay caché, se muestra el contenido original.
    ready: records !== null || failed,
    error,
  }), [records, override, failed, error])
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export const useSite = () => useContext(SiteContext)

/* --- Archivos (Cloudinary) -------------------------------------------------
 * Los documentos y fotos que sube el director se guardan en Cloudinary. La
 * subida está en admin/siteStore.ts; aquí solo quedan los límites, que también
 * usa el editor. Ver docs/cloudinary.md.
 */
export const uploadLimits = {
  documentos: { bytes: 25 * 1024 * 1024, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*', extensions: /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|webp|gif)$/i, label: 'PDF, Word, Excel, PowerPoint o imagen de hasta 25 MB' },
  imagenes: { bytes: 10 * 1024 * 1024, accept: 'image/jpeg,image/png,image/webp,image/gif', extensions: /\.(jpe?g|png|webp|gif)$/i, label: 'JPG, PNG o WebP de hasta 10 MB' },
} as const
export type UploadFolder = keyof typeof uploadLimits
