/**
 * Direcciones que el director escribe en el sitio (enlaces, fotos, documentos).
 * Solo se aceptan rutas internas del sitio (/documentos/…) y direcciones
 * https:, mailto: o tel:. Todo lo demás (javascript:, data:, http:, //otro-sitio)
 * se descarta para evitar redirecciones engañosas o código malicioso.
 */
export function safeUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const url = value.trim()
  if (!url || url.length > 2000 || /[\s\\<>"]/.test(url.replace(/ /g, '%20'))) return ''
  // Ruta interna: "/algo", nunca "//dominio" (que el navegador trata como externo).
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && parsed.hostname) return url
    if (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:') return url
  } catch { /* no es una dirección válida */ }
  return ''
}

/** Para validar en formularios: vacío o una dirección permitida. */
export const isAllowedUrl = (value: string) => !value.trim() || safeUrl(value) !== ''

export const isExternalUrl = (value: string) => /^https:\/\//i.test(value)

export const allowedUrlHint = 'Usa una dirección que empiece con https:// o una ruta del sitio como /documentos/archivo.pdf.'
