# Análisis del sistema legado RASE y modelo de datos V1.0

> Alcance: evidencia técnica del archivo `2021-2022-03DPR0046P.zip` y requisitos confirmados por la escuela. No contiene datos personales ni credenciales.

## 1. Auditoría del legado

### Inventario y función detectada

| Estructura | Registros observados | Hallazgo |
|---|---:|---|
| `ALUMNOGRAL` | 578 | Expediente general del alumno; `CURP` parece ser el identificador. |
| `ALUMNOCICLO` | 2,553 | Participación del alumno por ciclo y grupo, altas/bajas y datos contextuales. |
| `DET_CICLOS` | 8 | Ciclos 2017–2018 a 2024–2025 y fechas de evaluación. |
| `MATERIASCAT` | 107 | Materias por grado, modelo y número de periodos. |
| `PERSONAL` | 85 | Personal por ciclo, función y hasta 20 campos de grupo. |
| `CALIFACAD` | 26,177 | Calificación por alumno, materia, ciclo y bimestre. |
| `CALIFCICLO` | 680 | Concentrado anual por alumno, con materias y periodos repetidos como columnas. |
| `ASISTENCIAC` | 3,322 | Asistencia por alumno y bimestre. |
| `CALIFHEVAL` | 1,261 | Habilidades, ponderaciones y ámbitos por grupo/materia/periodo. |
| `CALIFSEGUIM` | 1,667 | Seguimiento y observaciones por alumno. |
| `DIAGCICLO`, `GRUPOSDATOS` | 62, 24 | Diagnóstico individual y grupal. |
| `PLANEACION` | 9 | Planeación docente, actividades, evaluación y adecuaciones. |
| `APRENDIZAJE`, `PRACTICAS`, `AMBITOS` | 1,604; 186; 48 | Catálogos curriculares. |
| `USUARIOS` | 32 | Usuarios, tipo, estatus y datos laborales. |
| `PLANTELES`, `CATALOGOS`, `AUTONOMIA` | 3; 48; 2 | Plantel y catálogos administrativos. |

El JAR contiene pantallas llamadas `CapAlumnos`, `CapAsistencia`, `CapCalifMaterias`, `CapCalifMateriasNumeros`, `CapHabilidades`, `CapSeguimiento`, `CapSegGpo`, `PlantelGrupo`, `EditorValidaCalif`, `Importar`, `Exporta` y `Sisat`. **Confirmado:** el sistema incluía esos módulos. **No confirmado:** el detalle de cada flujo hasta revisar visualmente las pantallas.

### Relaciones recuperables

- **Confirmado por campos:** `ALUMNOGRAL.CURP` se relaciona con `ALUMNOCICLO`, `CALIFACAD`, `CALIFCICLO`, `ASISTENCIAC`, `CALIFSEGUIM` y `DIAGCICLO` mediante `CURP`.
- **Confirmado por campos:** `IDCICLO` relaciona las tablas académicas con `DET_CICLOS`; `IDMATERIA` relaciona calificaciones, diagnósticos y planeaciones con `MATERIASCAT`.
- **Inferencia fuerte:** `(IDCICLO, CURP)` representa una inscripción histórica; `GRUPO` es la asignación vigente al momento del registro.
- **Confirmado:** de 2018–2019 a 2024–2025 existen tres periodos; `CALIFACAD` registra 9,031, 8,546 y 8,600 filas en los periodos 1, 2 y 3 respectivamente. La escala almacenada llega de 0 a 10.

### Problemas que no deben replicarse

- Repetición estructural: `C1…C20`, `AS1…AS90`, `GRUPO1…GRUPO20`, `M1P1…M9P3`, `H1…H20` y campos equivalentes.
- Datos de tutor repetidos dentro de `ALUMNOGRAL` (`PNOMBRE`, `PNOMBRE1`, `PNOMBRE2`), que impiden representar correctamente varios tutores o hermanos.
- Datos de acceso en la tabla `USUARIOS`, incluido un campo de contraseña. El sistema nuevo delegará autenticación a Firebase Authentication.
- Fechas, roles, grupos y estados codificados en campos breves sin una relación declarada ni reglas de integridad verificables.

## 2. Requisitos clasificados

| Estado | Requisito |
|---|---|
| Confirmado | Un grupo puede tener titular y especialistas; docente–grupo es N:M. |
| Confirmado | El alumno puede cambiar de grupo durante el ciclo y debe conservarse historial. |
| Confirmado | Se requieren CURP, identidad y fecha de nacimiento; alumnos pueden tener varios tutores. |
| Confirmado | Existe plan de estudios por grado y los periodos actuales son tres. |
| Derivado | Asistencia, diagnóstico, planeación, seguimiento y reportes existieron en RASE. |
| Propuesto | La modificación de calificaciones requiere solicitud, autorización y auditoría. |
| Pendiente | Quién puede crear/editar alumnos, política de cierre de periodos, y si los módulos derivados continúan en el alcance V1. |

