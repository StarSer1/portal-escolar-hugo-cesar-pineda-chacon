import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/config/firebaseApp'
import { db } from '@/config/firebase'
import { currentActor, writeAudited } from '@/features/academic/services/academic.service'
import { buildContent, uploadLimits, type SiteRecords, type UploadFolder } from '../SiteContent'
import { defaultContent, siteSections, type SiteContent, type SiteSection } from '../school'

/*
 * Datos del editor del sitio (solo panel). A diferencia del sitio público,
 * aquí se escucha en vivo para ver al momento lo que guarde otra persona, y
 * cada guardado lleva control de versión y queda en la bitácora de actividad.
 */

export interface LiveSite {
  content: SiteContent
  revisions: Partial<Record<SiteSection, number>>
  ready: boolean
  error: string
}

export function useLiveSite(): LiveSite {
  const [state, setState] = useState<LiveSite>({ content: defaultContent, revisions: {}, ready: false, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let retry: number | undefined
    const stop = onSnapshot(collection(db, 'site'), (snapshot) => {
      const records: SiteRecords = {}
      const revisions: LiveSite['revisions'] = {}
      for (const entry of snapshot.docs) {
        if (!siteSections.includes(entry.id as SiteSection)) continue
        records[entry.id as SiteSection] = entry.data()
        revisions[entry.id as SiteSection] = Number(entry.data().revision ?? 0)
      }
      setState({ content: buildContent(records), revisions, ready: true, error: '' })
    }, () => {
      // No se marca como listo: así el editor nunca guarda encima del contenido real
      // partiendo del contenido original. Se reintenta solo.
      setState((current) => ({ ...current, error: 'No se pudo leer el contenido guardado del sitio.' }))
      retry = window.setTimeout(() => setAttempt((value) => value + 1), 5_000)
    })
    return () => { stop(); window.clearTimeout(retry) }
  }, [attempt])
  return state
}

/**
 * Guarda una sección completa. Falla si otra persona guardó la misma sección
 * después de que se empezó a editar (`expectedRevision`).
 */
export async function saveSiteSection<S extends SiteSection>(section: S, value: SiteContent[S], expectedRevision: number) {
  const actorId = currentActor()
  const clean = JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  const ref = doc(db, 'site', section)
  await runTransaction(db, async (transaction) => {
    const previous = (await transaction.get(ref)).data()
    if (Number(previous?.revision ?? 0) !== expectedRevision) {
      throw new Error('Otra persona guardó cambios en esta sección mientras la editabas. Copia lo que necesites, pulsa «Descartar» para ver la versión actual y vuelve a aplicar tus cambios.')
    }
    writeAudited(transaction, 'site', ref, clean, previous, actorId, 'update-site')
  })
}

/* --- Subida de archivos a Cloudinary --------------------------------------- */
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const signedUploads = import.meta.env.VITE_UPLOAD_SIGNING === 'signed'
export const uploadsConfigured = Boolean(cloudName && (signedUploads || uploadPreset))

interface UploadSignature { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; uploadPreset: string }
interface CloudinaryResult { secure_url: string; resource_type: string; format?: string; error?: { message: string } }

/** Con plan Blaze: la Cloud Function firma la subida y el preset deja de ser público. */
async function uploadFields(folder: UploadFolder): Promise<{ cloud: string; fields: Record<string, string> }> {
  if (!signedUploads) return { cloud: cloudName!, fields: { upload_preset: uploadPreset!, folder: `portal-escolar/${folder}` } }
  const sign = httpsCallable<{ folder: UploadFolder }, UploadSignature>(getFunctions(app, 'us-central1'), 'signCloudinaryUpload')
  const { data } = await sign({ folder })
  return {
    cloud: data.cloudName,
    fields: { api_key: data.apiKey, timestamp: String(data.timestamp), signature: data.signature, folder: data.folder, upload_preset: data.uploadPreset },
  }
}

/**
 * Sube un archivo y devuelve su dirección pública. `onProgress` recibe de 0 a 100.
 * Las fotos se entregan optimizadas (formato y calidad automáticos).
 */
export async function uploadSiteFile(file: File, folder: UploadFolder, onProgress?: (percent: number) => void) {
  const limit = uploadLimits[folder]
  if (!uploadsConfigured) throw new Error('La subida de archivos aún no está configurada: faltan los datos de Cloudinary en .env.local. Mientras tanto puedes escribir la dirección del archivo.')
  if (!limit.extensions.test(file.name)) throw new Error(folder === 'imagenes' ? 'Selecciona una foto JPG, PNG o WebP.' : `Ese tipo de archivo no se admite. Usa ${limit.label}.`)
  if (file.size > limit.bytes) throw new Error(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo es ${limit.bytes / 1024 / 1024} MB.`)

  const { cloud, fields } = await uploadFields(folder)
  const form = new FormData()
  form.append('file', file)
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `https://api.cloudinary.com/v1_1/${cloud}/auto/upload`)
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
