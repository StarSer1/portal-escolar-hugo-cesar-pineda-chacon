import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { useAuth } from '@/features/auth/AuthContext'
import { auditActions, auditActor, auditDate, auditModules, auditRecordName, auditTones } from '@/features/academic/audit'
import { DataTable, type Column } from '@/shared/ui/DataTable'
import { Alert, Badge, EmptyState, PageHeader } from '@/shared/ui/Feedback'
import { FilterSelect, SearchField, Toolbar } from '@/shared/ui/Field'
import type { AuditLog } from '@/types/models'
import { DataState, matchesQuery, today } from '../components/AcademicUI'

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Day heading for grouped rows: "Hoy", "Ayer" or the full date. */
function dayLabel(date: Date | null, now: string) {
  if (!date) return 'Sin fecha disponible'
  const full = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const key = dayKey(date)
  const yesterday = new Date(`${now}T12:00:00`); yesterday.setDate(yesterday.getDate() - 1)
  if (key === now) return `Hoy · ${full}`
  if (key === dayKey(yesterday)) return `Ayer · ${full}`
  return full.charAt(0).toUpperCase() + full.slice(1)
}

export function ActivityPage() {
  const { data } = useAcademic()
  const { user, profile } = useAuth()
  const [query, setQuery] = useState('')
  const [entityType, setEntityType] = useState('')
  const now = today()
  const actor = (audit: AuditLog) => auditActor(audit, data, user?.uid, profile?.displayName)
  const visible = data.auditLogs
    .filter((audit) => (!entityType || audit.entityType === entityType) && matchesQuery(query, auditRecordName(audit, data), auditActions[audit.action] ?? audit.action, auditModules[audit.entityType]?.label, audit.actorId, actor(audit).name))
    .sort((a, b) => (auditDate(b.createdAt)?.getTime() ?? 0) - (auditDate(a.createdAt)?.getTime() ?? 0))

  const columns: Column<AuditLog>[] = [
    { key: 'time', header: 'Hora', cell: (audit) => { const date = auditDate(audit.createdAt); return <time className="tabular">{date ? date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }) : '—'}</time> } },
    { key: 'action', header: 'Movimiento', cell: (audit) => <Badge tone={auditTones[audit.action] ?? 'muted'}>{auditActions[audit.action] ?? audit.action}</Badge> },
    { key: 'record', header: 'Registro', cell: (audit) => <strong>{auditRecordName(audit, data)}</strong> },
    {
      key: 'actor', header: 'Responsable',
      cell: (audit) => { const who = actor(audit); return who.raw ? <span className="text-mono" title={`Identificador de la cuenta: ${audit.actorId}`}>{audit.actorId}</span> : <span title={`Identificador de la cuenta: ${audit.actorId}`}>{who.name} <small className="text-muted">({who.note})</small></span> },
    },
    { key: 'module', header: 'Módulo', priority: 'low', cell: (audit) => auditModules[audit.entityType] ? <Link to={auditModules[audit.entityType].route}>{auditModules[audit.entityType].label}</Link> : audit.entityType },
  ]

  return <>
    <PageHeader title="Actividad del panel" description="Los últimos 100 movimientos registrados: altas, modificaciones, inscripciones y correcciones de calificaciones." />
    <Alert tone="info">La bitácora es de solo lectura. Conserva la fecha y la cuenta responsable de cada movimiento; los registros históricos no se eliminan desde el panel.</Alert>
    <DataState>
      <section className="card table-card" aria-label="Bitácora de actividad">
        <Toolbar count={`${visible.length} ${visible.length === 1 ? 'movimiento' : 'movimientos'}`}>
          <SearchField label="Buscar en actividad" placeholder="Buscar registro, movimiento o responsable…" value={query} onChange={setQuery} />
          <FilterSelect label="Filtrar por módulo" allLabel="Todos los módulos" value={entityType} onChange={setEntityType} options={Object.entries(auditModules).map(([value, entry]) => ({ value, label: entry.label }))} />
        </Toolbar>
        <DataTable
          caption="Movimientos agrupados por día"
          rows={visible}
          columns={columns}
          rowKey={(audit) => audit.id}
          groupBy={(audit) => dayLabel(auditDate(audit.createdAt), now)}
          resetKey={[query, entityType].join('|')}
          empty={<EmptyState icon="history" title={data.auditLogs.length ? 'Sin movimientos que coincidan' : 'La bitácora está lista'}>{data.auditLogs.length ? 'Cambia la búsqueda o el filtro del módulo.' : 'Los movimientos se mostrarán automáticamente conforme utilices los módulos del panel.'}</EmptyState>}
        />
      </section>
    </DataState>
    <p className="page-note">Los nombres corresponden al catálogo actual; las cuentas docentes se identifican por su expediente vinculado. Esta vista se limita a los últimos 100 movimientos y no representa un reporte histórico completo.</p>
  </>
}
