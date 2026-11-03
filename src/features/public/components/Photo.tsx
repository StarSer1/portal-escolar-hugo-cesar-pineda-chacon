import { useState, type ReactNode } from 'react'
import { Icon } from '@/shared/components/Icon'

/** Fotografía del sitio; si el archivo aún no existe en public/img muestra `fallback` o un recuadro "Foto pendiente". */
export function Photo({ src, alt, className, eager = false, fallback }: { src: string; alt: string; className?: string; eager?: boolean; fallback?: ReactNode }) {
  const [missing, setMissing] = useState(false)
  if (missing && fallback) return <>{fallback}</>
  if (missing) return <div className={['photo-missing', className].filter(Boolean).join(' ')} role="img" aria-label={`${alt} (foto pendiente)`}>
    <Icon name="image" size={28} /><span>Foto pendiente</span>
  </div>
  return <img className={className} src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setMissing(true)} />
}
