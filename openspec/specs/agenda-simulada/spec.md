# agenda-simulada Specification

## Purpose

Define la agenda simulada de Salud Digna en `sd-mock` (disponibilidad, registro y cancelación de citas con latencia y fallos configurables) y el cliente que la usa detrás de un puerto con reintentos acotados.

## Requirements

### Requirement: Agenda simulada en sd-mock
`sd-mock` SHALL exponer la disponibilidad de horarios por sede, servicio, fecha y zona horaria IANA de la sede, el registro de una cita que devuelve un folio de 8 a 9 dígitos y la cancelación de una cita por folio. La disponibilidad SHALL ser de 15 inicios cada 30 minutos desde las 09:00 locales de la fecha en esa zona (el último a las 16:00 locales), devueltos en ISO 8601 UTC. Registrar dos veces la misma reserva MUST devolver el mismo folio sin crear otra cita. Registrar una reserva cuya cita está cancelada MUST responder 409 con el código `CITA_CANCELADA`, sin reactivarla ni devolver su folio. Los folios nuevos SHALL tener 9 dígitos y MUST NOT repetir los folios sembrados de 8 dígitos ni los de un arranque anterior de `sd-mock` separado por `n` segundos, con `1 ≤ n < 899 999` (unos 10 días), que haya emitido menos de `1000 · n` folios. Pasado ese ciclo, los folios pueden repetirse. Las entradas MUST validarse con Zod y una entrada inválida, incluida una zona que no es IANA, MUST responder 400 sin detalles internos.

#### Scenario: Registro idempotente
- **WHEN** se registra dos veces una cita con la misma reserva
- **THEN** ambas respuestas tienen el mismo folio y existe una sola cita

#### Scenario: Entrada inválida
- **WHEN** se registra una cita sin sede o con un inicio que no es una fecha ISO 8601
- **THEN** `sd-mock` responde 400 sin `stack`

#### Scenario: Cita cancelada no se reactiva
- **WHEN** se cancela una cita y se registra de nuevo la misma reserva
- **THEN** `sd-mock` responde 409 `CITA_CANCELADA` y la cita sigue cancelada

#### Scenario: Folios distintos entre arranques
- **WHEN** se crea un `sd-mock` con el reloj en un instante, se registran 3 citas, se crea otro `sd-mock` con el reloj 10 segundos después y se registran 3 citas más
- **THEN** los 6 folios son distintos y todos tienen 9 dígitos

#### Scenario: Arranques separados por un segundo
- **WHEN** se crea un `sd-mock` con el reloj en un instante, se registran 2 citas y se crea otro `sd-mock` con el reloj 1 segundo después que registra 2 citas
- **THEN** los 4 folios son distintos

#### Scenario: Horario de atención en Tepic
- **WHEN** se consulta la disponibilidad del 2026-11-26 con zona `America/Mazatlan`
- **THEN** el primer inicio es `2026-11-26T16:00:00.000Z`, el último es `2026-11-26T23:00:00.000Z` y ninguno cae antes de las 09:00 locales

#### Scenario: Horario de atención en Tijuana
- **WHEN** se consulta la disponibilidad del 2026-11-26 con zona `America/Tijuana`
- **THEN** el primer inicio es `2026-11-26T17:00:00.000Z`

#### Scenario: Zona inválida
- **WHEN** se consulta la disponibilidad sin zona o con zona `Marte/Base`
- **THEN** `sd-mock` responde 400 sin `stack`

### Requirement: Latencia y fallos configurables
`sd-mock` SHALL permitir configurar una latencia en milisegundos y un porcentaje de fallo para todas sus rutas de agenda, de forma global y por petición con `?latencia=ms&fallo=%`, y además fallar un número exacto de peticiones siguientes para pruebas deterministas. Un fallo simulado MUST responder 503. Con fallo 0 nunca falla y con fallo 100 siempre falla.

#### Scenario: Fallo al 100 %
- **WHEN** se configura `fallo=100` y se registra una cita
- **THEN** responde 503 y no se crea ninguna cita

#### Scenario: Latencia
- **WHEN** se configura una latencia de 300 ms
- **THEN** la respuesta de registro llega después de al menos 300 ms

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
