import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { listGrades, saveGrade, type SaveGradeInput } from '@/features/grades/services/grades.service'
import type { Grade } from '@/types/models'

const initialForm: SaveGradeInput = { studentId: '', enrollmentId: '', groupId: '', schoolYearId: '', subjectPlanId: '', periodId: '', periodOrder: 1, score: 0, observation: '' }

export function GradesPage() {
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(false)
  function update<K extends keyof SaveGradeInput>(key: K, value: SaveGradeInput[K]) { setForm((current) => ({ ...current, [key]: value })) }
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage('')
    try { const result = await saveGrade(form); setMessage(`Calificación guardada. Redondeada: ${result.roundedScore}`) }
    catch { setMessage('No fue posible guardar. Confirma que iniciaste sesión y que tu usuario tiene rol admin o teacher.') }
    finally { setLoading(false) }
  }
  async function handleLoad() {
    if (!form.groupId) { setMessage('Indica el ID del grupo para consultar.'); return }
    setLoading(true); setMessage('')
    try { setGrades(await listGrades(form.groupId)) } catch { setMessage('No fue posible consultar las calificaciones del grupo.') } finally { setLoading(false) }
  }
  return <main><Link to="/panel">← Panel</Link><h1>Calificaciones — prueba inicial</h1><p>Usa IDs de documentos de prueba. Después se reemplazarán por selectores.</p>
    <form className="form grid" onSubmit={handleSave}>
      <label>ID alumno<input value={form.studentId} onChange={(e) => update('studentId', e.target.value)} required /></label><label>ID inscripción<input value={form.enrollmentId} onChange={(e) => update('enrollmentId', e.target.value)} required /></label><label>ID grupo<input value={form.groupId} onChange={(e) => update('groupId', e.target.value)} required /></label><label>ID ciclo<input value={form.schoolYearId} onChange={(e) => update('schoolYearId', e.target.value)} required /></label><label>ID materia-plan<input value={form.subjectPlanId} onChange={(e) => update('subjectPlanId', e.target.value)} required /></label><label>ID periodo<input value={form.periodId} onChange={(e) => update('periodId', e.target.value)} required /></label><label>Periodo (1–3)<input type="number" min="1" max="3" value={form.periodOrder} onChange={(e) => update('periodOrder', Number(e.target.value))} required /></label><label>Calificación (0–10)<input type="number" min="0" max="10" step="0.1" value={form.score} onChange={(e) => update('score', Number(e.target.value))} required /></label><label>Observación<textarea value={form.observation} onChange={(e) => update('observation', e.target.value)} /></label><button disabled={loading}>{loading ? 'Procesando…' : 'Guardar calificación'}</button>
    </form><button onClick={handleLoad} disabled={loading}>Consultar calificaciones del grupo</button>{message && <p role="status">{message}</p>}
    {grades.length > 0 && <table><thead><tr><th>Alumno</th><th>Materia-plan</th><th>Periodo</th><th>Calificación</th></tr></thead><tbody>{grades.map((grade) => <tr key={grade.id}><td>{grade.studentId}</td><td>{grade.subjectPlanId}</td><td>{grade.periodOrder}</td><td>{grade.roundedScore}</td></tr>)}</tbody></table>}
  </main>
}
