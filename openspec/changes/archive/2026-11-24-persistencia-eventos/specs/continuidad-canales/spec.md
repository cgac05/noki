# Spec Delta

## Purpose

Ajusta la continuidad entre canales para no revelar si un folio existe antes de pedir la fecha de nacimiento (H-03 de la revisión de `nucleo-tramite`) y para que el evento de intento fallido lo construya la aplicación y se persista por el event store y el outbox (H-02).

## MODIFIED Requirements

### Requirement: Resolución por prioridades
El resolvedor de continuidad SHALL evaluar, en este orden, y usar la primera fuente que aplique: (1) token de continuidad de un solo uso, que hereda el nivel y el trámite del origen; (2) contacto del canal (`wa_id`) vinculado a un paciente con trámites abiertos → nivel 1; (3) `wa_id` igual al teléfono capturado en un hilo con trámites abiertos → nivel 1, que permite mostrar el resumen pero no retomar: como el contacto no está vinculado, la política de identidad exige folio + fecha de nacimiento antes de retomar; (4) folio de 8 a 9 dígitos, que solo localiza y exige fecha de nacimiento antes de revelar o retomar; (5) datos personales declarados que coinciden con un único paciente → verificación por OTP al contacto registrado previamente. Un trámite abierto es uno en estado previo a `ATENDIDA`, `CANCELADA`, `NO_ASISTIO` o `EXPIRADO`. En la prioridad 4, todo folio bien formado sin fecha de nacimiento MUST recibir la misma respuesta (pedir la fecha de nacimiento), exista o no, esté abierto o no, sin consultar el repositorio y sin contar intento; con fecha de nacimiento, un folio inexistente, de un trámite cerrado, de otro paciente admisible o con fecha que no coincide MUST contar como intento fallido y devolver el mismo resultado sin datos.

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
