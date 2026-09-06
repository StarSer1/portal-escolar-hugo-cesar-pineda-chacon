# Prueba inicial del módulo de calificaciones

## Decisiones incorporadas

- Escala confirmada: 0 a 10; el valor mostrado se redondea al entero más cercano.
- Tres periodos por ciclo.
- El director/administrador autoriza correcciones. La integración SEP queda fuera de V1.
- Cada grupo tiene docente general, Educación Física, Inglés y Artes.
- Tutor/alumno: consulta de historial, calificaciones actuales y estado propios.
- Asistencia, planeación, diagnóstico y seguimiento se dejan para una fase posterior; revisarlos en cada avance.
- Conservación de datos: indefinida. Notificaciones y documentos oficiales: fases futuras.

## Modelo Firestore V1

```text
users/{uid}                         { role: 'admin' | 'teacher' | 'guardian' }
students/{studentId}                { curp, names, surnames, ... }
schoolYears/{schoolYearId}          { name, startDate, endDate, status }
groups/{groupId}                    { schoolYearId, grade, label }
enrollments/{enrollmentId}          { studentId, groupId, schoolYearId, status }
subjectPlans/{subjectPlanId}        { curriculumPlanId, grade, subjectId, name }
gradingPeriods/{periodId}           { schoolYearId, order: 1|2|3, status }
grades/{enrollment_subject_period}  { studentId, enrollmentId, groupId, schoolYearId, subjectPlanId, periodId, score, roundedScore, teacherId }
grades/{gradeId}/history/{historyId}
```

## Ejecutar la prueba

1. En Firebase Authentication habilita **Email/Password** y crea un usuario de prueba con correo y contraseña.
2. En Firestore crea `users/UID_DEL_USUARIO` con `{ "role": "admin", "active": true }`.
3. Crea documentos de prueba en `students`, `schoolYears`, `groups`, `enrollments`, `subjectPlans` y `gradingPeriods`; conserva sus IDs.
4. En el plan gratuito, publica las reglas: `firebase deploy --only firestore:rules`.
5. Ejecuta `npm run dev`, inicia sesión y abre `/panel/calificaciones`.
6. Captura una calificación usando los IDs. El modo gratuito crea/actualiza un documento único por inscripción, materia y periodo; una modificación posterior queda en `grades/{id}/history`.

La pantalla usa IDs deliberadamente en esta etapa. El siguiente avance sustituirá esos campos por selectores dependientes de ciclo, grupo, alumno, materia y periodo. Al pasar a Blaze, Cloud Functions validará la asignación del docente y el cierre de periodos.
