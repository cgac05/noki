# continuidad-canales Specification

## Purpose

Permite que un paciente continúe en otro canal un trámite empezado en uno anterior sin repetir datos, revelando solo lo que su nivel de identidad permite y resistiendo intentos de adivinar.

## Requirements

### Requirement: Resolución por prioridades
El resolvedor de continuidad SHALL evaluar, en este orden, y usar la primera fuente que aplique: (1) token de continuidad de un solo uso, que hereda el nivel y el trámite del origen; (2) contacto del canal (`wa_id`) vinculado a un paciente con trámites abiertos → nivel 1, considerando solo vínculos de nivel 1 o mayor cuyo último uso esté dentro de 180 días según el `Reloj`; los vínculos de nivel 0 (datos declarados) o inactivos MUST ignorarse como si no existieran, sin contar intento; (3) `wa_id` igual, en sus últimos 10 dígitos, al teléfono capturado en un hilo con trámites abiertos → nivel 1, que permite mostrar el resumen pero no retomar: como el contacto no está vinculado, la política de identidad exige folio + fecha de nacimiento antes de retomar; (4) folio de 8 a 9 dígitos, que solo localiza y exige fecha de nacimiento antes de revelar o retomar; (5) datos personales declarados que coinciden con un único paciente → verificación por OTP al contacto registrado previamente. Un trámite abierto es uno en estado previo a `ATENDIDA`, `CANCELADA`, `NO_ASISTIO` o `EXPIRADO`. En la prioridad 4, todo folio bien formado sin fecha de nacimiento MUST recibir la misma respuesta (pedir la fecha de nacimiento), exista o no, esté abierto o no, sin consultar el repositorio y sin contar intento; con fecha de nacimiento, un folio inexistente, de un trámite cerrado, de otro paciente admisible o con fecha que no coincide MUST contar como intento fallido y devolver el mismo resultado sin datos.

#### Scenario: El token gana
- **WHEN** un `wa_id` vinculado a otro paciente envía un token válido
- **THEN** se retoma el trámite del token con el nivel del origen, no los del vínculo

#### Scenario: Token de un solo uso
- **WHEN** se usa por segunda vez un token de continuidad ya consumido
- **THEN** no se retoma ningún trámite y cuenta como intento fallido

#### Scenario: Folio sin fecha de nacimiento
- **WHEN** se envía sin fecha de nacimiento un folio existente y, en otra petición, un folio bien formado que no existe
- **THEN** ambos resultados son idénticos: piden la fecha de nacimiento, no revelan servicio, sede ni estado y no cuentan intento

#### Scenario: Folio inexistente con fecha
- **WHEN** se envía un folio bien formado que no existe junto con una fecha de nacimiento
- **THEN** cuenta un intento fallido y el resultado es igual al de un folio existente con fecha equivocada

#### Scenario: Datos personales con coincidencia única
- **WHEN** los datos declarados coinciden con un solo paciente
- **THEN** el resultado pide verificar por OTP al contacto registrado y no revela ningún dato del paciente

#### Scenario: Vínculo declarado no revela
- **WHEN** un `wa_id` cuyo único vínculo es de nivel 0 (creado al declarar la CURP de otra persona) escribe sin token y ese paciente tiene trámites abiertos de otro hilo
- **THEN** el resultado es igual al de un `wa_id` desconocido y no se cuenta intento

#### Scenario: Número reasignado sin uso reciente
- **WHEN** un `wa_id` con un vínculo de nivel 1 cuyo último uso fue hace 181 días según el `Reloj` escribe sin token
- **THEN** el vínculo se ignora y el resultado es igual al de un `wa_id` desconocido

### Requirement: Revelación mínima y ambigüedad
Con nivel 1 el resultado SHALL revelar únicamente servicio, sede, fecha del horario si existe y canal de origen de cada trámite abierto. Si la fuente aplicable lleva a más de un paciente, o a ninguno, el resolvedor MUST devolver un único resultado sin datos que sea indistinguible entre "ambiguo" y "sin coincidencia", y MUST NOT confirmar datos que el usuario no dio. Varios trámites abiertos del mismo paciente MAY listarse con la información de nivel 1.

#### Scenario: Teléfono familiar ambiguo
- **WHEN** un `wa_id` está vinculado a dos pacientes que tienen trámites abiertos
- **THEN** el resultado no contiene IDs, servicios, sedes ni nombres y es igual al de un `wa_id` desconocido

