export function errorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (code.includes('permission-denied')) return 'No tienes permiso para esta operación o los datos no cumplen las reglas. Verifica tus selecciones y tu acceso administrativo.'
  if (code.includes('unavailable') || code.includes('network-request-failed')) return 'No hay conexión con el servicio. Comprueba tu conexión e inténtalo de nuevo.'
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'El correo o la contraseña no son correctos.'
  if (code.includes('too-many-requests')) return 'Se han realizado demasiados intentos. Espera unos minutos antes de continuar.'
  if (code.includes('auth/')) return 'No se pudo iniciar sesión. Verifica tus datos e inténtalo de nuevo.'
  return error instanceof Error ? error.message : 'No se pudo completar la operación. Inténtalo de nuevo.'
}
