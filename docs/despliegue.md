# Despliegue, seguridad y costos

Guía para publicar el portal en **Firebase Hosting** con el proyecto `portal-escolar-hugo-pineda`, que se usa tanto para pruebas como para producción.

- **Parte A** se puede hacer hoy con el plan gratuito (Spark).
- **Parte B** se hace cuando la escuela apruebe el presupuesto y se active el plan **Blaze**.

## Arquitectura en breve

```
Visitantes ──► Firebase Hosting (CDN global, HTTPS) ──► sitio público (React)
                                                          │ 1 lectura de `site` por visita (Firestore Lite)
Dirección / docentes ──► /panel, /docente (se descargan solo al entrar)
                          │ Firestore (reglas validan cada escritura)
                          │ Cloud Functions (con Blaze): alta de docentes y firma de subidas
                          └► Cloudinary: documentos y fotos del sitio
```

**Por qué aguanta picos de visitas** (por ejemplo, el día de inscripciones):

- **No hay servidor que se sature.** El sitio son archivos estáticos que reparte la red de Google (CDN). No hay "instancia" que dimensionar ni pagar por hora.
- **Cada visita hace como máximo 7 lecturas de Firestore**, una sola vez y sin conexión abierta. El contenido se guarda en el navegador para la siguiente visita.
- **El visitante descarga unos 130 KB comprimidos de código.** Antes eran unos 350 KB. Ya no recibe el panel, Firebase Auth ni el SDK completo de Firestore.
- **Las fotos se sirven en el tamaño de cada pantalla.** En celular, la foto principal pasó de 378 KB a 33 KB.
- **Los archivos con versión en el nombre (`/assets`) se guardan en el navegador un año.** Las páginas se revalidan en cada visita, así que al publicar una versión nueva nadie se queda con la anterior.

**Protecciones de seguridad incluidas:**

