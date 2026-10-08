import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcademic } from '@/features/academic/AcademicContext'
import { enrollStudent, withdrawEnrollment } from '@/features/academic/services/academic.service'
import { Button } from '@/shared/ui/Button'
import { DataTable, type Column } from '@/shared/ui/DataTable'
import { Alert, EmptyState, PageHeader } from '@/shared/ui/Feedback'
import { Field, FilterSelect, SearchField, Toolbar } from '@/shared/ui/Field'
import { Modal } from '@/shared/ui/Modal'
import { SegmentedControl } from '@/shared/ui/Tabs'
import type { Enrollment } from '@/types/models'
import { DataState, displayDate, errorMessage, fullName, groupName, matchesQuery, StatusBadge, today } from '../components/AcademicUI'

type StatusFilter = 'all' | Enrollment['status']

export function EnrollmentsPage() {
  const { data, loading, error: dataError } = useAcademic()
  const [params, setParams] = useSearchParams()
  const linkedStudent = params.get('alumno') ?? ''
  const activeYear = data.schoolYears.find((year) => year.status === 'active')
  const [yearId, setYearId] = useState(activeYear?.id ?? '')
  const [groupFilter, setGroupFilter] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  // "?nuevo=1" (from the summary's shortcut) opens the enrollment form directly.
  const [mode, setMode] = useState<'enroll' | 'withdraw' | null>(() => params.get('nuevo') === '1' && activeYear ? 'enroll' : null)
  const [selected, setSelected] = useState<Enrollment | null>(null)
  const [studentId, setStudentId] = useState(linkedStudent)
  const [groupId, setGroupId] = useState('')
  const [date, setDate] = useState(today())
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const selectedGroup = data.groups.find((group) => group.id === groupId)
  const selectedYear = data.schoolYears.find((year) => year.id === (mode === 'withdraw' ? selected?.schoolYearId : selectedGroup?.schoolYearId))
  const previous = data.enrollments.find((enrollment) => enrollment.studentId === studentId && enrollment.schoolYearId === selectedGroup?.schoolYearId && enrollment.status === 'active')
  const previousGroup = data.groups.find((group) => group.id === previous?.groupId)
  const student = (id: string) => data.students.find((item) => item.id === id)
  const group = (id: string) => data.groups.find((item) => item.id === id)
  const year = (id: string) => data.schoolYears.find((item) => item.id === id)

  const scoped = data.enrollments.filter((enrollment) => (!yearId || enrollment.schoolYearId === yearId) && (!linkedStudent || enrollment.studentId === linkedStudent))
  const counts = { all: scoped.length, active: 0, transferred: 0, withdrawn: 0 }
  for (const enrollment of scoped) counts[enrollment.status] += 1
  const visible = scoped.filter((enrollment) => {
    const person = student(enrollment.studentId)
    const room = group(enrollment.groupId)
    return (status === 'all' || enrollment.status === status) && (!groupFilter || enrollment.groupId === groupFilter)
      && matchesQuery(query, person && fullName(person), person?.matricula, room && groupName(room))
  })
  const groupOptions = data.groups.filter((item) => !yearId || item.schoolYearId === yearId).sort((a, b) => a.grade - b.grade || a.label.localeCompare(b.label)).map((item) => ({ value: item.id, label: groupName(item) }))

  function open(next: 'enroll' | 'withdraw', enrollment: Enrollment | null = null) {
    setMode(next); setSelected(enrollment); setStudentId(enrollment?.studentId ?? linkedStudent)
    setGroupId(''); setDate(today()); setReason(''); setError(''); setNotice('')
  }
  function close() {
    setMode(null)
    if (params.has('nuevo')) setParams((current) => { const next = new URLSearchParams(current); next.delete('nuevo'); return next }, { replace: true })
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (mode === 'enroll' && previous && previous.groupId === groupId) { setError('El alumno ya está inscrito en ese grupo. Selecciona otro para un cambio.'); return }
    if ((mode === 'withdraw' || previous) && !reason.trim()) { setError('Escribe el motivo del movimiento.'); return }
    setBusy(true)
    try {
      if (mode === 'withdraw' && selected) {
        await withdrawEnrollment(selected.id, date, reason.trim())
        setNotice('Baja registrada. Se conservaron la inscripción y sus calificaciones en el historial.')
      } else {
        await enrollStudent({ studentId, groupId, startDate: date, reason: reason.trim() })
        setNotice(previous ? 'Cambio de grupo registrado. La inscripción anterior permanece en el historial.' : 'Alumno inscrito correctamente.')
      }
      close()
    } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false) }
  }

  const columns: Column<Enrollment>[] = [
    {
      key: 'student', header: 'Alumno', sortValue: (enrollment) => { const person = student(enrollment.studentId); return person ? `${person.surnames} ${person.names}` : '' },
      cell: (enrollment) => { const person = student(enrollment.studentId); return <div className="cell-stack"><strong>{person ? fullName(person) : 'Alumno no disponible'}</strong><small className="text-mono">{person?.matricula}</small></div> },
    },
    {
      key: 'group', header: 'Grupo', sortValue: (enrollment) => { const room = group(enrollment.groupId); return room ? room.grade * 100 + room.label.charCodeAt(0) : 999 },
      cell: (enrollment) => { const room = group(enrollment.groupId); return <div className="cell-stack"><span>{room ? groupName(room) : 'Grupo no disponible'}</span><small>{year(enrollment.schoolYearId)?.name ?? 'Ciclo no disponible'}</small></div> },
    },
    {
      key: 'dates', header: 'Vigencia', sortValue: (enrollment) => enrollment.startDate,
      cell: (enrollment) => <div className="cell-stack"><span>{displayDate(enrollment.startDate)}</span><small>{enrollment.endDate ? `Hasta ${displayDate(enrollment.endDate)}` : 'Sin fecha de cierre'}</small></div>,
    },
    {
      key: 'status', header: 'Estado', sortValue: (enrollment) => enrollment.status,
      cell: (enrollment) => <div className="cell-stack"><StatusBadge value={enrollment.status} />{enrollment.reason && <small className="cell-reason">{enrollment.reason}</small>}</div>,
    },
  ]

  return <>
    <PageHeader title="Inscripciones" description="Inscribe alumnos, registra cambios de grupo y bajas, y conserva cada movimiento de su trayectoria." actions={<Button variant="primary" icon="plus" disabled={loading || !!dataError || !activeYear} onClick={() => open('enroll')}>Inscribir alumno</Button>} />
    {!activeYear && <Alert tone="info">Necesitas un ciclo activo para inscribir alumnos. <Link to="/panel/organizacion?tab=years">Configurar ciclos</Link>.</Alert>}
    {linkedStudent && <Alert tone="info">Mostrando la trayectoria de {student(linkedStudent)?.names ?? 'este alumno'}. <Link to="/panel/inscripciones">Ver todos los alumnos</Link>.</Alert>}
    {notice && <Alert tone="success" role="status">{notice}</Alert>}
    <DataState>
      <section className="card table-card" aria-label="Inscripciones">
        <div className="table-card-head">
          <SegmentedControl<StatusFilter>
            label="Filtrar por estado de inscripción"
            value={status}
            onChange={setStatus}
            options={[{ value: 'all', label: 'Todas', count: counts.all }, { value: 'active', label: 'Activas', count: counts.active }, { value: 'transferred', label: 'Cambios de grupo', count: counts.transferred }, { value: 'withdrawn', label: 'Bajas', count: counts.withdrawn }]}
          />
        </div>
        <Toolbar count={`${visible.length} ${visible.length === 1 ? 'registro' : 'registros'}`}>
          <SearchField label="Buscar inscripción" placeholder="Buscar alumno, matrícula o grupo…" value={query} onChange={setQuery} />
          <FilterSelect label="Filtrar por ciclo escolar" allLabel="Todos los ciclos" value={yearId} onChange={(value) => { setYearId(value); setGroupFilter('') }} options={data.schoolYears.map((item) => ({ value: item.id, label: `${item.name}${item.status === 'active' ? ' (activo)' : ''}` }))} />
          <FilterSelect label="Filtrar por grupo" allLabel="Todos los grupos" value={groupFilter} onChange={setGroupFilter} options={groupOptions} />
        </Toolbar>
        <DataTable
          caption="Inscripciones"
          rows={visible}
          columns={columns}
          rowKey={(enrollment) => enrollment.id}
          initialSort={{ key: 'dates', direction: 'desc' }}
          resetKey={[query, status, yearId, groupFilter, linkedStudent].join('|')}
          actions={(enrollment) => enrollment.status === 'active' && year(enrollment.schoolYearId)?.status === 'active'
            ? <div className="row-actions">
              <Button size="sm" icon="transfer" onClick={() => open('enroll', enrollment)}>Cambiar grupo</Button>
              <Button size="sm" variant="quiet" icon="withdraw" onClick={() => open('withdraw', enrollment)}>Dar de baja</Button>
            </div>
            : <span className="text-muted">Histórico · solo consulta</span>}
          empty={<EmptyState icon={data.enrollments.length ? 'search' : 'enroll'} title="Sin inscripciones para mostrar">{data.enrollments.length ? 'Revisa la búsqueda o los filtros de consulta.' : 'Registra un alumno y un grupo activo para comenzar.'}</EmptyState>}
        />
      </section>
    </DataState>
    <p className="page-note">Un alumno tiene una sola inscripción activa por ciclo. Los cambios de grupo y las bajas conservan sus calificaciones anteriores.</p>
    {mode && <Modal title={mode === 'withdraw' ? 'Dar de baja la inscripción' : selected ? 'Cambiar de grupo' : 'Inscribir alumno'} description={mode === 'withdraw' ? undefined : 'Selecciona alumno y grupo por nombre. Los campos con * son obligatorios.'} onClose={close} busy={busy} focusField>
      <form onSubmit={submit}>
        {mode === 'withdraw' && <Alert tone="warning">Esta acción cierra la inscripción de {student(selected?.studentId ?? '')?.names ?? 'este alumno'}. No elimina su expediente ni sus calificaciones.</Alert>}
        <fieldset className="form-fieldset" disabled={busy}>
          <div className="form-grid">
            {mode === 'enroll' && <>
              <Field label="Alumno" required full>
                <select required value={studentId} disabled={!!selected} onChange={(event) => setStudentId(event.target.value)}>
                  <option value="">Seleccionar alumno…</option>
                  {data.students.filter((item) => item.status === 'active' || item.id === studentId).map((item) => <option key={item.id} value={item.id}>{fullName(item)} · {item.matricula}</option>)}
                </select>
              </Field>
              <Field label={selected ? 'Nuevo grupo' : 'Grupo'} required full>
                <select required value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                  <option value="">Seleccionar grupo…</option>
                  {data.groups.filter((item) => item.status === 'active' && item.schoolYearId === activeYear?.id && item.id !== selected?.groupId).map((item) => <option key={item.id} value={item.id}>{groupName(item)} · {activeYear?.name}</option>)}
                </select>
              </Field>
              {previous && <div className="field-full"><Alert tone="info">Ya tiene una inscripción en {previousGroup ? groupName(previousGroup) : 'otro grupo'}. Al guardar se cerrará esa inscripción como cambio de grupo; sus calificaciones permanecerán en el grupo anterior.</Alert></div>}
            </>}
            <Field label={mode === 'withdraw' ? 'Fecha de baja' : previous ? 'Fecha de cambio' : 'Fecha de inscripción'} required hint={selectedYear ? `Ciclo: ${displayDate(selectedYear.startDate)} — ${displayDate(selectedYear.endDate)}` : undefined}>
              <input type="date" required min={mode === 'withdraw' ? selected?.startDate : previous?.startDate ?? selectedYear?.startDate} max={selectedYear?.endDate} value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
            <Field label={`Motivo ${mode === 'withdraw' || previous ? '*' : '(opcional)'}`} full>
              <textarea rows={3} maxLength={500} required={mode === 'withdraw' || !!previous} value={reason} onChange={(event) => setReason(event.target.value)} />
            </Field>
          </div>
        </fieldset>
        {error && <Alert tone="error" role="alert">{error}</Alert>}
        <div className="form-actions">
          <Button onClick={close} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant={mode === 'withdraw' ? 'danger' : 'primary'} loading={busy}>{busy ? 'Guardando…' : mode === 'withdraw' ? 'Confirmar baja' : previous ? 'Confirmar cambio' : 'Guardar inscripción'}</Button>
        </div>
      </form>
    </Modal>}
  </>
}
