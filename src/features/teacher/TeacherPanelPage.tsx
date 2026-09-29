import { useState, type FormEvent } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { auth } from '@/config/firebase'
import { useAuth } from '@/features/auth/AuthContext'
import { Modal, fullName, groupName, specialtyLabels } from '@/features/academic/components/AcademicUI'
import { saveGrade } from '@/features/grades/services/grades.service'
import { Icon } from '@/shared/components/Icon'
import { errorMessage } from '@/shared/errors'
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
  return <Modal title="Cambiar mi contraseña" onClose={onClose} busy={busy}>
    {success ? <><p className="success-banner" role="status">Tu contraseña se actualizó correctamente.</p><button className="btn btn-primary" onClick={onClose}>Cerrar</button></> : <form className="form" onSubmit={submit}>
      <p className="form-help">Usa una contraseña exclusiva para el portal escolar. No tiene que ser la contraseña de tu correo.</p>
      <label>Contraseña actual<input type="password" required autoComplete="current-password" value={currentPassword} disabled={busy} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
      <label>Nueva contraseña<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} disabled={busy} onChange={(event) => setNewPassword(event.target.value)} /><small>Al menos 12 caracteres.</small></label>
      <label>Confirmar nueva contraseña<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} /></label>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <div className="form-actions"><button className="btn btn-secondary" type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Actualizando…' : 'Actualizar contraseña'}</button></div>
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
    <section className="welcome-banner"><div><span className="banner-tag">{data.schoolYear?.name ?? 'Sin ciclo activo'}</span><h2>Tu espacio de enseñanza</h2><p>Consulta tus grupos y registra resultados de {specialtyLabels[data.teacher?.specialty ?? '']?.toLowerCase() ?? 'tu área'}.</p><span className="badge badge-success">{data.groups.length} {data.groups.length === 1 ? 'grupo asignado' : 'grupos asignados'}</span></div><Icon name="book" size={72} /></section>
    <p className="notice-banner">Tu acceso se limita a los grupos y materias que te asignó el director en el ciclo activo. Puedes capturar nuevas calificaciones en periodos abiertos; las correcciones y la administración de expedientes corresponden al director.</p>
    {!data.groups.length ? <section className="card empty-state"><Icon name="students" size={34} /><h2>Sin grupos asignados</h2><p>{data.schoolYear ? 'El director debe asignarte a un grupo activo con tu especialidad para empezar a trabajar.' : 'El director debe activar un ciclo escolar y asignarte tus grupos.'}</p></section> : <>
      <section className="card"><div className="form-grid"><label>Grupo asignado<select value={groupId} disabled={busy} onChange={(event) => { setGroupId(event.target.value); clearCapture() }}><option value="">Selecciona tu grupo</option>{data.groups.map((item) => <option key={item.id} value={item.id}>{groupName(item)}</option>)}</select></label><label>Periodo de evaluación<select value={periodId} disabled={busy} onChange={(event) => { setPeriodId(event.target.value); clearCapture() }}><option value="">Selecciona un periodo</option>{data.periods.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === 'open' ? 'Abierto' : 'Cerrado'}</option>)}</select></label></div></section>
      {period?.status === 'closed' && <p className="notice-banner">El periodo está cerrado. La captura de nuevas calificaciones está bloqueada.</p>}
      {notice && <p className="success-banner" role="status">{notice}</p>}
      <section className="card"><div className="card-heading"><div><h2>Nueva calificación</h2><p className="muted">Únicamente alumnos inscritos y materias de tu especialidad.</p></div><Icon name="grades" /></div>
        <form className="form-grid" onSubmit={submit}>
          <label>Alumno inscrito<select required value={enrollmentId} disabled={!group || busy} onChange={(event) => setEnrollmentId(event.target.value)}><option value="">Selecciona un alumno</option>{enrollments.map((item) => <option key={item.id} value={item.id}>{studentName(item.studentId)}</option>)}</select></label>
          <label>Materia<select required value={subjectId} disabled={!group || busy} onChange={(event) => setSubjectId(event.target.value)}><option value="">Selecciona una materia</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Calificación<input type="number" required min={0} max={10} step="0.1" value={score} disabled={busy} placeholder="Ej. 8.5" onChange={(event) => setScore(event.target.value)} /><small>Escala de 0 a 10. Valor redondeado: {score !== '' && Number.isFinite(Number(score)) ? Math.round(Number(score)) : '—'}</small></label>
          <label>Observación (opcional)<textarea maxLength={1000} value={observation} disabled={busy} onChange={(event) => setObservation(event.target.value)} /></label>
          <div className="form-actions field-full"><button className="btn btn-primary" disabled={busy || !group || !period || period.status !== 'open'}>{busy ? 'Guardando…' : 'Guardar calificación'}</button></div>
        </form>{error && <p className="error-banner" role="alert">{error}</p>}
        {group && !subjects.length && <p className="notice-banner">No hay materias activas de tu especialidad para este grupo. Solicita al director que revise el plan de estudios.</p>}
      </section>
      <section className="card"><div className="card-heading"><h2>Lista del grupo</h2><span className="badge badge-muted">{enrollments.length} alumnos</span></div>
        {enrollments.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Alumno</th><th>Matrícula</th></tr></thead><tbody>{enrollments.map((item) => <tr key={item.id}><td>{studentName(item.studentId)}</td><td>{data.students.find((student) => student.id === item.studentId)?.matricula || '—'}</td></tr>)}</tbody></table></div> : <p className="muted">{group ? 'No hay alumnos con inscripción activa en este grupo.' : 'Selecciona un grupo para consultar su lista.'}</p>}
      </section>
      <section className="card"><div className="card-heading"><div><h2>Mis resultados registrados</h2><p className="muted">Para corregir un resultado, solicita la revisión del director.</p></div><span className="badge badge-muted">{results.length} registros</span></div>
        {results.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Alumno</th><th>Materia</th><th>Periodo</th><th>Capturada</th><th>Redondeada</th></tr></thead><tbody>{results.map((item) => <tr key={item.id}><td>{studentName(item.studentId)}</td><td>{data.subjects.find((subject) => subject.id === item.subjectPlanId)?.name ?? 'Materia no activa'}</td><td>{data.periods.find((period) => period.id === item.periodId)?.name ?? `Periodo ${item.periodOrder}`}</td><td>{item.score}</td><td><span className="grade-value">{item.roundedScore}</span></td></tr>)}</tbody></table></div> : <div className="empty-state compact"><p>No hay resultados registrados para esta selección.</p></div>}
      </section>
    </>}
  </>
}