- Reglas de Firestore con validación de cada campo y bitácora obligatoria, incluido el contenido del sitio.
- Los docentes ya no pueden leer la CURP ni la fecha de nacimiento de los alumnos.
- Direcciones (URLs) saneadas tanto en el editor como en el sitio y en las reglas.
- Cabeceras de seguridad: CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`. HSTS lo agrega Firebase Hosting.
- Cierre de sesión por inactividad a los 30 minutos, pensado para computadoras compartidas.
- Recuperación de contraseña sin revelar qué correos existen.
- Reintento y caché si Firestore no responde.

---

## Parte A. Etapa de pruebas (plan Spark, sin costo)

### A1. Publicar reglas, índices y sitio

Desde la raíz del proyecto, con `npx firebase login` hecho:

```powershell
npm ci
npm run deploy:rules        # reglas e índices de Firestore
npm run deploy:hosting      # compila y publica el sitio
```

El sitio queda en **https://portal-escolar-hugo-pineda.web.app**. `npm run deploy` hace ambos pasos a la vez. **No uses `firebase deploy` sin opciones**: intentaría publicar también las Cloud Functions, que requieren Blaze.

### A2. Migración de inscripciones (una sola vez)

El panel docente ahora toma el nombre del alumno de la inscripción. Las inscripciones creadas antes de este cambio no lo tienen. Para copiarlo:

```powershell
node scripts/backfill-enrollment-names.mjs --project portal-escolar-hugo-pineda
node scripts/backfill-enrollment-names.mjs --project portal-escolar-hugo-pineda --apply --confirm portal-escolar-hugo-pineda
```

El primer comando solo muestra cuántas inscripciones se actualizarían. Las inscripciones nuevas ya se guardan con el nombre.

### A3. Configuración en consolas

- **Cloudinary:** activa *Allow delivery of PDF and ZIP files* y los límites del preset. Ver [cloudinary.md](cloudinary.md).
- **Firebase Authentication → Settings:**
  - Activa **Email enumeration protection**.
  - En **Password policy**, exige al menos 12 caracteres.
  - En **Authorized domains**, verifica que aparezcan `portal-escolar-hugo-pineda.web.app` y `portal-escolar-hugo-pineda.firebaseapp.com`.
- **Firebase Authentication → Templates:** traduce al español el correo de *Restablecimiento de contraseña* y pon el nombre de la escuela como remitente.

### A4. Qué probar

| Área | Prueba |
|---|---|
| Sitio público | Las 6 páginas en celular y computadora; abrir cada PDF; mapa en Contáctanos; una dirección inexistente muestra la página 404. |
| Editor | Cambiar un texto, ver la vista previa y guardar; subir una foto y un PDF; quitar un documento. Revisar que el cambio aparezca en **Actividad** como «Sitio web publicado». |
| Conflictos | Abrir el editor en dos computadoras, guardar en una y luego en la otra: la segunda debe avisar que otra persona guardó. |
| Dirección | Alta de ciclo, grupos, alumnos, tutores, inscripción, calificación y corrección. Escala de 5 a 10: un 4.9 debe rechazarse. |
| Docentes | Alta de cuenta, primer acceso, cambio de contraseña, captura de calificaciones y lista de alumnos con nombre. |
| Sesión | Dejar el panel 25 minutos sin usar (aparece el aviso) y 30 minutos (se cierra la sesión). «¿Olvidaste tu contraseña?» envía el correo. |
| Picos | Abrir el sitio en muchos celulares a la vez. En la consola de Firebase, **Firestore → Usage**, las lecturas deben subir unas 7 por visita. |

### A5. Pruebas automáticas

Necesitan Java 21 y Google Chrome. En GitHub corren solas con cada cambio (`.github/workflows/ci.yml`).

```powershell
npm run lint; npm run build; npm run test:rules; npm run test:e2e
```

---

## Parte B. Salida a producción (plan Blaze)

### B1. Activar Blaze con alertas de presupuesto

1. En la consola de Firebase, abre **⚙ → Uso y facturación → Detalles y configuración → Modificar plan → Blaze** y vincula la cuenta de facturación de la escuela.
2. En Google Cloud, abre **Facturación → Presupuestos y alertas** y crea un presupuesto mensual, por ejemplo de 10 USD, con avisos al 50 %, 90 % y 100 %.

   Un presupuesto **avisa pero no detiene** el servicio.

### B2. Cloud Functions

1. Configura la firma de Cloudinary como indica [cloudinary.md](cloudinary.md#3-modo-firmado-producción-con-blaze).
2. Despliega las funciones:

   ```powershell
   npm run deploy:functions
   ```

3. En el entorno de compilación (`.env.local` de quien despliega), agrega:

   ```
   VITE_TEACHER_PROVISIONING=functions
   VITE_UPLOAD_SIGNING=signed
   ```

   Después ejecuta `npm run deploy`.
4. Prueba dar de alta un docente y subir una foto.

### B3. Cerrar el registro público de cuentas

Con las funciones activas, las cuentas docentes las crea el servidor. Para cerrar el registro público:

1. En **Authentication → Settings**, acepta la actualización a **Identity Platform**. Es gratuita dentro de su cuota mensual de usuarios activos para correo y contraseña.
2. En **User actions**, desactiva **Enable create (sign-up)**.

### B4. Verificación en dos pasos para el director

Requiere Identity Platform. En **Authentication → Sign-in method → Advanced → Multi-factor authentication**, activa TOTP (app como Google Authenticator) y pide a cada director que la configure.

### B5. App Check (protección contra scripts y bots)

1. En **App Check**, registra la app web con **reCAPTCHA Enterprise** y copia la clave del sitio.
2. Pon `VITE_APPCHECK_SITE_KEY=<clave>` y ejecuta `npm run deploy`.
3. Observa las métricas de App Check durante una semana. Cuando casi todas las peticiones sean «verificadas», pulsa **Enforce** para Firestore y Authentication.
4. Para las funciones, crea `functions/.env.portal-escolar-hugo-pineda` con `ENFORCE_APP_CHECK=true` y vuelve a ejecutar `npm run deploy:functions`.

### B6. Respaldos

En **Firestore → Disaster recovery**, crea **copias de seguridad programadas** diarias con retención de 14 días. Si se borra o daña información, se restaura desde ahí.

### B7. Dominio propio (opcional)

1. En **Hosting → Add custom domain**, agrega el dominio (por ejemplo `hugocesarpineda.edu.mx`) y crea los registros DNS que indique la consola. El certificado HTTPS es automático.
2. Pon `VITE_SITE_URL=https://tu-dominio` y ejecuta `npm run deploy`.
3. Agrega el dominio en **Authentication → Settings → Authorized domains**.

