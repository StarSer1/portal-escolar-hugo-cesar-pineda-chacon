import { useState, type ReactNode } from 'react'
import { Icon } from '@/shared/components/Icon'
import variants from '../imageVariants.json'
import { useSite } from '../SiteContent'

const widths = [640, 1280, 1920]
const localVariants = variants as Record<string, number[]>

/**
 * Versiones más ligeras de una foto para que cada pantalla descargue solo el
 * tamaño que necesita:
 * - Fotos del sitio (/img/…): versiones WebP generadas con `npm run optimize:images`.
 * - Fotos de Cloudinary: el propio servicio entrega el ancho pedido.
 */
function sourceSet(src: string) {
  const local = localVariants[src]
  if (local?.length) return local.map((width) => `${src.replace(/\.[a-z]+$/i, '')}-${width}.webp ${width}w`).join(', ')
  const cloudinary = src.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:f_auto,q_auto\/)?(.+)$/)
  if (cloudinary && !/\.pdf$/i.test(src)) return widths.map((width) => `${cloudinary[1]}f_auto,q_auto,c_limit,w_${width}/${cloudinary[2]} ${width}w`).join(', ')
  return undefined
}

/**
 * Fotografía del sitio. Si el archivo no existe muestra `fallback` o un recuadro "Foto pendiente".
 * `priority` se usa solo en la foto principal de la página para que cargue primero.
 */
export function Photo({ src, alt, className, eager = false, priority = false, sizes = '(max-width: 900px) 100vw, 50vw', fallback }: {
  src: string; alt: string; className?: string; eager?: boolean; priority?: boolean; sizes?: string; fallback?: ReactNode
}) {
  // Se guarda qué dirección falló: si el director la corrige, la foto vuelve a intentarse.
  const [failed, setFailed] = useState('')
  // Hasta que llega el contenido publicado no se descargan las fotos originales de ejemplo.
  const { ready } = useSite()
  if (!ready) return <span className={['photo-loading', className].filter(Boolean).join(' ')} aria-hidden="true" />
  const missing = !src || failed === src
  if (missing && fallback) return <>{fallback}</>
  if (missing) return <div className={['photo-missing', className].filter(Boolean).join(' ')} role="img" aria-label={`${alt || 'Foto'} (pendiente)`}>
    <Icon name="image" size={28} /><span>Foto pendiente</span>
  </div>
  const srcSet = sourceSet(src)
  return <img className={className} src={src} srcSet={srcSet} sizes={srcSet ? sizes : undefined} alt={alt}
    loading={eager || priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : undefined}
    onError={() => setFailed(src)} />
}