function TeacherPanelContent() {
  const { profile } = useAuth()
  const { data, loading, error, refresh } = useTeacher()
  const [changingPassword, setChangingPassword] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  async function logout() { try { await signOut(auth) } catch { setLogoutError('No pudimos cerrar la sesión. Inténtalo de nuevo.') } }
  return <main className="teacher-panel">
    <a className="skip-link" href="#teacher-content">Ir al contenido</a>
    <header className="page-heading"><div><p className="eyebrow">Escuela Primaria Hugo César Piñeda Chacón</p><h1>Mi panel docente</h1><p className="page-description">{profile?.displayName} · Acceso docente</p></div><div className="row-actions"><button className="btn btn-secondary" onClick={() => setChangingPassword(true)}>Cambiar contraseña</button><button className="btn btn-quiet" onClick={() => void logout()}><Icon name="logout" /> Cerrar sesión</button></div></header>
    <div className="toolbar"><Link className="text-link" to="/">Ir al portal público</Link><button className="btn btn-small btn-secondary" onClick={refresh} disabled={loading}>Actualizar datos</button></div>
    {logoutError && <p className="error-banner" role="alert">{logoutError}</p>}
    <div id="teacher-content">{loading && !data.teacher ? <section className="card loading-state" role="status"><div className="loading-dot" />Cargando tus asignaciones…</section>
      : error ? <section className="card"><h2>Acceso docente no disponible</h2><p className="error-banner" role="alert">{error}</p><button className="btn btn-primary" onClick={refresh}>Volver a intentar</button></section> : <TeacherWorkspace />}</div>
    <footer className="panel-footer"><span>Portal escolar · Área docente</span><span>Los cambios de calificaciones quedan registrados.</span></footer>
    {changingPassword && <ChangePassword onClose={() => setChangingPassword(false)} />}
  </main>
}

export function TeacherPanelPage() { return <TeacherProvider><TeacherPanelContent /></TeacherProvider> }
