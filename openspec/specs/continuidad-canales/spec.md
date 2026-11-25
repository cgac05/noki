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
Iniciar un trámite en un hilo existente SHALL dejar como último canal del hilo el canal del comando, en la misma operación que guarda el trámite nuevo. Ese cambio MUST NOT registrar `CanalCambiado`, porque no continúa ningún trámite: el trámite nuevo tiene ese canal como origen. Una continuación posterior de cualquier trámite del hilo hacia otro canal SHALL registrar `CanalCambiado` con ese canal como `de`, según «Reanudación en el canal nuevo». Una llamada entrante con un trámite en proceso del mismo número no inicia un trámite: lo retoma según «Llamada entrante retoma el trámite en proceso del número».

#### Scenario: Llamada nueva tras continuar en WhatsApp
- **WHEN** un trámite del call center se continuó en WhatsApp con `CanalCambiado{de: 'callcenter', a: 'whatsapp'}`, quedó `CONFIRMADA` y después entra una llamada nueva desde el mismo número
- **THEN** se crea un trámite nuevo en el mismo hilo con canal de origen `callcenter`, el último canal del hilo es `callcenter` y no se guarda ningún `CanalCambiado` nuevo

#### Scenario: Segunda continuación cuenta como cambio de canal
- **WHEN** después de esa llamada el asesor emite un token de continuidad para el trámite nuevo y el paciente lo envía desde `whatsapp`
- **THEN** se guarda `CanalCambiado{de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC'}` y `cambiosCanal` aumenta en 1

#### Scenario: Mismo canal
- **WHEN** se inicia un trámite en un hilo cuyo último canal ya es el del comando
- **THEN** el hilo no cambia y no se guarda `CanalCambiado`

### Requirement: Llamada entrante retoma el trámite en proceso del número
Cuando un asesor recibe una llamada (`IniciarTramite` en `callcenter`, actor `asesor:*`, con `contacto`), el caso de uso SHALL buscar los hilos de los contactos `whatsapp` y `callcenter` cuyo valor coincide en sus últimos 10 dígitos con el número de la llamada y, entre sus trámites del mismo tipo en proceso (`BORRADOR`, `COTIZADO`, `LISTO_PARA_RESERVAR` o `HORARIO_RESERVADO`), SHALL retomar uno en lugar de crear otro: el más reciente que no esté en `BORRADOR` o, si todos están en `BORRADOR`, el más reciente. Al retomarlo, el hilo de ese trámite SHALL quedar con último canal `callcenter`; si el último canal del trámite era otro, SHALL registrarse `CanalCambiado{de: <canal anterior>, a: 'callcenter', metodo: 'LLAMADA_CC'}`; y la respuesta SHALL ser ese trámite con `siguientePregunta` calculada para `callcenter`, sin volver a pedir casillas llenas. Si no hay trámites en proceso, SHALL crear un trámite nuevo como hasta ahora. Esta vía MUST NOT vincular el contacto a un paciente ni registrar `IdentidadVinculada`, y MUST NOT considerar trámites `CONFIRMADA` o posteriores.

#### Scenario: Llamada tras cotizar en WhatsApp
- **WHEN** desde el `wa_id` `3112111818` se elige «Química sanguínea» en «Clínica Tepic» (trámite `COTIZADO`) y después el asesor recibe una llamada del `3112111818`
- **THEN** la respuesta es el mismo trámite `COTIZADO`, con `CanalCambiado{de: 'whatsapp', a: 'callcenter', metodo: 'LLAMADA_CC'}`, la siguiente pregunta no es servicio ni sede y no se crea ningún trámite nuevo

#### Scenario: Número con prefijo de país
- **WHEN** el trámite en proceso se inició desde el `wa_id` `5213112111818` y la llamada llega del `3112111818`
- **THEN** se retoma ese trámite

#### Scenario: Borrador vacío previo del call center
- **WHEN** el número ya tiene un trámite `BORRADOR` más reciente iniciado en `callcenter` y un trámite `COTIZADO` iniciado en `whatsapp`, y entra otra llamada
- **THEN** se retoma el trámite `COTIZADO` de `whatsapp` y no se crea otro trámite

#### Scenario: Sin trámite en proceso
- **WHEN** el número no tiene trámites en proceso, o solo tiene trámites `CONFIRMADA` o cerrados
- **THEN** se crea un trámite nuevo en el hilo del contacto `callcenter`, como antes

#### Scenario: Sin vínculo de identidad
- **WHEN** se retoma por llamada un trámite que tiene paciente asignado
- **THEN** no se guarda `IdentidadVinculada` ni se crea un vínculo del contacto `callcenter`

