import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Synthetic fixtures are written exclusively to the fixed local emulators.
const project = 'demo-portal-academico'
const firestore = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`
const authHost = 'http://127.0.0.1:9099'
const adminEmail = 'direccion.docentes@example.test'
const teacherEmail = 'docente.nuevo@example.test'
const password = 'PruebaDocente-12345'
const timestamp = '2026-08-01T00:00:00Z'
let teacherId = ''
let teacherUid = ''
let activeTeacherPassword = password

function fieldsOf(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key,
    value === null ? { nullValue: null } :
      typeof value === 'boolean' ? { booleanValue: value } :
        typeof value === 'number' ? { integerValue: String(value) } :
          { stringValue: String(value) },
  ]))
}

async function seed(request: APIRequestContext, path: string, data: Record<string, unknown>, academic = false) {
  const fields = fieldsOf(data)
  if (academic) Object.assign(fields, {
    createdAt: { timestampValue: timestamp }, updatedAt: { timestampValue: timestamp },
    updatedBy: { stringValue: 'fixture' }, revision: { integerValue: '1' }, auditId: { stringValue: 'fixture' },
  })
  const response = await request.patch(`${firestore}/${path}`, {
    headers: { Authorization: 'Bearer owner' }, data: { fields },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
}

async function documents(request: APIRequestContext, collection: string) {
  const response = await request.get(`${firestore}/${collection}`, { headers: { Authorization: 'Bearer owner' } })
  expect(response.ok(), await response.text()).toBeTruthy()
  const body = await response.json()
  return body.documents ?? []
}

async function login(page: Page, email: string, route: RegExp) {
  await page.goto('/iniciar-sesion')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel(/^Contraseña/).fill(email === teacherEmail ? activeTeacherPassword : password)
  await page.getByRole('button', { name: 'Entrar al panel', exact: true }).click()
  await expect(page).toHaveURL(route)
}

async function newTeacher(page: Page, email: string, name: string) {
  await page.getByRole('button', { name: 'Agregar docente', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Agregar docente', exact: true })
  await dialog.locator('[name="name"]').fill(name)
  await dialog.locator('[name="email"]').fill(email)
  await dialog.locator('[name="specialty"]').selectOption('general')
  await dialog.locator('[name="password"]').fill(password)
  await dialog.locator('[name="confirmPassword"]').fill(password)
  await dialog.getByRole('button', { name: 'Crear docente y acceso', exact: true }).click()
  return dialog
}

test.describe.serial('Cuentas docentes y separación de permisos', () => {
  test.beforeAll(async ({ request }) => {
    expect((await request.delete(`http://127.0.0.1:8080/emulator/v1/projects/${project}/databases/(default)/documents`)).ok()).toBeTruthy()
    expect((await request.delete(`${authHost}/emulator/v1/projects/${project}/accounts`)).ok()).toBeTruthy()
    const signup = await request.post(`${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
      data: { email: adminEmail, password, returnSecureToken: true },
    })
    expect(signup.ok(), await signup.text()).toBeTruthy()
    const { localId } = await signup.json()
    await seed(request, `users/${localId}`, { role: 'admin', active: true, email: adminEmail, displayName: 'Dirección QA' })
    for (const id of ['legacy-one', 'legacy-two']) await seed(request, `teachers/${id}`, {
      name: id === 'legacy-one' ? 'Docente anterior Uno' : 'Docente anterior Dos', email: 'repetido@example.test',
      phone: '', specialty: 'general', status: 'active',
    }, true)
  })

  test('crea la cuenta sin cerrar sesión del director y rechaza correos repetidos', async ({ page, request, browser }) => {
    await login(page, adminEmail, /\/panel(?:\/|$)/)
    await page.goto('/panel/docentes')
    await expect(page.getByText(/Hay correos repetidos en los registros anteriores/)).toBeVisible()
    const originalAccounts = await request.get(`${authHost}/identitytoolkit.googleapis.com/v1/projects/${project}/accounts:batchGet`, { headers: { Authorization: 'Bearer owner' } })
    expect(originalAccounts.ok(), await originalAccounts.text()).toBeTruthy()
    expect((await originalAccounts.json()).users).toHaveLength(1)

    const dialog = await newTeacher(page, '  DOCENTE.NUEVO@EXAMPLE.TEST  ', 'Docente General con Acceso')
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Panel académico' })).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'Docente General con Acceso' })).toContainText(teacherEmail)

    const teachers = await documents(request, 'teachers')
    const teacher = teachers.find((item: { fields: { email: { stringValue: string } } }) => item.fields.email.stringValue === teacherEmail)
    expect(teacher).toBeTruthy()
    teacherId = teacher.name.split('/').at(-1)
    teacherUid = teacher.fields.authUid.stringValue
    expect(teacherUid).toBeTruthy()
    const profiles = await documents(request, 'users')
    const profile = profiles.find((item: { name: string }) => item.name.endsWith(`/${teacherUid}`))
    expect(profile.fields.role.stringValue).toBe('teacher')
    expect(profile.fields.teacherId.stringValue).toBe(teacherId)
    const reservations = await documents(request, 'teacherEmails')
    expect(reservations.some((item: { fields: { teacherId: { stringValue: string } } }) => item.fields.teacherId.stringValue === teacherId)).toBeTruthy()
    const accounts = await request.get(`${authHost}/identitytoolkit.googleapis.com/v1/projects/${project}/accounts:batchGet`, { headers: { Authorization: 'Bearer owner' } })
    expect(accounts.ok(), await accounts.text()).toBeTruthy()
    expect((await accounts.json()).users).toHaveLength(2)
    for (const record of teachers.filter((item: { name: string }) => /legacy-/.test(item.name))) expect(record.fields.authUid).toBeUndefined()
    const audit = await documents(request, 'auditLogs')
    const allStoredData = JSON.stringify({ teachers, profiles, reservations, audit })
    expect(allStoredData).not.toContain(password)
    expect(allStoredData).not.toMatch(/"password"|"contraseña"|"passwordHash"/i)

    const duplicate = await newTeacher(page, 'DOCENTE.NUEVO@EXAMPLE.TEST', 'Duplicado prohibido')
    await expect(duplicate.getByRole('alert')).toContainText(/correo.*(registrado|existe|utiliza|asignado|uso)|existe.*correo/i)
    await duplicate.getByRole('button', { name: 'Cancelar', exact: true }).click()
    expect(await documents(request, 'teachers')).toHaveLength(3)
    // An existing Authentication account without a teacher file is also protected.
    const existingAuth = await newTeacher(page, adminEmail, 'No reemplazar Dirección')
    await expect(existingAuth.getByRole('alert')).toContainText('Ese correo ya tiene una cuenta en el portal')
    await existingAuth.getByRole('button', { name: 'Cancelar', exact: true }).click()
    expect(await documents(request, 'teachers')).toHaveLength(3)
    const unchangedProfiles = await documents(request, 'users')
    expect(unchangedProfiles.find((item: { fields: { email: { stringValue: string } } }) => item.fields.email.stringValue === adminEmail).fields.role.stringValue).toBe('admin')
    await page.reload()
    await expect(page.getByRole('navigation', { name: 'Panel académico' })).toBeVisible()
    const teacherContext = await browser.newContext()
    try {
      const teacherPage = await teacherContext.newPage()
      await login(teacherPage, teacherEmail, /\/docente(?:\/|$)/)
      await expect(teacherPage.getByRole('heading', { name: 'Sin grupos asignados', exact: true })).toBeVisible()
      await expect(teacherPage.getByRole('button', { name: 'Guardar calificación', exact: true })).not.toBeVisible()
    } finally { await teacherContext.close() }
  })

  test('el docente solo consulta grupos asignados y captura su especialidad en periodos abiertos', async ({ page, request }, testInfo) => {
    const baseTeacher = { phone: '', status: 'active' }
    for (const specialty of ['physical', 'english', 'arts']) await seed(request, `teachers/${specialty}`, { ...baseTeacher, name: `Especialista ${specialty}`, email: `${specialty}@example.test`, specialty }, true)
    await seed(request, 'schoolYears/year', { name: 'Ciclo docente QA', startDate: '2026-08-01', endDate: '2027-07-31', status: 'active' }, true)
    await seed(request, 'academicSettings/currentYear', { schoolYearId: 'year', updatedBy: 'fixture' })
    await seed(request, 'curriculumPlans/plan', { name: 'Plan docente QA', version: '1', status: 'active' }, true)
    const group = { schoolYearId: 'year', curriculumPlanId: 'plan', grade: 1, shift: 'matutino', status: 'active', physicalTeacherId: 'physical', englishTeacherId: 'english', artsTeacherId: 'arts' }
    await seed(request, 'groups/assigned', { ...group, label: 'A', generalTeacherId: teacherId }, true)
    await seed(request, 'groups/forbidden', { ...group, label: 'B', generalTeacherId: 'legacy-one' }, true)
    for (const [id, specialty, name] of [['math', 'general', 'Matemáticas QA'], ['english', 'english', 'Inglés QA']]) await seed(request, `subjectPlans/${id}`, { curriculumPlanId: 'plan', grade: 1, name, specialty, status: 'active' }, true)
    const period = { schoolYearId: 'year', startDate: '2026-08-01', endDate: '2026-11-30' }
    await seed(request, 'gradingPeriods/year_1', { ...period, order: 1, name: 'Abierto QA', status: 'open' }, true)
    await seed(request, 'gradingPeriods/year_2', { ...period, order: 2, name: 'Cerrado QA', status: 'closed', startDate: '2026-12-01', endDate: '2027-03-31' }, true)
    for (const [id, groupId] of [['visible', 'assigned'], ['hidden', 'forbidden']]) {
      await seed(request, `students/${id}`, { names: id === 'visible' ? 'Alumna Visible' : 'Alumna Oculta', surnames: 'QA', curp: 'TEST180101MBSXXX01', birthDate: '2018-01-01', sex: 'M', matricula: id, status: 'active' }, true)
      await seed(request, `enrollments/${id}`, { studentId: id, groupId, schoolYearId: 'year', startDate: '2026-09-01', endDate: '', status: 'active', reason: '' }, true)
      await seed(request, `enrollmentSlots/${id}_year`, { studentId: id, schoolYearId: 'year', currentEnrollmentId: id, previousEnrollmentId: '', updatedBy: 'fixture' })
    }

    await login(page, teacherEmail, /\/docente(?:\/|$)/)
    await expect(page.getByRole('heading', { name: 'Mi panel docente', exact: true })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Panel académico' })).not.toBeVisible()
    await expect(page.getByText('Alumna Oculta QA', { exact: true })).not.toBeVisible()
    await page.getByRole('combobox', { name: 'Grupo asignado', exact: true }).selectOption('assigned')
    await expect(page.getByRole('combobox', { name: 'Grupo asignado', exact: true }).locator('option[value="forbidden"]')).toHaveCount(0)
    await page.getByRole('combobox', { name: 'Periodo de evaluación', exact: true }).selectOption('year_1')
    await page.getByRole('combobox', { name: 'Alumno inscrito', exact: true }).selectOption('visible')
    await page.getByRole('combobox', { name: 'Materia', exact: true }).selectOption('math')
    await expect(page.getByRole('combobox', { name: 'Materia', exact: true }).locator('option[value="english"]')).toHaveCount(0)
    await page.getByLabel(/^Calificación/).fill('8.5')
    await page.getByLabel('Observación (opcional)', { exact: true }).fill('Evaluación docente de prueba local.')
    await page.getByRole('button', { name: 'Guardar calificación', exact: true }).click()
    await expect(page.getByRole('status')).toContainText(/guardada/i)
    const grades = await documents(request, 'grades')
    expect(grades).toHaveLength(1)
    expect(grades[0].fields.teacherId.stringValue).toBe(teacherId)
    expect(grades[0].fields.updatedBy.stringValue).toBe(teacherUid)
    expect(grades[0].fields.subjectPlanId.stringValue).toBe('math')
    await expect(page.getByRole('button', { name: 'Corregir', exact: true })).not.toBeVisible()
    await page.reload()
    await page.getByRole('combobox', { name: 'Grupo asignado', exact: true }).selectOption('assigned')
    await expect(page.getByRole('row').filter({ hasText: 'Matemáticas QA' })).toContainText('8.5')
    await page.getByRole('combobox', { name: 'Periodo de evaluación', exact: true }).selectOption('year_2')
    await expect(page.getByText('El periodo está cerrado. La captura de nuevas calificaciones está bloqueada.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar calificación', exact: true })).toBeDisabled()
    await page.screenshot({ path: testInfo.outputPath('panel-docente.png'), fullPage: true })
    await page.goto('/panel/docentes')
    await expect(page.getByRole('navigation', { name: 'Panel académico' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Agregar docente', exact: true })).not.toBeVisible()
  })

  test('habilita un docente anterior sin reemplazar su expediente ni los duplicados históricos', async ({ page, request }) => {
    await login(page, adminEmail, /\/panel(?:\/|$)/)
    await page.goto('/panel/docentes')
    const row = page.getByRole('row').filter({ hasText: 'Docente anterior Uno' })
    await row.getByRole('button', { name: 'Editar docente Docente anterior Uno', exact: true }).click()
    let dialog = page.getByRole('dialog', { name: 'Editar docente', exact: true })
    await dialog.locator('[name="email"]').fill('docente.anterior.uno@example.test')
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await row.getByRole('button', { name: 'Habilitar acceso', exact: true }).click()
    dialog = page.getByRole('dialog', { name: 'Habilitar acceso', exact: true })
    await dialog.locator('[name="password"]').fill(password)
    await dialog.locator('[name="confirmPassword"]').fill(password)
    await dialog.getByRole('button', { name: 'Crear acceso', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    const teachers = await documents(request, 'teachers')
    const previous = teachers.find((item: { name: string }) => item.name.endsWith('/legacy-one'))
    const duplicate = teachers.find((item: { name: string }) => item.name.endsWith('/legacy-two'))
    expect(previous.fields.authUid.stringValue).toBeTruthy()
    expect(previous.fields.email.stringValue).toBe('docente.anterior.uno@example.test')
    expect(duplicate.fields.email.stringValue).toBe('repetido@example.test')
    expect(duplicate.fields.authUid).toBeUndefined()
    expect(teachers).toHaveLength(6)
    const profiles = await documents(request, 'users')
    expect(profiles.some((item: { fields: { teacherId?: { stringValue: string } } }) => item.fields.teacherId?.stringValue === 'legacy-one')).toBeTruthy()
  })

  test('el docente cambia su propia contraseña sin almacenarla en Firestore', async ({ page, request }) => {
    await login(page, teacherEmail, /\/docente(?:\/|$)/)
    await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Cambiar mi contraseña', exact: true })
    const changedPassword = 'NuevaClaveLocal-54321'
    await dialog.getByLabel('Contraseña actual', { exact: true }).fill(activeTeacherPassword)
    await dialog.getByLabel(/^Nueva contraseña/).fill(changedPassword)
    await dialog.getByLabel('Confirmar nueva contraseña', { exact: true }).fill('OtraClaveLocal-54321')
    await dialog.getByRole('button', { name: 'Actualizar contraseña', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('La confirmación no coincide')
    await dialog.getByLabel('Confirmar nueva contraseña', { exact: true }).fill(changedPassword)
    await dialog.getByRole('button', { name: 'Actualizar contraseña', exact: true }).click()
    await expect(dialog.getByRole('status')).toContainText('Tu contraseña se actualizó correctamente')
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
    await expect(page).toHaveURL(/\/iniciar-sesion$/)
    const oldLogin = await request.post(`${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
      data: { email: teacherEmail, password: activeTeacherPassword, returnSecureToken: true },
    })
    expect(oldLogin.ok()).toBeFalsy()
    activeTeacherPassword = changedPassword
    await login(page, teacherEmail, /\/docente(?:\/|$)/)
    await expect(page.getByRole('heading', { name: 'Mi panel docente', exact: true })).toBeVisible()
    for (const collection of ['teachers', 'users', 'teacherEmails', 'auditLogs']) {
      expect(JSON.stringify(await documents(request, collection))).not.toContain(changedPassword)
    }
  })

  test('recupera un alta incompleta si el expediente cambia durante la operación', async ({ page, request }) => {
    await login(page, adminEmail, /\/panel(?:\/|$)/)
    await page.goto('/panel/docentes')
    const accountsUrl = `${authHost}/identitytoolkit.googleapis.com/v1/projects/${project}/accounts:batchGet`
    const originalAccounts = await request.get(accountsUrl, { headers: { Authorization: 'Bearer owner' } })
    expect(originalAccounts.ok()).toBeTruthy()
    const accountCount = (await originalAccounts.json()).users.length
    const row = page.getByRole('row').filter({ hasText: 'Docente anterior Dos' })
    await row.getByRole('button', { name: 'Habilitar acceso', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Habilitar acceso', exact: true })
    await dialog.locator('[name="password"]').fill(password)
    await dialog.locator('[name="confirmPassword"]').fill(password)
    // Preserve the rest of the synthetic record, but invalidate the open form's revision.
    const concurrentUpdate = await request.patch(`${firestore}/teachers/legacy-two?updateMask.fieldPaths=revision`, {
      headers: { Authorization: 'Bearer owner' }, data: { fields: { revision: { integerValue: '2' } } },
    })
    expect(concurrentUpdate.ok()).toBeTruthy()
    await dialog.getByRole('button', { name: 'Crear acceso', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('Otra persona modificó el docente')
    const finalAccounts = await request.get(accountsUrl, { headers: { Authorization: 'Bearer owner' } })
    expect(finalAccounts.ok()).toBeTruthy()
    const users = (await finalAccounts.json()).users
    expect(users).toHaveLength(accountCount)
    expect(users.some((user: { email: string }) => user.email === 'repetido@example.test')).toBeFalsy()
    const legacyTeacher = (await documents(request, 'teachers')).find((item: { name: string }) => item.name.endsWith('/legacy-two'))
    expect(legacyTeacher.fields.authUid).toBeUndefined()
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('navigation', { name: 'Panel académico' })).toBeVisible()
  })

  test('inactivar el expediente revoca el acceso docente sin borrar sus calificaciones', async ({ page, request, browser }) => {
    await login(page, teacherEmail, /\/docente(?:\/|$)/)
    await expect(page.getByRole('heading', { name: 'Mi panel docente', exact: true })).toBeVisible()
    const adminContext = await browser.newContext()
    try {
      const admin = await adminContext.newPage()
      await login(admin, adminEmail, /\/panel(?:\/|$)/)
      await admin.goto('/panel/docentes')
      await admin.getByRole('button', { name: 'Editar docente Docente General con Acceso', exact: true }).click()
      const dialog = admin.getByRole('dialog', { name: 'Editar docente', exact: true })
      await dialog.locator('[name="status"]').selectOption('inactive')
      await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
      await expect(dialog).not.toBeVisible()
    } finally {
      await adminContext.close()
    }
    await expect(page.getByRole('heading', { name: 'Acceso docente no disponible', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar calificación', exact: true })).not.toBeVisible()
    expect(await documents(request, 'grades')).toHaveLength(1)
  })
})