### B8. Limpieza de datos de prueba

Como pruebas y producción comparten proyecto, antes del arranque oficial hay que borrar los registros académicos de prueba:

```powershell
node scripts/reset-demo-data.mjs --project portal-escolar-hugo-pineda
node scripts/reset-demo-data.mjs --project portal-escolar-hugo-pineda --purge --confirm portal-escolar-hugo-pineda
```

- El primer comando solo muestra el inventario.
- El segundo guarda un respaldo en `.backups/` y borra los registros académicos y las cuentas docentes de prueba. Nunca borra a los administradores.
- El contenido del sitio (`site`) no se toca.
- Después de usarlo, elimina el respaldo local: contiene datos personales.

---

## Estimación de costos mensuales (plan Blaze)

> Estos precios son de referencia (noviembre de 2026) y pueden cambiar. Confírmalos en [firebase.google.com/pricing](https://firebase.google.com/pricing) y en la [página de precios de Firestore](https://cloud.google.com/firestore/pricing). Blaze conserva las cuotas gratuitas del plan Spark y solo cobra el excedente.

| Servicio | Cuota gratuita (aprox.) | Uso esperado de la escuela | Costo estimado |
|---|---|---|---|
| Firestore: lecturas | 50,000/día | Visitas: 7 lecturas cada una (un pico de 5,000 visitas ≈ 35,000). Panel: unas 20,000 por cada vez que se abre al final del ciclo. | 0 – 2 USD (≈ 0.03 USD por cada 100,000 lecturas extra) |
| Firestore: escrituras y almacenamiento | 20,000/día · 1 GiB | Capturas y altas: cientos al día; menos de 1 GiB | 0 USD |
| Hosting: transferencia | 10 GB/mes | ~0.5 MB por primera visita; las visitas repetidas usan caché. Más descargas de PDF. | 0 – 3 USD (≈ 0.15 USD/GB extra) |
| Cloud Functions | 2 millones de invocaciones/mes | Unas cuantas al día (altas y subidas) | 0 USD |
| Identity Platform (correo y contraseña) | Cuota mensual de usuarios activos | Decenas de cuentas | 0 USD |
| Copias de seguridad de Firestore | No incluidas | Según el tamaño de la base (pocos MB) | < 1 USD |
| Cloudinary (aparte de Firebase) | ~25 créditos/mes | Fotos y documentos del sitio | 0 USD |
| Dominio propio (opcional, aparte) | No aplica | 1 dominio | Pago anual al registrador, según el dominio |

**Total esperado: de 0 a 5 USD al mes.** Un presupuesto con alerta de 10 USD da margen para picos. No se paga ninguna "instancia de servidor": Hosting es por uso.

**Lo que más podría elevar el costo:**

- **Abrir el panel de dirección muchas veces al día**, porque cada carga lee los catálogos y las calificaciones del ciclo.
- **Descargas masivas del PDF de 8 MB.** Conviene comprimirlo (ver abajo).

## Mantenimiento

- **Fotos nuevas en `public/img`:** ejecuta `npm run optimize:images` antes de publicar para generar sus versiones ligeras. Las fotos que sube el director a Cloudinary se optimizan solas.
- **PDF grandes:** comprímelos antes de subirlos, por ejemplo con Ghostscript:

  ```
  gswin64c -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -o salida.pdf entrada.pdf
  ```

  También sirve una herramienta en línea de confianza. `protocolo-erradicacion-maltrato.pdf` pesa 8 MB y bajaría a 1–2 MB.
- **Después de cada `npm run deploy`:** abre el sitio en una ventana privada y revisa la consola del navegador. No debe haber avisos de *Content Security Policy*.

  Si se agrega un servicio externo nuevo, como otro mapa o un video, hay que permitirlo en la cabecera CSP de `firebase.json`.
