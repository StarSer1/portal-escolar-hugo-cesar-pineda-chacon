# Arquitectura del proyecto

## Capas

- `src/app`: composición global y rutas.
- `src/features`: funcionalidades agrupadas por dominio. Añade aquí `students`, `grades`, `groups`, `subjects` y `announcements` cuando se implementen.
- `src/config`: integraciones externas, hoy Firebase.
- `src/shared`: componentes, páginas o utilidades reutilizables.
- `src/types`: contratos TypeScript para los datos.
- `functions`: backend de confianza; valida y registra operaciones delicadas.

## Flujo de calificaciones

1. El docente inicia sesión mediante Firebase Authentication.
2. Firebase asigna el rol del usuario mediante *custom claims* (`teacher`, `admin`, etc.).
3. El panel React solicita guardar una calificación mediante la función `saveGrade`.
4. Cloud Functions valida el rol y los datos, y escribe en Firestore con privilegios de servidor.
5. Las reglas de Firestore permiten a cada estudiante consultar solamente sus propias calificaciones. El administrador puede administrarlas.

Nunca deben guardarse llaves privadas, contraseñas ni archivos `.env.local` en Git.
