import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@/shared/components/Icon'
import { IconButton } from '@/shared/ui/Button'
import { SegmentedControl } from '@/shared/ui/Tabs'
import { previewFrameName, type PreviewMessage } from '../SiteContent'
import type { SiteSection } from '../school'

type Device = 'desktop' | 'mobile'
const deviceWidth: Record<Device, number> = { desktop: 1280, mobile: 390 }

export interface PreviewPage { path: string; label: string }

/**
 * Muestra el sitio público real dentro de un iframe, con el borrador de la
 * sección que se edita en lugar del contenido publicado. Se actualiza con cada
 * cambio, antes de guardar. El editor le da una key por sección para que
 * empiece en la página que le corresponde.
 */
export function SitePreview({ section, value, dirty, pages, onClose }: {
  section: SiteSection; value: unknown; dirty: boolean; pages: PreviewPage[]; onClose: () => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(pages[0].path)
  const [device, setDevice] = useState<Device>(() => window.matchMedia('(max-width: 640px)').matches ? 'mobile' : 'desktop')
  const [ready, setReady] = useState(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const latest = useRef({ section, value })

  const send = useCallback(() => {
    const message: PreviewMessage = { type: 'site-preview', ...latest.current }
    frame.current?.contentWindow?.postMessage(message, window.location.origin)
  }, [])

  useEffect(() => { latest.current = { section, value }; send() }, [section, value, send])
  useEffect(() => {
    const receive = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'site-preview-ready') return
      send()
      setReady(true)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [send])

  useLayoutEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const width = deviceWidth[device]
  const scale = size.width ? Math.min(1, size.width / width) : 1
  const options = pages.some((item) => item.path === page) ? pages : [{ path: page, label: 'Otra página' }, ...pages]

  return <aside className="site-preview" aria-label="Vista previa del sitio">
    <div className="site-preview-bar">
      <div className="site-preview-title">
        <strong><Icon name="globe" size={18} />Vista previa</strong>
        <span className={dirty ? 'site-preview-badge is-draft' : 'site-preview-badge'}>{dirty ? 'Con cambios sin guardar' : 'Igual a lo publicado'}</span>
      </div>
      <div className="site-preview-tools">
        <label className="site-preview-page">
          <span className="sr-only">Página que se muestra</span>
          <select value={page} onChange={(event) => { setReady(false); setPage(event.target.value) }}>
            {options.map((item) => <option key={item.path} value={item.path}>{item.label}</option>)}
          </select>
        </label>
        <SegmentedControl label="Tamaño de pantalla" value={device} onChange={setDevice}
          options={[{ value: 'desktop', label: 'Computadora' }, { value: 'mobile', label: 'Celular' }]} />
        <IconButton icon="refresh" label="Recargar la vista previa" onClick={() => { setReady(false); frame.current?.contentWindow?.location.reload() }} />
        <IconButton className="site-preview-close" icon="close" label="Cerrar la vista previa" onClick={onClose} />
      </div>
    </div>
    <div className="site-preview-stage" ref={stage}>
      <div className={`site-preview-device is-${device}`} style={{ width: width * scale, height: size.height }}>
        <iframe ref={frame} name={previewFrameName} src={page} title="Vista previa del sitio público"
          style={{ width, height: size.height / scale, transform: `scale(${scale})` }}
          onLoad={() => send()} />
      </div>
      {!ready && <div className="site-preview-loading"><span className="spinner" aria-hidden="true" />Cargando vista previa…</div>}
    </div>
    <p className="site-preview-note">Puedes navegar y probar botones aquí; nada se publica hasta que pulses «Guardar cambios».</p>
  </aside>
}
