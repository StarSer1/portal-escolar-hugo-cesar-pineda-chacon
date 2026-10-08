import { useState, type FormEvent } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { auth } from '@/config/firebase'
import { useAuth } from '@/features/auth/AuthContext'
import { fullName, groupName, specialtyLabels } from '@/features/academic/components/AcademicUI'
import { saveGrade } from '@/features/grades/services/grades.service'
import { Icon } from '@/shared/components/Icon'
import { SchoolEmblem } from '@/shared/components/SchoolEmblem'
import { errorMessage } from '@/shared/errors'
import { Button } from '@/shared/ui/Button'
import { DataTable } from '@/shared/ui/DataTable'
import { Alert, Badge, EmptyState, PageHeader } from '@/shared/ui/Feedback'
import { Field } from '@/shared/ui/Field'
import { Modal } from '@/shared/ui/Modal'
import { TeacherProvider, useTeacher } from './TeacherContext'

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (newPassword.length < 12) { setError('La nueva contraseña debe tener al menos 12 caracteres.'); return }
    if (newPassword !== confirmation) { setError('La confirmación no coincide con la nueva contraseña.'); return }
    if (newPassword === currentPassword) { setError('Elige una contraseña diferente a la actual.'); return }
    const user = auth.currentUser
    if (!user?.email) { setError('Vuelve a iniciar sesión para cambiar tu contraseña.'); return }
    setBusy(true)
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword))
      await updatePassword(user, newPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmation(''); setSuccess(true)
    } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false) }
  }
  return <Modal title="Cambiar mi contraseña" description="Usa una contraseña exclusiva para el portal escolar. No tiene que ser la contraseña de tu correo." onClose={onClose} busy={busy} focusField>
    {success ? <>
      <Alert tone="success" role="status">Tu contraseña se actualizó correctamente.</Alert>
      <div className="form-actions"><Button variant="primary" onClick={onClose}>Cerrar</Button></div>
    </> : <form className="form" onSubmit={submit}>
      <Field label="Contraseña actual"><input type="password" required autoComplete="current-password" value={currentPassword} disabled={busy} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
      <Field label="Nueva contraseña" hint="Al menos 12 caracteres."><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} disabled={busy} onChange={(event) => setNewPassword(event.target.value)} /></Field>
      <Field label="Confirmar nueva contraseña"><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} /></Field>
      {error && <Alert tone="error" role="alert">{error}</Alert>}
      <div className="form-actions"><Button disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" loading={busy}>{busy ? 'Actualizando…' : 'Actualizar contraseña'}</Button></div>
    </form>}
  </Modal>
}

