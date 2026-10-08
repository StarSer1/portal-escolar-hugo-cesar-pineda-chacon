import { useState, type ReactNode } from 'react'
import { Icon } from '@/shared/components/Icon'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Enables sorting by this column. */
  sortValue?: (row: T) => string | number
  align?: 'end'
  /** Low-priority columns hide on tablet widths and reappear in the phone layout. */
  priority?: 'low'
}
type Sort = { key: string; direction: 'asc' | 'desc' }

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })
function compare(a: string | number, b: string | number) {
  return typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b))
}

/**
 * Shared table: sortable headers, pagination, an empty state and labelled
 * blocks on phones. `resetKey` returns to page 1 when filters change.
 */
export function DataTable<T>({ caption, rows, columns, rowKey, actions, initialSort, pageSize = 25, resetKey = '', empty, groupBy }: {
  caption: string
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  actions?: (row: T) => ReactNode
  initialSort?: Sort
  pageSize?: number
  resetKey?: string
  empty: ReactNode
  /** Inserts a heading row whenever the value changes; rows keep their incoming order. */
  groupBy?: (row: T) => string
}) {
  const [sort, setSort] = useState<Sort | undefined>(initialSort)
  const [page, setPage] = useState(1)
  const [lastReset, setLastReset] = useState(resetKey)
  if (resetKey !== lastReset) { setLastReset(resetKey); setPage(1) }

  if (!rows.length) return <>{empty}</>
  const column = !groupBy && sort ? columns.find((item) => item.key === sort.key) : undefined
  const ordered = column?.sortValue ? [...rows].sort((a, b) => compare(column.sortValue!(a), column.sortValue!(b)) * (sort!.direction === 'asc' ? 1 : -1)) : rows
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize))
  const current = Math.min(page, pageCount)
  const visible = ordered.slice((current - 1) * pageSize, current * pageSize)
  const span = columns.length + (actions ? 1 : 0)

  function toggle(key: string) {
    setSort((previous) => previous?.key === key ? { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  }

  const body: ReactNode[] = []
  let group: string | undefined
  for (const row of visible) {
    const nextGroup = groupBy?.(row)
    if (groupBy && nextGroup !== group) {
      group = nextGroup
      body.push(<tr key={`group-${nextGroup}`} className="group-row"><th colSpan={span} scope="colgroup">{nextGroup}</th></tr>)
    }
    body.push(
      <tr key={rowKey(row)}>
        {columns.map((item) => <td key={item.key} data-label={item.header} className={cellClass(item)}>{item.cell(row)}</td>)}
        {actions && <td className="cell-actions" data-label="Acciones">{actions(row)}</td>}
      </tr>,
    )
  }

  return (
    <div className="table-frame">
      <div className="table-wrap">
        <table className="data-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((item) => {
                const sorted = sort?.key === item.key && !groupBy
                const sortable = !!item.sortValue && !groupBy
                return (
                  <th key={item.key} scope="col" className={cellClass(item)} aria-sort={sorted ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {sortable ? (
                      <button type="button" className={`sort-button${sorted ? ' is-sorted' : ''}`} onClick={() => toggle(item.key)}>
                        {item.header}
                        <Icon name={sorted ? (sort!.direction === 'asc' ? 'chevronUp' : 'chevronDown') : 'sort'} size={14} />
                      </button>
                    ) : item.header}
                  </th>
                )
              })}
              {actions && <th scope="col" className="cell-actions">Acciones</th>}
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {pageCount > 1 && <Pagination page={current} pageCount={pageCount} total={ordered.length} pageSize={pageSize} onChange={setPage} />}
    </div>
  )
}

function cellClass(column: { priority?: 'low'; align?: 'end' }) {
  return [column.priority === 'low' ? 'col-low' : '', column.align === 'end' ? 'align-end' : ''].filter(Boolean).join(' ') || undefined
}

function pageList(page: number, count: number): Array<number | 'gap'> {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1)
  const pages = new Set([1, count, page - 1, page, page + 1].filter((value) => value >= 1 && value <= count))
  const sorted = [...pages].sort((a, b) => a - b)
  return sorted.flatMap((value, index) => index && value - sorted[index - 1] > 1 ? ['gap' as const, value] : [value])
}

export function Pagination({ page, pageCount, total, pageSize, onChange }: { page: number; pageCount: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <nav className="pagination" aria-label="Paginación de la tabla">
      <p className="pagination-summary">Mostrando <strong>{from}–{to}</strong> de {total}</p>
      <div className="pager">
        <button type="button" className="pager-step" aria-label="Página anterior" disabled={page === 1} onClick={() => onChange(page - 1)}><Icon name="chevronLeft" size={18} /></button>
        {pageList(page, pageCount).map((value, index) => value === 'gap'
          ? <span key={`gap-${index}`} className="pager-gap" aria-hidden="true">…</span>
          : <button key={value} type="button" className="pager-page" aria-current={value === page ? 'page' : undefined} onClick={() => onChange(value)}>{value}</button>)}
        <button type="button" className="pager-step" aria-label="Página siguiente" disabled={page === pageCount} onClick={() => onChange(page + 1)}><Icon name="chevron" size={18} /></button>
      </div>
    </nav>
  )
}
