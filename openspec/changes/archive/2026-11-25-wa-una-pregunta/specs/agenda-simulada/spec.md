## MODIFIED Requirements

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