function TeacherWorkspace() {
  const { data, refresh, loading } = useTeacher()
  const [groupId, setGroupId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [enrollmentId, setEnrollmentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [score, setScore] = useState('')
  const [observation, setObservation] = useState('')
  const [saving, setBusy] = useState(false)
  const busy = saving || loading
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const group = data.groups.find((item) => item.id === groupId)
  const period = data.periods.find((item) => item.id === periodId)
  const enrollments = data.enrollments.filter((item) => item.groupId === groupId)
  const subjects = data.subjects.filter((item) => group && item.curriculumPlanId === group.curriculumPlanId && item.grade === group.grade)
  const results = data.grades.filter((item) => item.groupId === groupId && (!periodId || item.periodId === periodId))
  const studentName = (id: string) => { const student = data.students.find((item) => item.id === id); return student ? fullName(student) : 'Alumno fuera de la lista activa' }
  function clearCapture() { setEnrollmentId(''); setSubjectId(''); setScore(''); setObservation(''); setError(''); setNotice('') }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('')
    const enrollment = enrollments.find((item) => item.id === enrollmentId)
    if (!group || !period || !enrollment || !subjects.some((item) => item.id === subjectId) || score.trim() === '') {
      setError('Selecciona grupo, periodo, alumno, materia y calificación.'); return
    }
    if (period.status !== 'open') { setError('El periodo está cerrado. Comunícate con el director.'); return }
    if (data.grades.some((item) => item.enrollmentId === enrollmentId && item.subjectPlanId === subjectId && item.periodId === periodId)) {
      setError('Esta calificación ya está registrada. Solicita al director cualquier corrección.'); return
    }
    setBusy(true)
    try {
      await saveGrade({ studentId: enrollment.studentId, enrollmentId, groupId, schoolYearId: group.schoolYearId,
        subjectPlanId: subjectId, periodId, periodOrder: period.order, score: Number(score), observation, expectedVersion: 0 })
      clearCapture(); setNotice('Calificación guardada correctamente.'); refresh()
    } catch (caught) {
      const code = typeof caught === 'object' && caught !== null && 'code' in caught ? String(caught.code) : ''
      setError(code.includes('permission-denied') ? 'No se pudo guardar. Tu asignación, la inscripción o el periodo pudieron cambiar. Actualiza los datos; las correcciones corresponden al director.' : errorMessage(caught))
    } finally { setBusy(false) }
  }
  return <>
    <section className="welcome-banner">
      <div><h2>Tu espacio de enseñanza</h2><p>{data.schoolYear ? `Ciclo ${data.schoolYear.name}` : 'Sin ciclo activo'} · Consulta tus grupos y registra resultados de {specialtyLabels[data.teacher?.specialty ?? '']?.toLowerCase() ?? 'tu área'}.</p></div>
      <Badge tone="success">{data.groups.length} {data.groups.length === 1 ? 'grupo asignado' : 'grupos asignados'}</Badge>
    </section>
    <Alert tone="info">Tu acceso se limita a los grupos y materias que te asignó el director en el ciclo activo. Puedes capturar nuevas calificaciones en periodos abiertos; las correcciones y la administración de expedientes corresponden al director.</Alert>
    {!data.groups.length ? <section className="card empty-state">
      <span className="empty-icon"><Icon name="students" size={24} /></span>
      <h2>Sin grupos asignados</h2>
      <p>{data.schoolYear ? 'El director debe asignarte a un grupo activo con tu especialidad para empezar a trabajar.' : 'El director debe activar un ciclo escolar y asignarte tus grupos.'}</p>
    </section> : <>
      <section className="card context-bar" aria-label="Selección de grupo y periodo">
        <div className="context-fields context-fields-two">
          <Field label="Grupo asignado"><select value={groupId} disabled={busy} onChange={(event) => { setGroupId(event.target.value); clearCapture() }}><option value="">Selecciona tu grupo</option>{data.groups.map((item) => <option key={item.id} value={item.id}>{groupName(item)}</option>)}</select></Field>
          <Field label="Periodo de evaluación"><select value={periodId} disabled={busy} onChange={(event) => { setPeriodId(event.target.value); clearCapture() }}><option value="">Selecciona un periodo</option>{data.periods.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === 'open' ? 'Abierto' : 'Cerrado'}</option>)}</select></Field>
        </div>
      </section>
      {period?.status === 'closed' && <Alert tone="warning">El periodo está cerrado. La captura de nuevas calificaciones está bloqueada.</Alert>}
      {notice && <Alert tone="success" role="status">{notice}</Alert>}
      <div className="grades-layout">
        <section className="card capture-card" aria-labelledby="teacher-capture-title">
          <div className="card-heading"><div><h2 id="teacher-capture-title">Nueva calificación</h2><p>Únicamente alumnos inscritos y materias de tu especialidad.</p></div></div>
          <form className="form-grid capture-form" onSubmit={submit}>
            <Field label="Alumno inscrito" full><select required value={enrollmentId} disabled={!group || busy} onChange={(event) => setEnrollmentId(event.target.value)}><option value="">Selecciona un alumno</option>{enrollments.map((item) => <option key={item.id} value={item.id}>{studentName(item.studentId)}</option>)}</select></Field>
            <Field label="Materia" full><select required value={subjectId} disabled={!group || busy} onChange={(event) => setSubjectId(event.target.value)}><option value="">Selecciona una materia</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Calificación" full hint={`Escala de 0 a 10. Valor redondeado: ${score !== '' && Number.isFinite(Number(score)) ? Math.round(Number(score)) : '—'}`}><input type="number" required min={0} max={10} step="0.1" inputMode="decimal" className="score-input" value={score} disabled={busy} placeholder="Ej. 8.5" onChange={(event) => setScore(event.target.value)} /></Field>
            <Field label="Observación (opcional)" full><textarea maxLength={1000} value={observation} disabled={busy} onChange={(event) => setObservation(event.target.value)} /></Field>
            <div className="form-actions field-full"><Button type="submit" variant="primary" loading={saving} disabled={busy || !group || !period || period.status !== 'open'}>{saving ? 'Guardando…' : 'Guardar calificación'}</Button></div>
          </form>
          {error && <Alert tone="error" role="alert">{error}</Alert>}
          {group && !subjects.length && <Alert tone="warning">No hay materias activas de tu especialidad para este grupo. Solicita al director que revise el plan de estudios.</Alert>}
        </section>
        <div className="stack">
          <section className="card table-card" aria-labelledby="roster-title">
            <div className="card-heading"><h2 id="roster-title">Lista del grupo</h2><Badge tone="count">{enrollments.length} alumnos</Badge></div>
            <DataTable caption="Lista del grupo" rows={enrollments} rowKey={(item) => item.id} initialSort={{ key: 'name', direction: 'asc' }} columns={[
              { key: 'name', header: 'Alumno', sortValue: (item) => studentName(item.studentId), cell: (item) => studentName(item.studentId) },
              { key: 'matricula', header: 'Matrícula', cell: (item) => <span className="text-mono">{data.students.find((student) => student.id === item.studentId)?.matricula || '—'}</span> },
            ]} empty={<EmptyState compact icon="students" title={group ? 'Sin alumnos inscritos' : 'Elige un grupo'}>{group ? 'No hay alumnos con inscripción activa en este grupo.' : 'Selecciona un grupo para consultar su lista.'}</EmptyState>} />
          </section>
          <section className="card table-card" aria-labelledby="mine-title">
            <div className="card-heading"><div><h2 id="mine-title">Mis resultados registrados</h2><p>Para corregir un resultado, solicita la revisión del director.</p></div><Badge tone="count">{results.length} registros</Badge></div>
            <DataTable caption="Mis resultados registrados" rows={results} rowKey={(item) => item.id} initialSort={{ key: 'name', direction: 'asc' }} columns={[
              { key: 'name', header: 'Alumno', sortValue: (item) => studentName(item.studentId), cell: (item) => studentName(item.studentId) },
              { key: 'subject', header: 'Materia', sortValue: (item) => data.subjects.find((subject) => subject.id === item.subjectPlanId)?.name ?? '', cell: (item) => data.subjects.find((subject) => subject.id === item.subjectPlanId)?.name ?? 'Materia no activa' },
              { key: 'period', header: 'Periodo', priority: 'low', cell: (item) => data.periods.find((entry) => entry.id === item.periodId)?.name ?? `Periodo ${item.periodOrder}` },
              { key: 'score', header: 'Capturada', align: 'end', sortValue: (item) => item.score, cell: (item) => item.score },
              { key: 'rounded', header: 'Redondeada', align: 'end', cell: (item) => <span className="grade-value">{item.roundedScore}</span> },
            ]} empty={<EmptyState compact icon="grades" title="Sin resultados">No hay resultados registrados para esta selección.</EmptyState>} />
          </section>
        </div>
      </div>
    </>}
  </>
}

