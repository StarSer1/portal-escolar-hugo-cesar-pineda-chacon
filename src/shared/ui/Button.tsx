import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Icon } from '@/shared/components/Icon'

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger'
type Size = 'md' | 'sm'
interface Look { variant?: Variant; size?: Size; icon?: string }

function buttonClass({ variant = 'secondary', size = 'md' }: Look, extra?: string) {
  return ['btn', `btn-${variant}`, size === 'sm' ? 'btn-small' : '', extra ?? ''].filter(Boolean).join(' ')
}

export function Button({ variant, size, icon, loading = false, type = 'button', className, disabled, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & Look & { loading?: boolean }) {
  return (
    <button {...rest} type={type} className={buttonClass({ variant, size }, className)} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, icon, className, children, ...rest }: LinkProps & Look & { children: ReactNode }) {
  return (
    <Link {...rest} className={buttonClass({ variant, size }, className)}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </Link>
  )
}

/** Icon-only control: the label is both the accessible name and the tooltip. */
export function IconButton({ icon, label, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }) {
  return (
    <button {...rest} type={type} className={['icon-button', className ?? ''].filter(Boolean).join(' ')} aria-label={label} data-tooltip={label}>
      <Icon name={icon} />
    </button>
  )
}
