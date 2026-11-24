# continuidad-canales Specification

## Purpose

Permite que un paciente continúe en otro canal un trámite empezado en uno anterior sin repetir datos, revelando solo lo que su nivel de identidad permite y resistiendo intentos de adivinar.

## Requirements

### Requirement: Resolución por prioridades
El resolvedor de continuidad SHALL evaluar, en este orden, y usar la primera fuente que aplique: (1) token de continuidad de un solo uso, que hereda el nivel y el trámite del origen; (2) contacto del canal (`wa_id`) vinculado a un paciente con trámites abiertos → nivel 1; (3) `wa_id` igual al teléfono capturado en un hilo con trámites abiertos → nivel 1, que permite mostrar el resumen pero no retomar: como el contacto no está vinculado, la política de identidad exige folio + fecha de nacimiento antes de retomar; (4) folio de 8 a 9 dígitos, que solo localiza y exige fecha de nacimiento antes de revelar o retomar; (5) datos personales declarados que coinciden con un único paciente → verificación por OTP al contacto registrado previamente. Un trámite abierto es uno en estado previo a `ATENDIDA`, `CANCELADA`, `NO_ASISTIO` o `EXPIRADO`.

#### Scenario: El token gana
- **WHEN** un `wa_id` vinculado a otro paciente envía un token válido
- **THEN** se retoma el trámite del token con el nivel del origen, no los del vínculo

#### Scenario: Token de un solo uso
- **WHEN** se usa por segunda vez un token de continuidad ya consumido
- **THEN** no se retoma ningún trámite y cuenta como intento fallido

#### Scenario: Folio sin fecha de nacimiento
- **WHEN** se envía un folio existente sin fecha de nacimiento
- **THEN** el resultado pide la fecha de nacimiento y no revela servicio, sede ni estado

#### Scenario: Datos personales con coincidencia única
- **WHEN** los datos declarados coinciden con un solo paciente
- **THEN** el resultado pide verificar por OTP al contacto registrado y no revela ningún dato del paciente

### Requirement: Revelación mínima y ambigüedad
Con nivel 1 el resultado SHALL revelar únicamente servicio, sede, fecha del horario si existe y canal de origen de cada trámite abierto. Si la fuente aplicable lleva a más de un paciente, o a ninguno, el resolvedor MUST devolver un único resultado sin datos que sea indistinguible entre "ambiguo" y "sin coincidencia", y MUST NOT confirmar datos que el usuario no dio. Varios trámites abiertos del mismo paciente MAY listarse con la información de nivel 1.

#### Scenario: Teléfono familiar ambiguo
- **WHEN** un `wa_id` está vinculado a dos pacientes que tienen trámites abiertos
- **THEN** el resultado no contiene IDs, servicios, sedes ni nombres y es igual al de un `wa_id` desconocido

#### Scenario: Varios trámites del mismo paciente
- **WHEN** un `wa_id` vinculado a un solo paciente tiene dos trámites abiertos
- **THEN** el resultado lista ambos solo con servicio, sede, fecha y canal de origen

### Requirement: Límite de intentos
Cada verificación fallida (token inválido o consumido, folio con fecha de nacimiento que no coincide, datos sin coincidencia única) SHALL contarse por contacto y emitir `IntentoVerificacionFallido{metodo, intentos}` sin datos personales. Al tercer fallo el contacto MUST quedar bloqueado temporalmente (15 minutos según el `Reloj`); mientras dure, el resolvedor MUST rechazar cualquier fuente sin evaluarla. Una resolución exitosa MUST reiniciar el contador.

#### Scenario: Tercer intento bloquea
- **WHEN** un contacto falla tres veces la fecha de nacimiento de un folio
- **THEN** se emiten tres `IntentoVerificacionFallido` y el cuarto intento, incluso correcto, se rechaza como bloqueado hasta que el `Reloj` avance 15 minutos

### Requirement: Reanudación en el canal nuevo
Al retomar con éxito, el caso de uso SHALL registrar el cambio de canal, vincular el contacto del canal nuevo con el paciente cuando la fuente fue un token emitido para ese paciente (`IdentidadVinculada`) y devolver el trámite con `siguientePregunta` calculada para el canal nuevo. Las casillas ya llenas MUST NOT volver a pedirse.

#### Scenario: Continuidad Call Center → WhatsApp (prueba obligatoria)
- **WHEN** el asesor asigna paciente, selecciona servicio y sede y registra los requisitos en `callcenter` (el trámite queda `LISTO_PARA_RESERVAR`), emite un token de continuidad, y el paciente lo envía desde `whatsapp`
- **THEN** el trámite se retoma con `CanalCambiado{de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC'}`, el `wa_id` queda vinculado, la siguiente pregunta es `horario` sin pedir servicio, sede, paciente ni requisitos, y apartar el horario desde `whatsapp` funciona

#### Scenario: Segunda visita sin token
- **WHEN** después de esa vinculación el mismo `wa_id` escribe sin token
- **THEN** se reconoce por la prioridad 2 con nivel 1 y se retoma en la misma casilla
