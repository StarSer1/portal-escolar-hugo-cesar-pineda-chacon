import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '@/shared/components/Icon'

type Tone = 'info' | 'success' | 'warning' | 'error'

/** Inline message. Success notices use role="status" and errors role="alert"; info and warnings stay passive. */
export function Alert({ tone = 'info', title, role, action, children }: { tone?: Tone; title?: string; role?: 'status' | 'alert'; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={`alert alert-${tone}`} role={role}>
      <Icon name={tone} size={20} />
      <div className="alert-body">
        {title && <strong className="alert-title">{title}</strong>}
        <div>{children}</div>
        {action && <div className="alert-action">{action}</div>}
      </div>
    </div>
  )
}

export type BadgeTone = 'success' | 'warn' | 'alert' | 'info' | 'muted' | 'count'

/** A signal: colored clip plus its word. Color never travels alone. */
export function Badge({ tone = 'muted', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function EmptyState({ icon = 'inbox', title, children, action, compact = false }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`empty-state${compact ? ' compact' : ''}`}>
      <span className="empty-icon"><Icon name={icon} size={24} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}

export function Skeleton({ width, height, className }: { width?: CSSProperties['width']; height?: CSSProperties['height']; className?: string }) {
  return <span className={['skeleton', className ?? ''].filter(Boolean).join(' ')} style={{ width, height }} aria-hidden="true" />
}

export function PageHeader({ title, description, actions, meta, level = 1 }: { title: string; description?: ReactNode; actions?: ReactNode; meta?: ReactNode; level?: 1 | 2 }) {
  const Title = level === 1 ? 'h1' : 'h2'
  return (
    <header className={`page-header${level === 2 ? ' section-header' : ''}`}>
      <div className="page-header-text">
        <Title>{title}</Title>
        {description && <p className="page-description">{description}</p>}
        {meta}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}