#### Scenario: Varios trámites del mismo paciente
- **WHEN** un `wa_id` vinculado a un solo paciente tiene dos trámites abiertos
- **THEN** el resultado lista ambos solo con servicio, sede, fecha y canal de origen

### Requirement: Límite de intentos
Cada verificación fallida (token inválido o consumido, folio con fecha de nacimiento que no coincide o sin trámite, datos sin coincidencia única) SHALL contarse por contacto y emitir `IntentoVerificacionFallido{metodo, intentos}` sin datos personales. El puerto de intentos MUST solo contar y bloquear; el evento MUST construirlo la capa de aplicación con la envoltura del contexto de la operación (`tramiteId` nulo, `hiloId` del contacto, `version` 0) y MUST guardarse por el mismo event store y outbox que los demás eventos. Al tercer fallo el contacto MUST quedar bloqueado temporalmente (15 minutos según el `Reloj`); mientras dure, el resolvedor MUST rechazar cualquier fuente sin evaluarla. Una resolución exitosa MUST reiniciar el contador. El contador MUST persistir en Postgres de forma atómica ante intentos concurrentes del mismo contacto.

#### Scenario: Tercer intento bloquea
- **WHEN** un contacto falla tres veces la fecha de nacimiento de un folio
- **THEN** se emiten tres `IntentoVerificacionFallido` y el cuarto intento, incluso correcto, se rechaza como bloqueado hasta que el `Reloj` avance 15 minutos

#### Scenario: Evento de intento en el outbox
- **WHEN** falla una verificación con los adaptadores Postgres
- **THEN** en `evento` hay un `IntentoVerificacionFallido` con `tramite_id` nulo y el `hilo_id` del contacto, con su fila de outbox, y el adaptador de intentos no construyó ningún evento

#### Scenario: Intentos concurrentes
- **WHEN** el mismo contacto falla tres verificaciones en paralelo contra Postgres
- **THEN** el contador llega a 3 y el contacto queda bloqueado

### Requirement: Reanudación en el canal nuevo
Al retomar con éxito, el caso de uso SHALL registrar el cambio de canal, vincular el contacto del canal nuevo con el paciente cuando la fuente fue un token emitido para ese paciente (`IdentidadVinculada`) y devolver el trámite con `siguientePregunta` calculada para el canal nuevo. Las casillas ya llenas MUST NOT volver a pedirse.

#### Scenario: Continuidad Call Center → WhatsApp (prueba obligatoria)
- **WHEN** el asesor asigna paciente, selecciona servicio y sede y registra los requisitos en `callcenter` (el trámite queda `LISTO_PARA_RESERVAR`), emite un token de continuidad, y el paciente lo envía desde `whatsapp`
- **THEN** el trámite se retoma con `CanalCambiado{de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC'}`, el `wa_id` queda vinculado, la siguiente pregunta es `horario` sin pedir servicio, sede, paciente ni requisitos, y apartar el horario desde `whatsapp` funciona

#### Scenario: Segunda visita sin token
- **WHEN** después de esa vinculación el mismo `wa_id` escribe sin token
- **THEN** se reconoce por la prioridad 2 con nivel 1 y se retoma en la misma casilla

### Requirement: Último canal del hilo al iniciar un trámite
Iniciar un trámite en un hilo existente SHALL dejar como último canal del hilo el canal del comando, en la misma operación que guarda el trámite nuevo. Ese cambio MUST NOT registrar `CanalCambiado`, porque no continúa ningún trámite: el trámite nuevo tiene ese canal como origen. Una continuación posterior de cualquier trámite del hilo hacia otro canal SHALL registrar `CanalCambiado` con ese canal como `de`, según «Reanudación en el canal nuevo».

#### Scenario: Llamada nueva tras continuar en WhatsApp
- **WHEN** un trámite del call center se continuó en WhatsApp con `CanalCambiado{de: 'callcenter', a: 'whatsapp'}` y después entra una llamada nueva desde el mismo número
- **THEN** se crea un trámite nuevo en el mismo hilo con canal de origen `callcenter`, el último canal del hilo es `callcenter` y no se guarda ningún `CanalCambiado` nuevo

#### Scenario: Segunda continuación cuenta como cambio de canal
- **WHEN** después de esa llamada el asesor emite un token de continuidad para el trámite nuevo y el paciente lo envía desde `whatsapp`
- **THEN** se guarda `CanalCambiado{de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC'}` y `cambiosCanal` aumenta en 1

#### Scenario: Mismo canal
- **WHEN** se inicia un trámite en un hilo cuyo último canal ya es el del comando
- **THEN** el hilo no cambia y no se guarda `CanalCambiado`
