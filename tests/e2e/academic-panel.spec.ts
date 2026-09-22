import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'

// Fixed local addresses and demo project prevent any production data modification.
const project = 'demo-portal-academico'
const firestore = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`
const authHost = 'http://127.0.0.1:9099'
const password = 'PruebaLocal-12345'
const adminEmail = 'administrador@example.test'
const teacherEmail = 'docente@example.test'
const studentName = 'Alumna Demostración Local'

async function seedUser(request: APIRequestContext, email: string, role: 'admin' | 'teacher') {
  const response = await request.post(`${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    data: { email, password, returnSecureToken: true },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  const { localId } = await response.json()
  const profile = await request.patch(`${firestore}/users/${localId}`, {
    headers: { Authorization: 'Bearer owner' },
    data: { fields: {
      role: { stringValue: role }, email: { stringValue: email },
      displayName: { stringValue: role === 'admin' ? 'Administración de prueba' : 'Docente de prueba' },
      active: { booleanValue: true },
    } },
  })
  expect(profile.ok(), await profile.text()).toBeTruthy()
}

async function login(page: Page, email = adminEmail) {
  await page.goto('/iniciar-sesion')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel(/^Contraseña/).fill(password)
  await page.getByRole('button', { name: 'Entrar al panel' }).click()
  await expect(page).toHaveURL(/\/panel(?:\/|$)/)
  if (email === adminEmail) await expect(page.getByRole('navigation', { name: 'Panel académico' })).toBeVisible()
}

async function fillFields(dialog: Locator, fields: Record<string, string>) {
  for (const [name, value] of Object.entries(fields)) {
    const input = dialog.locator(`[name="${name}"]`)
    const tag = await input.evaluate((element) => element.tagName)
    if (tag === 'SELECT') await input.selectOption(value)
    else await input.fill(value)
  }
}

async function createRecord(page: Page, route: string, singular: string, fields: Record<string, string>) {
  await page.goto(route)
  await page.getByRole('button', { name: `+ Agregar ${singular}`, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: `Agregar ${singular}`, exact: true })
  await fillFields(dialog, fields)
  await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('status')).toContainText('correctamente')
}

async function selectedId(page: Page, route: string, singular: string, field: string, label: string) {
  await page.goto(route)
  await page.getByRole('button', { name: `+ Agregar ${singular}`, exact: true }).click()
  const dialog = page.getByRole('dialog')
  const value = await dialog.locator(`[name="${field}"] option`).filter({ hasText: label }).getAttribute('value')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect(value).toBeTruthy()
  return value!
}