## 3. Modelo conceptual ER V1.0

```text
USUARIO 1 ── 0..1 DOCENTE
USUARIO 1 ── 0..1 TUTOR
ALUMNO N ──< ALUMNO_TUTOR >── N TUTOR

CICLO_ESCOLAR 1 ── N GRUPO
ALUMNO 1 ── N INSCRIPCION N ── 1 GRUPO
DOCENTE 1 ── N ASIGNACION_DOCENTE N ── 1 GRUPO

PLAN_ESTUDIOS 1 ── N PLAN_GRADO 1 ── N PLAN_GRADO_MATERIA N ── 1 MATERIA
PLAN_GRADO 1 ── N PERIODO_EVALUACION
INSCRIPCION 1 ── N CALIFICACION N ── 1 PLAN_GRADO_MATERIA
PERIODO_EVALUACION 1 ── N CALIFICACION

CALIFICACION 1 ── N HISTORIAL_CALIFICACION
CALIFICACION 1 ── N SOLICITUD_CORRECCION (si se aprueba el módulo)
INSCRIPCION 1 ── N ASISTENCIA_DIARIA

USUARIO 1 ── N AVISO | NOTICIA | EVENTO | DOCUMENTO | LOG_ACTIVIDAD
GALERIA 1 ── N IMAGEN
```

## 4. Modelo lógico y reglas de integridad

| Entidad | Clave y campos esenciales | Restricciones |
|---|---|---|
| `USUARIO` | **PK** `usuario_id`; `auth_uid`, `rol`, `nombre`, `correo`, `activo` | `auth_uid` y correo únicos; rol en catálogo. |
| `DOCENTE` | **PK** `docente_id`; **FK** `usuario_id`; `curp`, `numero_empleado` | CURP única si se captura. |
| `ALUMNO` | **PK** `alumno_id`; `curp`, nombres, apellidos, fecha_nacimiento, sexo | CURP única; nunca usarla como ID técnico. |
| `TUTOR` | **PK** `tutor_id`; **FK opcional** `usuario_id`; nombre, correo, teléfono, domicilio, escolaridad, ocupación | Correo único solo si se habilita acceso. |
| `ALUMNO_TUTOR` | **PK** `alumno_tutor_id`; **FK** alumno, tutor; parentesco, es_contacto_principal, autorizado_recoger | Único `(alumno_id,tutor_id)`; máximo un contacto principal. |
| `CICLO_ESCOLAR` | **PK** `ciclo_id`; nombre, fecha_inicio, fecha_fin, estado | Un solo ciclo activo. |
| `GRUPO` | **PK** `grupo_id`; **FK** ciclo; grado, clave, turno, estado | Único `(ciclo_id, grado, clave, turno)`. |
| `INSCRIPCION` | **PK** `inscripcion_id`; **FK** alumno, ciclo, grupo; fecha_alta, fecha_baja, estado | Una inscripción activa por alumno/ciclo; conserva cada cambio de grupo con vigencia. |
| `ASIGNACION_DOCENTE` | **PK** `asignacion_id`; **FK** docente, grupo, materia opcional; función, vigencia | No solapar vigencias para la misma función/grupo/materia. |
| `PLAN_ESTUDIOS` | **PK** `plan_id`; nombre, versión, vigencia, estado | No borrar si tiene inscripciones históricas. |
| `PLAN_GRADO` | **PK** `plan_grado_id`; **FK** plan; grado | Único `(plan_id,grado)`. |
| `MATERIA` | **PK** `materia_id`; clave, nombre, área, activa | Clave única dentro del plan correspondiente. |
| `PLAN_GRADO_MATERIA` | **PK** `pgm_id`; **FK** plan_grado, materia; orden, evalúa_numéricamente | Único `(plan_grado_id,materia_id)`. |
| `PERIODO_EVALUACION` | **PK** `periodo_id`; **FK** ciclo; nombre, orden, inicio, fin, cierre | Único `(ciclo_id,orden)`; no editar tras cierre salvo reapertura auditada. |
| `CALIFICACION` | **PK** `calificacion_id`; **FK** inscripción, pgm, periodo, asignación docente; valor, redondeada, observación, estado | Único `(inscripcion_id,pgm_id,periodo_id)`; valor sujeto a escala vigente. |
| `HISTORIAL_CALIFICACION` | **PK** `historial_id`; **FK** calificación, usuario; valor_anterior, valor_nuevo, motivo, fecha | Solo inserción; evidencia de auditoría. |
| `SOLICITUD_CORRECCION` | **PK** `solicitud_id`; **FK** calificación, solicitante, resolutor; motivo, estado, resolución | Propuesta hasta confirmar el proceso SEP. |
| `ASISTENCIA_DIARIA` | **PK** `asistencia_id`; **FK** inscripción; fecha, estado, justificación | Único `(inscripcion_id,fecha)`; sustituye 90 columnas. |
| `PLANEACION`, `DIAGNOSTICO`, `SEGUIMIENTO` | PK propia; FK a docente/grupo/inscripción, ciclo y periodo según corresponda | Incluir en V1 solo si la escuela confirma que continuará usándolos. |
| `AVISO`, `NOTICIA`, `EVENTO`, `DOCUMENTO`, `GALERIA`, `IMAGEN` | PK propia; autor, estado, publicación, metadatos | Archivos en Storage; Firestore guarda URL/ruta y metadatos. |
| `LOG_ACTIVIDAD` | **PK** `log_id`; actor, acción, recurso, fecha, contexto | Solo inserción y acceso administrativo. |

