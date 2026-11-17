import { useEffect } from 'react'

const siteName = 'Escuela Primaria Hugo César Piñeda Chacón'

/**
 * Título de la pestaña del navegador (también lo leen buscadores y lectores de pantalla).
 * `null` deja el título como está (otra parte de la página lo define).
 */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    if (title === null) return
    document.title = title ? `${title} · ${siteName}` : siteName
  }, [title])
}

/** Indica a los buscadores que no indexen la página actual (panel, login, área docente). */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}
