## MODIFIED Requirements

### Requirement: Agenda simulada en sd-mock
`sd-mock` SHALL exponer la disponibilidad de horarios por sede, servicio, fecha y zona horaria IANA de la sede, el registro de una cita que devuelve un folio de 8 a 9 dígitos y la cancelación de una cita por folio. La disponibilidad SHALL ser de 15 inicios cada 30 minutos desde las 09:00 locales de la fecha en esa zona (el último a las 16:00 locales), devueltos en ISO 8601 UTC. Registrar dos veces la misma reserva MUST devolver el mismo folio sin crear otra cita. Registrar una reserva cuya cita está cancelada MUST responder 409 con el código `CITA_CANCELADA`, sin reactivarla ni devolver su folio. Las entradas MUST validarse con Zod y una entrada inválida, incluida una zona que no es IANA, MUST responder 400 sin detalles internos.

#### Scenario: Registro idempotente
- **WHEN** se registra dos veces una cita con la misma reserva
- **THEN** ambas respuestas tienen el mismo folio y existe una sola cita

#### Scenario: Entrada inválida
- **WHEN** se registra una cita sin sede o con un inicio que no es una fecha ISO 8601
- **THEN** `sd-mock` responde 400 sin `stack`

#### Scenario: Cita cancelada no se reactiva
- **WHEN** se cancela una cita y se registra de nuevo la misma reserva
- **THEN** `sd-mock` responde 409 `CITA_CANCELADA` y la cita sigue cancelada

#### Scenario: Horario de atención en Tepic
- **WHEN** se consulta la disponibilidad del 2026-11-26 con zona `America/Mazatlan`
- **THEN** el primer inicio es `2026-11-26T16:00:00.000Z`, el último es `2026-11-26T23:00:00.000Z` y ninguno cae antes de las 09:00 locales

#### Scenario: Horario de atención en Tijuana
- **WHEN** se consulta la disponibilidad del 2026-11-26 con zona `America/Tijuana`
- **THEN** el primer inicio es `2026-11-26T17:00:00.000Z`

#### Scenario: Zona inválida
- **WHEN** se consulta la disponibilidad sin zona o con zona `Marte/Base`
- **THEN** `sd-mock` responde 400 sin `stack`

### Requirement: Cliente de agenda externa con reintentos
El adaptador `out-sd` SHALL implementar `AgendaExternaPort` (registrar y cancelar citas y consultar la disponibilidad por sede, servicio, fecha y zona horaria de la sede) con un tiempo límite por petición y hasta 3 intentos con espera creciente, reutilizando la misma reserva como clave para que un reintento no duplique la cita. Solo los errores de red, el tiempo límite y las respuestas 5xx MUST reintentarse; una respuesta 4xx MUST lanzar `ReglaViolada` con regla `AGENDA_NO_DISPONIBLE` sin reintentar. Agotados los intentos, MUST lanzar `ReglaViolada` con regla `AGENDA_NO_DISPONIBLE`. Cada reintento MUST registrarse con `correlation_id` y sin datos personales. `AgendaExternaPort` MUST tener un adaptador en memoria que devuelva la misma disponibilidad que `sd-mock` para la misma consulta.

#### Scenario: Se recupera tras dos fallos
- **WHEN** `sd-mock` falla exactamente las dos peticiones siguientes y se registra una cita
- **THEN** el cliente obtiene el folio en el tercer intento y existe una sola cita

#### Scenario: Agotados los intentos
- **WHEN** `sd-mock` está configurado con fallo 100 y se registra una cita
- **THEN** el cliente lanza `AGENDA_NO_DISPONIBLE` después de 3 intentos

#### Scenario: Respuesta 4xx sin reintento
- **WHEN** `sd-mock` responde 409 `CITA_CANCELADA` al registrar una cita
- **THEN** el cliente lanza `AGENDA_NO_DISPONIBLE` después de un solo intento

#### Scenario: Disponibilidad por el puerto
- **WHEN** se consulta la disponibilidad de una sede, un servicio, una fecha y una zona
- **THEN** el cliente envía la zona a `sd-mock` y devuelve los inicios ISO 8601 que responde, y el adaptador en memoria devuelve la misma lista