## 5. Reglas de negocio

### Confirmadas

1. Un alumno puede tener una o más inscripciones históricas y puede cambiar de grupo durante un ciclo.
2. Un grupo puede tener varios docentes y un docente puede atender varios grupos.
3. Un alumno puede tener varios tutores y un tutor puede estar vinculado con varios alumnos.
4. Las materias se determinan por plan de estudios y grado, no directamente por alumno.
5. El administrador consulta historial global; el docente solo el de alumnos que le corresponden.

### Propuestas

1. Las calificaciones se guardan con valor original y valor redondeado; la regla de redondeo debe ser configurable por ciclo.
2. Al cerrar un periodo, el docente no puede editar; una corrección genera solicitud, resolución y historial inmutable.
3. Firestore Rules no permitirá al cliente escribir calificaciones directamente: una Cloud Function validará la asignación docente y el cierre del periodo.
4. Los datos de menores se muestran bajo mínimo privilegio y no se publican en el sitio institucional.

## 6. Propuesta Firestore

Colecciones principales: `users`, `students`, `guardians`, `schoolYears`, `groups`, `enrollments`, `teachers`, `teachingAssignments`, `curriculumPlans`, `subjects`, `gradingPeriods`, `grades`, `attendance`, `announcements`, `news`, `events`, `documents`, `galleries` y `auditLogs`.

- Usar IDs aleatorios de Firestore; guardar `studentId`, `groupId`, `schoolYearId`, `periodId` y `subjectPlanId` como referencias/IDs explícitos para consultas.
- `grades` será colección raíz para consultar por alumno, grupo, periodo o materia; campos desnormalizados controlados: `studentName`, `groupLabel` y `gradeLevel` solo para lectura y reportes.
- `enrollments` conserva el historial y contiene fechas de vigencia; `students.currentEnrollmentId` es una caché controlada, no la fuente histórica.
- Crear índices compuestos para: `grades(studentId, schoolYearId, periodOrder)`, `grades(groupId, periodId, subjectPlanId)` y `enrollments(studentId, schoolYearId, status)`.
- Cloud Storage: `institutional/documents/{id}`, `galleries/{galleryId}/{imageId}` y rutas privadas por usuario; nunca almacenar binarios en Firestore.

## 7. Matriz inicial de acceso

| Acción | Administrador | Docente | Alumno/tutor |
|---|---|---|---|
| Gestionar usuarios, alumnos, ciclos y grupos | Sí | No | No |
| Consultar alumnos | Global | Solo asignados | Solo propio/vinculado |
| Registrar calificaciones | Pendiente de política | Solo grupos/materias asignados y periodo abierto | No |
| Corregir calificaciones cerradas | Autoriza/resuelve | Solicita | No |
| Consultar historial | Sí | Solo alumnos asignados | Solo propio/vinculado |
| Publicar contenido institucional | Sí | Pendiente | No |

## 8. Preguntas pendientes para dirección

### Críticas

1. ¿La escala, mínimo aprobatorio y regla de redondeo vigentes son exactamente 0–10?
2. ¿Quién registra, valida y autoriza una corrección después de cerrar un periodo? ¿Qué evidencia exige SEP?
3. ¿Qué datos pueden consultar tutores/alumnos y cómo se verificará su identidad?
4. ¿Planeación, asistencia, diagnóstico y seguimiento forman parte del alcance obligatorio de la primera versión?

### Importantes

1. ¿Qué especialidades, materias y funciones docentes existen hoy?
2. ¿Se requiere historial académico de ciclos previos importado desde RASE o solo consulta del nuevo sistema?
3. ¿Cuánto tiempo se conservarán documentos, evidencias y registros de auditoría?

### Opcionales

1. ¿Se habilitarán notificaciones por correo?
2. ¿Se incluirá exportación a formatos oficiales y qué plantilla deberá usarse?
