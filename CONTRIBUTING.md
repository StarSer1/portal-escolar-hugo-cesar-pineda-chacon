# Guía de colaboración

## Preparar el proyecto

1. Clona el repositorio.
2. Usa Node.js y npm; el panel se desarrolla con Node.js 24.
3. Ejecuta `npm ci` desde la raíz: instala todas las dependencias declaradas para el sitio y Cloud Functions.
4. Copia `.env.example` a `.env.local` y solicita al responsable los valores de Firebase del entorno de desarrollo.
5. Ejecuta `npm run dev`.

No subas `node_modules`, `.env.local`, llaves privadas ni datos reales de estudiantes.

## Flujo de cambios

1. Actualiza tu rama `main` antes de comenzar.
2. Crea una rama descriptiva, por ejemplo `feature/registro-calificaciones`.
3. Ejecuta `npm run build` y `npm run lint`. Si cambias datos, permisos o recorridos, ejecuta también `npm run test:rules` y `npm run test:e2e` (Java 21 y Chrome).
4. Abre un *pull request* para revisión antes de integrar en `main`.

Las suites usan emuladores locales y datos ficticios; no cambies sus IDs `demo-` por un proyecto real. Ejecuta cada suite por separado. No despliegues el prototipo de `functions`: no forma parte del flujo actual del panel.
