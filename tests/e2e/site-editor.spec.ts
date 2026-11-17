import { expect, test, type Page } from '@playwright/test'

// Fixed local addresses and demo project prevent any production data modification.
const project = 'demo-portal-academico'
const firestore = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`
const authHost = 'http://127.0.0.1:9099'
const password = 'PruebaLocal-12345'
const adminEmail = 'sitio@example.test'

async function login(page: Page) {
  await page.goto('/iniciar-sesion')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(adminEmail)
  await page.getByLabel(/^Contraseña/).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/panel/)
}

test.describe.serial('Sitio público editable', () => {
  test.beforeAll(async ({ request }) => {
    // En Windows el emulador a veces corta la primera conexión nueva: se reintenta una vez.
    const retry = <T>(call: () => Promise<T>) => call().catch(async () => { await new Promise((resolve) => setTimeout(resolve, 1000)); return call() })
    expect((await retry(() => request.delete(`http://127.0.0.1:8080/emulator/v1/projects/${project}/databases/(default)/documents`))).ok()).toBeTruthy()
    expect((await retry(() => request.delete(`${authHost}/emulator/v1/projects/${project}/accounts`))).ok()).toBeTruthy()
    const signup = await request.post(`${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, { data: { email: adminEmail, password, returnSecureToken: true } })
    const { localId } = await signup.json()
    const profile = await retry(() => request.patch(`${firestore}/users/${localId}`, {
      headers: { Authorization: 'Bearer owner' },
      data: { fields: { role: { stringValue: 'admin' }, email: { stringValue: adminEmail }, displayName: { stringValue: 'Dirección' }, active: { booleanValue: true } } },
    }))
    expect(profile.ok()).toBeTruthy()
  })

  test('el sitio público carga sin el código del panel y muestra páginas y 404', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const scripts: string[] = []
    page.on('request', (request) => { if (request.resourceType() === 'script') scripts.push(request.url()) })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Hugo César Piñeda Chacón/)
    await expect(page.locator('.hero-title').first()).toBeVisible()
    // El visitante no descarga Auth, el SDK completo de Firestore ni el panel.
    expect(scripts.filter((url) => /firebase[_-]auth|AdminArea|PrivateShell|firebase_firestore\.js|firebase-firestore-[^l]/.test(url))).toEqual([])
    await page.goto('/estudiantes')
    await expect(page).toHaveTitle(/^Estudiantes · /)
    await page.goto('/pagina-que-no-existe')
    await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('el director publica un cambio con vista previa y queda en la bitácora', async ({ page }) => {
    await login(page)
    await page.goto('/panel/sitio?seccion=home')
    const intro = page.getByLabel('Texto bajo el título «Galería»')
    await expect(intro).toBeVisible()
    const text = `Texto publicado desde la prueba ${Date.now()}`
    await intro.fill(text)
    // Si la vista previa está abierta (pantallas anchas), muestra el borrador antes de guardar.
    if (await page.locator('iframe[name="vista-previa-sitio"]').count()) {
      await expect(page.frameLocator('iframe[name="vista-previa-sitio"]').getByText(text)).toBeVisible()
    }
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(page.getByText('Cambios publicados. Ya se ven en el sitio.')).toBeVisible()

    await page.goto('/')
    await expect(page.getByText(text)).toBeVisible()

    await page.goto('/panel/actividad')
    await expect(page.getByText('Sitio web publicado', { exact: true }).first()).toBeVisible()
  })

  test('el editor rechaza direcciones inseguras', async ({ page }) => {
    await login(page)
    await page.goto('/panel/sitio?seccion=general')
    const facebook = page.getByLabel('Facebook')
    await expect(facebook).toBeVisible()
    await facebook.fill('javascript:alert(1)')
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'no es válida' })).toBeVisible()
  })
})