### Requirement: Mismo número retoma una cita en proceso en cualquier canal
Cuando un paciente escribe por WhatsApp sin código de continuación desde un número cuyos últimos 10 dígitos coinciden con un contacto `whatsapp`, `callcenter` o `web` de un hilo con un trámite `AGENDAR` en proceso (`BORRADOR`, `COTIZADO`, `LISTO_PARA_RESERVAR` o `HORARIO_RESERVADO`), el sistema SHALL retomar ese trámite directamente, sin folio ni fecha de nacimiento (excepción a la prioridad 3 de «Resolución por prioridades», recogida en `PLAN.md §8`), eligiendo el más reciente que no esté en `BORRADOR` o, si todos lo están, el más reciente. Si el último canal era otro, SHALL registrarse `CanalCambiado{de, a: 'whatsapp', metodo: 'MISMO_NUMERO'}`. El aviso MUST limitarse a los datos de nivel 1 (servicio, sede, fecha y canal de origen). Esta vía MUST NOT vincular el contacto a un paciente ni registrar `IdentidadVinculada`, y MUST NOT aplicarse a trámites de otro tipo ni a `CONFIRMADA` o posteriores. En la sesión web de demo, al identificarse con un teléfono, esos mismos trámites SHALL listarse aunque no haya paciente vinculado; listarlos MUST NOT registrar eventos, y «Continúa donde lo dejaste» SHALL mostrar dentro de `/web` el asistente conversacional con el teléfono de la sesión, que retoma el trámite y permite completarlo (horario, preparación, datos y confirmación) sin salir de la web ni enviar `SolicitarContinuacion`.

#### Scenario: Llamada cortada sin botón y WhatsApp
- **WHEN** el asesor cotiza «Consulta nutricional» en «Clínica Bahía de Banderas» para la llamada del 3119990002, no pulsa ningún botón, y luego el `wa_id` 3119990002 escribe «Hola»
- **THEN** el bot dice que retoma ese trámite (servicio y sede), registra `CanalCambiado{de: 'callcenter', a: 'whatsapp', metodo: 'MISMO_NUMERO'}` y pregunta el día, sin volver a pedir servicio ni sede

#### Scenario: Con prefijo de país
- **WHEN** la llamada fue del 3119990002 y escribe el `wa_id` 523119990002
- **THEN** se retoma el mismo trámite

#### Scenario: Web tras llamada cortada
- **WHEN** tras la llamada del 3119990002 sin paciente identificado, alguien entra a `/web` con el teléfono 3119990002 y la contraseña de demo
- **THEN** ve el trámite en proceso con «Continúa donde lo dejaste», y al pulsarlo el asistente aparece dentro de `/web`, retoma ese trámite y muestra el paso pendiente

#### Scenario: Web con horario apartado
- **WHEN** el trámite del número está en `HORARIO_RESERVADO` y se pulsa «Continúa donde lo dejaste» en `/web`
- **THEN** no aparece el error «La acción no está permitida en el estado actual» y el asistente ofrece confirmar la cita dentro de `/web`

#### Scenario: Cita confirmada no se retoma por número
- **WHEN** el único trámite del número está `CONFIRMADA` y escribe por WhatsApp sin código
- **THEN** el comportamiento es el de antes (no se retoma por número)

#### Scenario: Sin vínculo y sin datos del paciente
- **WHEN** se retoma por número un trámite con paciente asignado
- **THEN** no se crea vínculo ni `IdentidadVinculada`, y el aviso no menciona al paciente

### Requirement: Llamada entrante con cita nueva
Cuando un asesor envía `IniciarTramite` en `callcenter` con `contacto` y `nuevo: true`, el caso de uso MUST NOT retomar el trámite en proceso del número: SHALL crear un trámite nuevo en el hilo del contacto `callcenter`. Si el trámite en proceso que se habría retomado tiene paciente asignado, el trámite nuevo SHALL quedar con ese mismo paciente (`PacienteAsignado`), sin pedir otra vez la identificación y sin registrar `IdentidadVinculada`. El trámite en proceso MUST quedar sin cambios.

#### Scenario: Nueva cita con paciente identificado
- **WHEN** el número 3119990004 tiene un trámite `COTIZADO` con paciente asignado y el asesor envía `IniciarTramite` con ese contacto y `nuevo: true`
- **THEN** se crea otro trámite (`TramiteIniciado`) con el mismo paciente asignado, la siguiente pregunta no es la del paciente, y el trámite anterior conserva su estado y versión

#### Scenario: Nueva cita sin paciente
- **WHEN** el trámite en proceso no tiene paciente
- **THEN** se crea el trámite nuevo sin paciente y la siguiente pregunta sigue el orden normal

#### Scenario: Sin la bandera no cambia
- **WHEN** se envía `IniciarTramite` sin `nuevo`
- **THEN** se retoma el trámite en proceso como antes
