# agenda-simulada Specification

## Purpose

Define la agenda simulada de Salud Digna en `sd-mock` (disponibilidad, registro y cancelación de citas con latencia y fallos configurables) y el cliente que la usa detrás de un puerto con reintentos acotados.

## Requirements

### Requirement: Agenda simulada en sd-mock
`sd-mock` SHALL exponer la disponibilidad de horarios por sede, servicio y fecha, el registro de una cita que devuelve un folio de 8 a 9 dígitos y la cancelación de una cita por folio. Registrar dos veces la misma reserva MUST devolver el mismo folio sin crear otra cita. Las entradas MUST validarse con Zod y una entrada inválida MUST responder 400 sin detalles internos.

#### Scenario: Registro idempotente
- **WHEN** se registra dos veces una cita con la misma reserva
- **THEN** ambas respuestas tienen el mismo folio y existe una sola cita

#### Scenario: Entrada inválida
- **WHEN** se registra una cita sin sede o con un inicio que no es una fecha ISO 8601
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
El adaptador `out-sd` SHALL implementar `AgendaExternaPort` con un tiempo límite por petición y hasta 3 intentos con espera creciente, reutilizando la misma reserva como clave para que un reintento no duplique la cita. Agotados los intentos, MUST lanzar `ReglaViolada` con regla `AGENDA_NO_DISPONIBLE`. Cada reintento MUST registrarse con `correlation_id` y sin datos personales. `AgendaExternaPort` MUST tener un adaptador en memoria.

#### Scenario: Se recupera tras dos fallos
- **WHEN** `sd-mock` falla exactamente las dos peticiones siguientes y se registra una cita
- **THEN** el cliente obtiene el folio en el tercer intento y existe una sola cita

#### Scenario: Agotados los intentos
- **WHEN** `sd-mock` está configurado con fallo 100 y se registra una cita
- **THEN** el cliente lanza `AGENDA_NO_DISPONIBLE` después de 3 intentos