test.describe.serial('Panel académico con Firestore y Authentication reales en emuladores', () => {
  test.beforeAll(async ({ request }) => {
    const clearFirestore = await request.delete(`http://127.0.0.1:8080/emulator/v1/projects/${project}/databases/(default)/documents`)
    expect(clearFirestore.ok(), 'El emulador local de Firestore debe estar iniciado').toBeTruthy()
    const clearAuth = await request.delete(`${authHost}/emulator/v1/projects/${project}/accounts`)
    expect(clearAuth.ok(), 'El emulador local de Authentication debe estar iniciado').toBeTruthy()
    await seedUser(request, adminEmail, 'admin')
    await seedUser(request, teacherEmail, 'teacher')
  })

  test('protege rutas privadas y rechaza un perfil sin rol administrador', async ({ page }) => {
    await page.goto('/panel/alumnos')
    await expect(page).toHaveURL(/\/iniciar-sesion$/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
    await login(page, teacherEmail)
    await expect(page.getByRole('heading', { name: 'Acceso al panel administrativo' })).toBeVisible()
    await expect(page.getByText('Tu cuenta no tiene acceso administrativo activo.')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Panel académico' })).not.toBeVisible()
    await page.getByRole('button', { name: 'Volver a iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/iniciar-sesion$/)
  })

  test('administra catálogos, expediente, inscripción y calificaciones con persistencia y auditoría', async ({ page, request }, testInfo) => {
    test.setTimeout(240_000)
    const runtimeErrors: string[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    await login(page)
    await expect(page.getByRole('navigation', { name: 'Panel académico' })).toBeVisible()
    await expect(page.getByText('No pudimos cargar el panel')).not.toBeVisible()

    await createRecord(page, '/panel/organizacion?tab=years', 'ciclo', {
      name: 'Ciclo de prueba 2026–2027', startDate: '2026-08-01', endDate: '2027-07-31', status: 'active',
    })
    await createRecord(page, '/panel/organizacion?tab=plans', 'plan', {
      name: 'Plan académico de prueba', version: 'v1', status: 'active',
    })
    for (const [specialty, name] of Object.entries({ general: 'Docente General QA', physical: 'Docente Física QA', english: 'Docente Inglés QA', arts: 'Docente Artes QA' })) {
      await createRecord(page, '/panel/docentes', 'docente', { name, specialty, email: `${specialty}@example.test`, phone: '6121234567', status: 'active' })
    }
    const yearId = await selectedId(page, '/panel/organizacion?tab=periods', 'periodo', 'schoolYearId', 'Ciclo de prueba')
    const planId = await selectedId(page, '/panel/organizacion?tab=subjects', 'materia', 'curriculumPlanId', 'Plan académico de prueba')
    await createRecord(page, '/panel/organizacion?tab=subjects', 'materia', {
      name: 'Matemáticas de prueba', curriculumPlanId: planId, grade: '1', specialty: 'general', status: 'active',
    })
    await createRecord(page, '/panel/organizacion?tab=periods', 'periodo', {
      schoolYearId: yearId, order: '1', name: 'Primer periodo QA', startDate: '2026-08-01', endDate: '2026-11-30', status: 'open',
    })
    await page.goto('/panel/organizacion?tab=groups')
    await page.getByRole('button', { name: '+ Agregar grupo', exact: true }).click()
    let dialog = page.getByRole('dialog', { name: 'Agregar grupo', exact: true })
    await fillFields(dialog, { schoolYearId: yearId, curriculumPlanId: planId, grade: '1', label: 'A', shift: 'matutino', status: 'active' })
    for (const specialty of ['general', 'physical', 'english', 'arts']) {
      await dialog.locator(`[name="${specialty}TeacherId"]`).selectOption({ index: 1 })
    }
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'Docente General QA' })).toContainText('1° A')

    await createRecord(page, '/panel/alumnos', 'alumno', {
      names: 'Alumna', surnames: 'Demostración Local', curp: 'DELA180101MBSMLN01', matricula: 'QA-0001', birthDate: '2018-01-01', sex: 'M', status: 'active',
    })
    await page.getByRole('button', { name: '+ Agregar alumno', exact: true }).click()
    dialog = page.getByRole('dialog', { name: 'Agregar alumno', exact: true })
    await fillFields(dialog, { names: 'Duplicado', surnames: 'No Guardar', curp: 'DELA180101MBSMLN01', matricula: 'QA-0002', birthDate: '2018-01-01', sex: 'M', status: 'active' })
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('Ya existe un alumno con esta CURP')
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await createRecord(page, '/panel/tutores', 'tutor', {
      name: 'Tutora Demostración Local', phone: '6121234567', email: 'tutora@example.test', address: 'Domicilio sintético de prueba', education: 'Licenciatura', occupation: 'Docencia', status: 'active',
    })
    await page.goto('/panel/alumnos')
    await page.getByRole('row').filter({ hasText: studentName }).getByRole('button', { name: 'Ver expediente' }).click()
    dialog = page.getByRole('dialog', { name: studentName, exact: true })
    await dialog.getByLabel(/^Tutor/).selectOption({ label: 'Tutora Demostración Local' })
    await dialog.getByLabel('Parentesco o relación *', { exact: true }).fill('Madre')
    await dialog.getByRole('button', { name: 'Guardar vínculo', exact: true }).click()
    await expect(dialog.getByRole('status')).toContainText('Vínculo de tutor guardado')
    await expect(dialog.getByText('Contacto principal', { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Cerrar ventana' }).click()

    await page.goto('/panel/inscripciones')
    // Names below intentionally use visible labels, matching the enrollment form.
    await page.getByRole('button', { name: '+ Inscribir alumno', exact: true }).click()
    await page.getByLabel(/^Alumno/).selectOption({ label: `${studentName} · QA-0001` })
    await page.getByLabel(/^Grupo/).selectOption({ label: '1° A · matutino · Ciclo de prueba 2026–2027' })
    await page.getByLabel(/^Fecha de inscripción \*/).fill('2026-09-01')
    await page.getByRole('button', { name: 'Guardar inscripción', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('correctamente')

    await page.goto('/panel/calificaciones')
    await page.getByLabel(/^Ciclo escolar/).selectOption(yearId)
    await page.getByLabel(/^Grupo/).selectOption({ label: '1° A · matutino' })
    await page.getByLabel(/^Periodo de evaluación/).selectOption({ label: 'Primer periodo QA · Abierto' })
    await page.getByLabel(/^Alumno inscrito/).selectOption({ label: studentName })
    await page.getByLabel(/^Materia/).selectOption({ label: 'Matemáticas de prueba' })
    await page.getByLabel(/^Calificación/).fill('8.4')
    await page.getByLabel('Observación (opcional)', { exact: true }).fill('Captura sintética de prueba.')
    await page.getByRole('button', { name: 'Guardar calificación', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Calificación guardada correctamente: 8.')
    const gradeRow = page.getByRole('row').filter({ hasText: studentName })
    await expect(gradeRow).toContainText('8.4')
    await gradeRow.getByRole('button', { name: 'Corregir', exact: true }).click()
    await page.getByLabel(/^Calificación/).fill('9.2')
    await page.getByLabel('Motivo de la corrección', { exact: true }).fill('Revisión administrativa de prueba.')
    await page.getByRole('button', { name: 'Guardar corrección', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Calificación guardada correctamente: 9.')
    await expect(gradeRow).toContainText('9.2')

    await page.reload()
    await page.getByLabel(/^Grupo/).selectOption({ label: '1° A · matutino' })
    await expect(page.getByRole('row').filter({ hasText: studentName })).toContainText('9.2')
    const storedGradesResponse = await request.get(`${firestore}/grades`, { headers: { Authorization: 'Bearer owner' } })
    expect(storedGradesResponse.ok()).toBeTruthy()
    const storedGrades = await storedGradesResponse.json()
    expect(storedGrades.documents).toHaveLength(1)
    const savedGrade = storedGrades.documents[0]
    expect(savedGrade.fields.score.doubleValue).toBe(9.2)
    const gradeId = savedGrade.name.split('/').at(-1)
    const historyResponse = await request.get(`${firestore}/grades/${gradeId}/history`, { headers: { Authorization: 'Bearer owner' } })
    expect(historyResponse.ok()).toBeTruthy()
    const history = await historyResponse.json()
    expect(history.documents).toHaveLength(1)
    expect(history.documents[0].fields.previousScore.doubleValue).toBe(8.4)
    expect(history.documents[0].fields.reason.stringValue).toBe('Revisión administrativa de prueba.')

    await page.goto('/panel/alumnos')
    await page.getByRole('row').filter({ hasText: studentName }).getByRole('button', { name: 'Ver expediente' }).click()
    dialog = page.getByRole('dialog', { name: studentName, exact: true })
    await dialog.getByRole('tab', { name: 'Historial académico' }).click()
    await expect(dialog.getByRole('row').filter({ hasText: 'Matemáticas de prueba' })).toContainText('9.2')
    await dialog.getByRole('button', { name: 'Cerrar ventana' }).click()
    await page.goto('/panel/actividad')
    await expect(page.getByRole('heading', { name: /Actividad/ }).first()).toBeVisible()
    await expect(page.locator('tbody tr')).not.toHaveCount(0)
    await expect(page.getByText('Calificación corregida', { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('actividad-desktop.png'), fullPage: true, animations: 'disabled' })

    await page.goto('/panel')
    await expect(page.getByText('Ciclo de prueba 2026–2027').first()).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('panel-desktop.png'), fullPage: true, animations: 'disabled' })
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
    await page.getByRole('navigation', { name: 'Panel académico' }).getByRole('link', { name: 'Calificaciones', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Calificaciones', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cerrar menú', exact: true })).not.toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy()
    await page.screenshot({ path: testInfo.outputPath('calificaciones-mobile.png'), fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
    await expect(page).toHaveURL(/\/iniciar-sesion$/)
    expect(runtimeErrors).toEqual([])
  })

  test('cierra periodos, conserva correcciones y el historial en cambios de grupo y bajas', async ({ page, request }) => {
    await login(page)
    await page.goto('/panel/organizacion?tab=periods')
    await page.getByRole('button', { name: 'Editar periodo Primer periodo QA', exact: true }).click()
    let dialog = page.getByRole('dialog', { name: 'Editar periodo', exact: true })
    await dialog.locator('[name="status"]').selectOption('closed')
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await page.goto('/panel/calificaciones')
    await page.getByLabel(/^Grupo/).selectOption({ label: '1° A · matutino' })
    await page.getByLabel(/^Periodo de evaluación/).selectOption({ label: 'Primer periodo QA · Cerrado' })
    await expect(page.getByRole('button', { name: 'Guardar calificación', exact: true })).toBeDisabled()
    await page.getByRole('row').filter({ hasText: studentName }).getByRole('button', { name: 'Corregir', exact: true }).click()
    await page.getByLabel(/^Calificación/).fill('9.5')
    await page.getByLabel('Motivo de la corrección', { exact: true }).fill('Corrección autorizada posterior al cierre, solo prueba.')
    await page.getByRole('button', { name: 'Guardar corrección', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Calificación guardada correctamente: 10.')

    await page.goto('/panel/organizacion?tab=groups')
    await page.getByRole('button', { name: '+ Agregar grupo', exact: true }).click()
    dialog = page.getByRole('dialog', { name: 'Agregar grupo', exact: true })
    await dialog.locator('[name="curriculumPlanId"]').selectOption({ index: 1 })
    await fillFields(dialog, { grade: '1', label: 'B', shift: 'matutino', status: 'active' })
    for (const specialty of ['general', 'physical', 'english', 'arts']) await dialog.locator(`[name="${specialty}TeacherId"]`).selectOption({ index: 1 })
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await page.goto('/panel/inscripciones')
    await page.getByRole('row').filter({ hasText: studentName }).getByRole('button', { name: 'Cambiar grupo', exact: true }).click()
    dialog = page.getByRole('dialog', { name: 'Cambiar de grupo', exact: true })
    await dialog.getByLabel(/^Nuevo grupo/).selectOption({ label: '1° B · matutino · Ciclo de prueba 2026–2027' })
    await dialog.getByLabel(/^Fecha de cambio \*/).fill('2026-09-16')
    await dialog.getByLabel('Motivo *', { exact: true }).fill('Traslado sintético de prueba.')
    await dialog.getByRole('button', { name: 'Confirmar cambio', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('status')).toContainText('Cambio de grupo registrado')
    await expect(page.getByRole('row').filter({ hasText: studentName })).toHaveCount(2)
    const currentEnrollment = page.getByRole('row').filter({ hasText: studentName }).filter({ hasText: '1° B' })
    await currentEnrollment.getByRole('button', { name: 'Dar de baja', exact: true }).click()
    dialog = page.getByRole('dialog', { name: 'Dar de baja la inscripción', exact: true })
    await dialog.getByLabel(/^Fecha de baja \*/).fill('2026-09-17')
    await dialog.getByLabel('Motivo *', { exact: true }).fill('Baja sintética para comprobar conservación del historial.')
    await dialog.getByRole('button', { name: 'Confirmar baja', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('status')).toContainText('Baja registrada')
    await expect(currentEnrollment).toContainText('Baja')
    await expect(page.getByRole('button', { name: 'Dar de baja', exact: true })).not.toBeVisible()
    await page.goto('/panel/alumnos')
    await page.getByRole('row').filter({ hasText: studentName }).getByRole('button', { name: 'Ver expediente' }).click()
    dialog = page.getByRole('dialog', { name: studentName, exact: true })
    await dialog.getByRole('tab', { name: 'Historial académico' }).click()
    await expect(dialog.getByRole('row').filter({ hasText: 'Matemáticas de prueba' })).toContainText('9.5')
    await expect(dialog.getByText('Cambio de grupo', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Baja', { exact: true })).toBeVisible()
    const gradeResponse = await request.get(`${firestore}/grades`, { headers: { Authorization: 'Bearer owner' } })
    const grades = await gradeResponse.json()
    expect(grades.documents).toHaveLength(1)
    expect(grades.documents[0].fields.version.integerValue).toBe('3')
    const gradeId = grades.documents[0].name.split('/').at(-1)
    const historyResponse = await request.get(`${firestore}/grades/${gradeId}/history`, { headers: { Authorization: 'Bearer owner' } })
    const history = await historyResponse.json()
    expect(history.documents).toHaveLength(2)
  })
})
