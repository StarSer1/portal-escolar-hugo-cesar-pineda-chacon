# Acceso individual de docentes

## Dar de alta desde Dirección

1. Inicia sesión como administrador y abre **Docentes → Agregar docente**.
2. Escribe nombre, correo electrónico único, teléfono y especialidad.
3. Define y confirma una contraseña inicial de al menos 12 caracteres. Debe ser exclusiva de este sistema: nunca pidas la contraseña del correo personal del docente.
4. Pulsa **Crear docente y acceso**. Cuando termine correctamente, comunica al docente su correo de acceso, la contraseña inicial y el enlace del portal por un medio privado. El sistema no envía esas credenciales por correo automáticamente.
5. Asigna el docente a sus grupos en **Organización → Grupos**. Una cuenta sin grupos puede iniciar sesión, pero no tiene alumnos ni calificaciones que capturar.

El correo se normaliza quitando espacios al principio y al final y convirtiéndolo a minúsculas. Por tanto, `docente@example.test` y `DOCENTE@example.test` no se consideran correos diferentes. La comprobación utiliza tanto los expedientes existentes como una reserva transaccional `teacherEmails/{correo}`. Authentication tampoco permite dos cuentas con el mismo correo. Si el correo ya corresponde a una cuenta no vinculada, el alta no toma posesión de ella ni cambia su contraseña; debe revisarlo la administración del proyecto.

## Registros anteriores con correos repetidos

No se crean cuentas ni se sustituyen datos anteriores automáticamente. Los expedientes repetidos se conservan y aparece un aviso para corregirlos. Edita el correo de cada docente sin cuenta, usando una dirección diferente para cada persona; después utiliza **Habilitar acceso** en la fila correspondiente y define su contraseña inicial.

No borres expedientes para resolver duplicados: los grupos y las calificaciones pueden referenciarlos. Una cuenta habilitada conserva su correo vinculado; cambiar únicamente el correo del expediente rompería su correspondencia con Authentication, por lo que el formulario lo bloquea.

### Preparación técnica de correos anteriores

Antes de publicar esta función en otro entorno con docentes existentes, el administrador técnico debe reservar sus correos anteriores. Desde una sesión de Firebase CLI con los permisos IAM necesarios, revisa primero los conteos sin escribir datos:

```powershell
node scripts/backfill-teacher-emails.mjs --project ID_EXACTO_DEL_PROYECTO
```

Después de comprobar el proyecto y los conteos, agrega `--apply` para crear las reservas pendientes. El script es idempotente, no sobrescribe reservas, no cambia docentes ni crea cuentas de Authentication; tampoco imprime correos, nombres o tokens. Los correos duplicados quedan bloqueados para nuevos registros; sus expedientes deben recibir direcciones personales diferentes antes de habilitar cuentas. No cambies automáticamente esos correos ni asignes contraseñas de prueba a personas reales.

## Permisos

| Acción | Dirección | Docente |
| --- | --- | --- |
| Administrar alumnos, tutores, docentes y cuentas | Sí | No |
| Configurar ciclos, materias, grupos y periodos | Sí | No |
| Gestionar inscripciones y bajas | Sí | No |
| Consultar grupos y alumnos | Todos | Solo grupos activos asignados del ciclo actual y sus inscritos |
| Capturar calificaciones nuevas | Sí, con validaciones | Solo su especialidad y periodos abiertos |
| Corregir una calificación existente | Sí, con motivo e historial | No; solicitarlo a dirección |
| Consultar bitácora administrativa | Sí | No |

El docente inicia sesión por la misma pantalla que el director, pero se dirige a `/docente`. Los permisos no dependen de ocultar botones: las reglas de Firestore vuelven a verificar el perfil activo, la cuenta vinculada, la asignación, el ciclo y la especialidad en cada operación. Cambiar una URL o enviar otra petición no concede permisos administrativos.

Al inactivar el acceso de un docente se bloquea su acceso a los datos académicos. No se eliminan la cuenta de Authentication, sus calificaciones ni su historial. Sus asignaciones existentes deben revisarse y sustituirse desde Dirección. No se habilita recuperación ni restablecimiento administrativo de contraseñas desde este formulario; si se necesita gestionar una cuenta existente se hace mediante los mecanismos de Firebase Authentication, sin almacenar ni recuperar la contraseña anterior.

La lista docente muestra el nombre y la matrícula de los alumnos asignados. La autorización de Firestore, sin embargo, permite leer el documento `students` completo de esos alumnos; no es una protección por campo ni oculta técnicamente la CURP o fecha de nacimiento dentro del mismo documento. El docente no puede leer los tutores ni los alumnos de grupos ajenos. Si se requiere limitar también los campos accesibles, deberán separarse los datos privados en documentos independientes.

## Cambiar la contraseña inicial

El docente puede abrir **Cambiar contraseña** desde su propio panel. Debe escribir su contraseña actual, elegir una nueva de al menos 12 caracteres y confirmarla. El sistema verifica nuevamente su identidad antes del cambio y modifica la contraseña exclusivamente en Authentication. En sus siguientes inicios de sesión deberá usar la nueva contraseña. Conviene realizar este cambio al recibir el acceso inicial; en esta versión es voluntario, no obligatorio.

## Implementación y límites operativos

- La contraseña se entrega únicamente a Firebase Authentication, no se añade al expediente, al perfil, al índice de correos, a la bitácora ni al repositorio. Tampoco puede consultarse después desde el panel.
- La instancia secundaria de Authentication permite crear la cuenta sin reemplazar la sesión del director en el navegador.
- El perfil `users/{uid}` guarda `role: 'teacher'` y `teacherId`; el expediente `teachers/{id}` guarda `authUid`. Las reglas exigen la correspondencia entre ambos.
- El alta crea un acceso docente, nunca otro administrador. Autenticarse por sí solo no concede acceso si falta el perfil vinculado y activo.
- Authentication y Firestore son servicios diferentes; el alta no es una transacción distribuida. Si falla una etapa, la interfaz informa el error y el servicio intenta retirar la cuenta recién creada cuando corresponde. No des por terminada el alta sin ver su confirmación; si se señala un alta incompleta, revisa Authentication y el expediente antes de repetirla.
- Esta solución usa los SDK de Firebase y las reglas de Firestore, sin Cloud Functions ni cambio de plan. Se mantiene sujeta a las cuotas y protecciones de abuso del proyecto; no supone servicio ilimitado.
- Los ensayos automáticos usan exclusivamente cuentas ficticias en emuladores locales. No se crean docentes, no se asignan contraseñas y no se alteran correos existentes en producción durante las pruebas.

Para una siguiente entrega se puede incorporar un flujo de invitación, cambio obligatorio de contraseña inicial y recuperación de acceso orientado al usuario. El cambio voluntario desde el panel docente ya está disponible. Estas mejoras no deben simularse almacenando contraseñas en Firestore.