function TeacherPanelContent() {
  const { profile } = useAuth()
  const { data, loading, error, refresh } = useTeacher()
  const [changingPassword, setChangingPassword] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  async function logout() { try { await signOut(auth) } catch { setLogoutError('No pudimos cerrar la sesión. Inténtalo de nuevo.') } }
  return <div className="teacher-shell">
    <a className="skip-link" href="#teacher-content">Ir al contenido</a>
    <header className="teacher-topbar">
      <Link to="/docente" className="teacher-brand"><SchoolEmblem size={36} /><span><small>Escuela Primaria</small><strong>Hugo César Piñeda Chacón</strong></span></Link>
      <div className="row-actions teacher-actions">
        <Button size="sm" icon="lock" onClick={() => setChangingPassword(true)}>Cambiar contraseña</Button>
        <Button size="sm" variant="quiet" icon="logout" onClick={() => void logout()}>Cerrar sesión</Button>
      </div>
    </header>
    <main className="teacher-panel" id="teacher-content">
      <PageHeader title="Mi panel docente" description={`${profile?.displayName ?? ''} · Acceso docente`} actions={<>
        <Link className="text-link" to="/">Ir al portal público</Link>
        <Button size="sm" icon="refresh" onClick={refresh} disabled={loading}>Actualizar datos</Button>
      </>} />
      {logoutError && <Alert tone="error" role="alert">{logoutError}</Alert>}
      {loading && !data.teacher ? <section className="card loading-state" role="status"><span className="spinner" aria-hidden="true" />Cargando tus asignaciones…</section>
        : error ? <section className="card"><h2>Acceso docente no disponible</h2><Alert tone="error" role="alert" action={<Button variant="primary" icon="refresh" onClick={refresh}>Volver a intentar</Button>}>{error}</Alert></section> : <TeacherWorkspace />}
      <footer className="panel-footer"><span>Portal escolar · Área docente</span><span>Los cambios de calificaciones quedan registrados.</span></footer>
    </main>
    {changingPassword && <ChangePassword onClose={() => setChangingPassword(false)} />}
  </div>
}

export function TeacherPanelPage() { return <TeacherProvider><TeacherPanelContent /></TeacherProvider> }
