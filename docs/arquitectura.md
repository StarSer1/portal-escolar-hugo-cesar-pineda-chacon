# Arquitectura del proyecto

## Capas

- `src/app`: composición global y rutas.
- `src/features`: funcionalidades agrupadas por dominio: autenticación, panel, gestión académica y calificaciones.
- `src/config`: integraciones externas, hoy Firebase.
- `src/shared`: componentes, páginas o utilidades reutilizables.
- `src/types`: contratos TypeScript para los datos.
- `functions`: prototipo de backend reservado para una fase con Cloud Functions; no interviene en el recorrido gratuito actual.

## Flujo de calificaciones

1. El administrador inicia sesión mediante Firebase Authentication.
2. El panel consulta su perfil `users/{uid}` en Firestore y comprueba su permiso de acceso. El recorrido actual no utiliza *custom claims*.
3. Los servicios del frontend consultan catálogos y relaciones de Firestore para presentar ciclo, grupo, inscripción, materia y periodo.
4. El servicio de calificaciones escribe mediante el SDK de Firestore; las reglas publicadas son la barrera de autorización, además de las comprobaciones de interfaz.
5. Los datos guardados se reutilizan en consultas e historial. Las vistas de docentes, alumnos y tutores requieren una implementación posterior de permisos restringidos.

## Integridad y trazabilidad

`AuthContext` verifica sesión y perfil activo, `RequireAdmin` protege las rutas y `AcademicContext` reúne las suscripciones a los catálogos. Esas barreras de interfaz no sustituyen `firestore.rules`, que valida cada operación incluso si se omite React.

Los catálogos y movimientos se escriben con transacciones y una entrada de `auditLogs` asociada. Las actualizaciones incrementan la revisión; las correcciones de calificación incrementan además su versión y escriben `grades/{id}/history` con valor anterior, valor nuevo, motivo y actor. No se ofrece borrado de historiales. Una corrección administrativa de una calificación existente puede realizarse en periodo cerrado si aporta motivo; una captura nueva no.

Las referencias técnicas mantienen restricciones entre documentos:

- `studentIdentifiers`: reserva CURP y matrícula únicas por alumno.
- `guardianSlots`: mantiene un único vínculo de tutor principal por alumno.
- `enrollmentSlots`: mantiene una inscripción activa por alumno y ciclo; los traslados conservan la anterior.
- `academicSettings/currentYear`: señala el único ciclo activo.

Las relaciones estructurales de grupos, materias y periodos no se reasignan al editar. Las fechas originales de un ciclo y la especialidad de un registro docente también son inmutables. Así, una edición no redefine silenciosamente el contexto del historial ya registrado.

La [guía del panel académico](panel-academico.md) explica la secuencia de configuración, la referencia a RASE y las funciones que permanecen pendientes. El [modelo conceptual inicial](analisis-base-datos-v1.md) incluye entidades futuras y no debe interpretarse como inventario de módulos implementados.

Firebase Hosting sirve la aplicación React. El navegador se conecta al proyecto indicado por las variables `VITE_FIREBASE_*`; utilizar `npm run dev` no aísla automáticamente la base de producción. Para ensayos separados debe habilitarse explícitamente la conexión a emuladores.

Con `VITE_USE_EMULATORS=true`, la configuración conecta Authentication a `127.0.0.1:9099` y Firestore a `127.0.0.1:8080`, y exige un proyecto con prefijo `demo-`. Las suites `npm run test:rules` y `npm run test:e2e` utilizan exclusivamente ese entorno local. El sitio y las reglas se comprueban con `npm run build`, `npm run lint` y ambas suites; las pruebas no habilitan planes de pago ni ejecutan Cloud Functions.

El contexto carga todos los documentos de las colecciones académicas y solo los últimos 100 de auditoría. Es una base funcional para esta etapa; paginación, consultas segmentadas y políticas de respaldo siguen siendo trabajo explícito para escalar. El directorio `functions` no debe desplegarse sin reemplazar y revisar su prototipo de permisos.

Nunca deben guardarse llaves privadas, contraseñas ni archivos `.env.local` en Git.
