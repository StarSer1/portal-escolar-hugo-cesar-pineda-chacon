# Portal Escolar — Escuela Primaria Hugo César Piñeda Chacón

Plataforma institucional y académica desarrollada con React, TypeScript y Firebase.

## Requisitos

- Node.js y npm (el panel se desarrolla con Node.js 24).
- Un proyecto Firebase para el entorno conectado, o los emuladores para pruebas locales.
- Java 21 para los emuladores. Las pruebas de navegador utilizan Google Chrome.

## Inicio rápido

Después de clonar el repositorio, ejecuta desde su raíz:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Antes de iniciar Vite, completa `.env.local` con la configuración del proyecto correspondiente. Si el archivo ya existe, no vuelvas a copiarlo encima. `npm ci` instala de una vez todas las dependencias fijadas en `package-lock.json`; tu colega no necesita instalarlas individualmente.

Abre `/iniciar-sesion` y usa una cuenta existente de Authentication con perfil `users/{uid}` que tenga `role: 'admin'` y `active: true`. El panel no crea usuarios administradores desde el navegador. La [guía del panel académico](docs/panel-academico.md) explica cómo configurar los catálogos, inscribir alumnos y capturar calificaciones.

**Importante:** `npm run dev` usa la base configurada en `.env.local`. No significa que la información quede solo en tu computadora. Las pruebas automatizadas de abajo configuran un entorno local aislado y no necesitan cuentas reales.

## Comandos principales

- `npm run dev`: servidor local.
- `npm run build`: valida TypeScript y genera la versión de producción.
- `npm run build:functions`: compila el prototipo reservado de Cloud Functions; no desplegarlo en esta entrega.
- `npm run lint`: revisa el código.
- `npm run emulators`: inicia Authentication y Firestore locales con un proyecto de demostración.
- `npm run test:rules`: inicia el emulador y prueba autorización, relaciones y auditoría.
- `npm run test:e2e`: inicia emuladores y recorre el panel con Playwright y Chrome.
- `npm run deploy:rules`: publica únicamente las reglas de seguridad.

Para verificar una modificación, ejecuta `npm run build`, `npm run lint`, `npm run test:rules` y `npm run test:e2e`. Ejecuta las suites por separado y sin otros emuladores ocupando sus puertos. Los datos de prueba se borran y regeneran únicamente en proyectos locales `demo-`; nunca sustituyas estos por el ID de producción. Playwright guarda capturas y trazas en `test-results/`, excluido de Git.

Iniciar emuladores no cambia por sí mismo la conexión de un servidor Vite ya abierto. Para desarrollar manualmente contra ellos debes usar `VITE_USE_EMULATORS=true` y el proyecto `demo-portal-academico` en `.env.local`, con valores de configuración ficticios; luego reinicia Vite. Las suites ya suministran esa configuración automáticamente.

Consulta `docs/arquitectura.md` para conocer la organización y el flujo del sistema.

## Trabajo en equipo

Las dependencias no se guardan en Git. Después de clonar el repositorio, ejecuta `npm ci`: instalará todas las versiones exactas indicadas en `package-lock.json`, incluido el paquete de Cloud Functions. Después crea tu archivo `.env.local` a partir de `.env.example`.

El archivo `.env.local` no se comparte por Git porque contiene la configuración de cada entorno. El administrador del proyecto debe dar acceso al colega tanto al repositorio de GitHub como al proyecto de Firebase cuando necesite administrar Authentication, Firestore, Storage o Functions.

Esta versión incluye alumnos, tutores y vínculos, docentes, ciclos, planes, materias, grupos, periodos, inscripciones, calificaciones y actividad. Las cuentas restringidas de docentes/familias, documentos oficiales, asistencia e integración SEP quedan pendientes; no se debe compartir una cuenta administradora para suplir esos permisos.
