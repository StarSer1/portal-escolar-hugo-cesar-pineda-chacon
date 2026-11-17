import { Component, type ErrorInfo, type ReactNode } from 'react'

const reloadFlag = 'recarga-por-version'
/** Tras publicar una versión nueva, una pestaña abierta puede pedir archivos que ya no existen. */
const isStaleBundle = (error: Error) => /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError/i.test(error.message)

/**
 * Evita la pantalla en blanco si algo falla al mostrar una página: ofrece
 * recargar. Si el fallo se debe a una versión nueva del sitio, recarga sola una vez.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isStaleBundle(error)) {
      try {
        if (!sessionStorage.getItem(reloadFlag)) { sessionStorage.setItem(reloadFlag, '1'); window.location.reload(); return }
      } catch { /* sin almacenamiento */ }
    }
    console.error('Error al mostrar la página', error, info.componentStack)
  }

  componentDidMount() {
    try { sessionStorage.removeItem(reloadFlag) } catch { /* sin almacenamiento */ }
  }

  render() {
    if (!this.state.error) return this.props.children
    return <main className="session-screen" role="alert">
      <div className="session-card">
        <img className="school-emblem" src="/escudo-96.png" width={48} height={48} alt="" />
        <h1>Algo salió mal</h1>
        <p>No pudimos mostrar esta página. Recarga para intentarlo de nuevo; si el problema continúa, vuelve más tarde.</p>
        <div className="row-actions">
          <a className="btn btn-secondary" href="/">Ir al inicio</a>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Recargar</button>
        </div>
      </div>
    </main>
  }
}

export function PageLoading() {
  return <div className="route-loading" role="status"><span className="spinner" aria-hidden="true" /><span className="sr-only">Cargando…</span></div>
}
