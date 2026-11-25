# Spec Delta

## Purpose

Ajusta la agenda simulada y su cliente: la disponibilidad pasa a estar disponible por el puerto, una cita cancelada no se reactiva al registrarla de nuevo y el cliente no reintenta respuestas 4xx (H-05 de `persistencia-eventos`).

## MODIFIED Requirements

### Requirement: Agenda simulada en sd-mock
`sd-mock` SHALL exponer la disponibilidad de horarios por sede, servicio y fecha, el registro de una cita que devuelve un folio de 8 a 9 dígitos y la cancelación de una cita por folio. Registrar dos veces la misma reserva MUST devolver el mismo folio sin crear otra cita. Registrar una reserva cuya cita está cancelada MUST responder 409 con el código `CITA_CANCELADA`, sin reactivarla ni devolver su folio. Las entradas MUST validarse con Zod y una entrada inválida MUST responder 400 sin detalles internos.

#### Scenario: Registro idempotente
- **WHEN** se registra dos veces una cita con la misma reserva
- **THEN** ambas respuestas tienen el mismo folio y existe una sola cita

#### Scenario: Entrada inválida
- **WHEN** se registra una cita sin sede o con un inicio que no es una fecha ISO 8601
- **THEN** `sd-mock` responde 400 sin `stack`

#### Scenario: Cita cancelada no se reactiva
- **WHEN** se cancela una cita y se registra de nuevo la misma reserva
- **THEN** `sd-mock` responde 409 `CITA_CANCELADA` y la cita sigue cancelada

### Requirement: Cliente de agenda externa con reintentos
El adaptador `out-sd` SHALL implementar `AgendaExternaPort` (registrar y cancelar citas y consultar la disponibilidad por sede, servicio y fecha) con un tiempo límite por petición y hasta 3 intentos con espera creciente, reutilizando la misma reserva como clave para que un reintento no duplique la cita. Solo los errores de red, el tiempo límite y las respuestas 5xx MUST reintentarse; una respuesta 4xx MUST lanzar `ReglaViolada` con regla `AGENDA_NO_DISPONIBLE` sin reintentar. Agotados los intentos, MUST lanzar `ReglaViolada` con regla `AGENDA_NO_DISPONIBLE`. Cada reintento MUST registrarse con `correlation_id` y sin datos personales. `AgendaExternaPort` MUST tener un adaptador en memoria.

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
- **WHEN** se consulta la disponibilidad de una sede, un servicio y una fecha
- **THEN** el cliente devuelve los inicios ISO 8601 que responde `sd-mock`, y el adaptador en memoria devuelve una lista equivalente
