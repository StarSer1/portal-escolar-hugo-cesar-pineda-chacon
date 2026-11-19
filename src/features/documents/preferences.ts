import { useEffect, useState } from 'react'

export const ALL = '__todos__'
export const DIRECTOR_KEY = 'documentos.director'
export const DEFAULT_DIRECTOR = 'C. Profr. Armando Duarte Sánchez'

/** Valores que el director no quiere volver a escribir en cada documento. */
export function useRemembered(key: string, initial: string) {
  const [value, setValue] = useState(() => { try { return localStorage.getItem(key) ?? initial } catch { return initial } })
  useEffect(() => { try { localStorage.setItem(key, value) } catch { /* sin almacenamiento */ } }, [key, value])
  return [value, setValue] as const
}
