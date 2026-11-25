# Spec Delta

## ADDED Requirements

### Requirement: Cancelar una cita desde la app
`/app` SHALL ofrecer «Cancelar cita» en cada cita en estado `CONFIRMADA` y en ninguna otra. Al pulsarlo SHALL pedir confirmación en la propia vista; solo al confirmar SHALL enviar por el cliente `CancelarCita` con canal `app`, actor `paciente` y el trámite de esa cita, una sola vez aunque se pulse varias veces. Si el cliente rechaza el comando con el código `STEP_UP_REQUERIDO`, la vista SHALL indicar que la cancelación espera aprobación en WhatsApp, con un enlace a `/wa`, sin mostrarlo como error, y la cita SHALL seguir ofreciendo «Cancelar cita» para pedir otra aprobación con un comando nuevo. Si el cliente responde con el trámite `CANCELADA`, SHALL indicar que la cita se canceló. Cualquier otro fallo SHALL mostrarse como error con la opción de reintentar el mismo comando. La vista MUST NOT cambiar por sí misma el estado de la cita.

#### Scenario: Cancelación pendiente de aprobación
- **WHEN** en una cita `CONFIRMADA` se pulsa «Cancelar cita», se confirma y el cliente rechaza el comando con `STEP_UP_REQUERIDO`
- **THEN** el cliente recibió un solo `CancelarCita` con canal `app`, actor `paciente` y el trámite de la cita, la vista indica sin error que la cancelación espera aprobación en WhatsApp con un enlace a `/wa`, y la cita se muestra igual

#### Scenario: Pedir otra aprobación
- **WHEN** tras quedar pendiente de aprobación se vuelve a pulsar «Cancelar cita» y se confirma
- **THEN** el cliente recibe otro `CancelarCita` con una clave de idempotencia distinta de la primera

#### Scenario: Desistir de cancelar
- **WHEN** se pulsa «Cancelar cita» y después se elige no cancelar
- **THEN** no se envía ningún comando y la cita se muestra igual

#### Scenario: Cita no confirmada
- **WHEN** `/app` muestra una cita en estado `ATENDIDA`
- **THEN** la cita no ofrece «Cancelar cita»

#### Scenario: Error al cancelar
- **WHEN** el envío de `CancelarCita` falla por red
- **THEN** la vista muestra el error y reintentar envía el mismo comando con la misma clave de idempotencia
