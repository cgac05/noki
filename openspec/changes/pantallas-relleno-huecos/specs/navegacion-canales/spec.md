# Spec Delta

## ADDED Requirements

### Requirement: Cancelar una cita desde la app
`/app` SHALL ofrecer «Cancelar cita» en cada cita en estado `CONFIRMADA` y en ninguna otra. Al pulsarlo SHALL pedir confirmación en la propia vista; solo al confirmar SHALL enviar por el cliente `CancelarCita` con canal `app`, actor `paciente` y el trámite de esa cita, una sola vez aunque se pulse varias veces. Tras la respuesta, la vista SHALL mostrar el estado del trámite que devuelve el cliente: si es `CANCELADA`, que la cita se canceló; si no, que la cancelación espera aprobación en WhatsApp, con un enlace a `/wa`. Si el envío falla, SHALL mostrar el error y permitir reintentar con el mismo comando. La vista MUST NOT cambiar por sí misma el estado de la cita.

#### Scenario: Cancelación pendiente de aprobación
- **WHEN** en una cita `CONFIRMADA` se pulsa «Cancelar cita», se confirma y el cliente responde con el trámite aún en `CONFIRMADA`
- **THEN** el cliente recibió un solo `CancelarCita` con canal `app`, actor `paciente` y el trámite de la cita, y la vista indica que la cancelación espera aprobación en WhatsApp con un enlace a `/wa`

#### Scenario: Desistir de cancelar
- **WHEN** se pulsa «Cancelar cita» y después se elige no cancelar
- **THEN** no se envía ningún comando y la cita se muestra igual

#### Scenario: Cita no confirmada
- **WHEN** `/app` muestra una cita en estado `ATENDIDA`
- **THEN** la cita no ofrece «Cancelar cita»

#### Scenario: Error al cancelar
- **WHEN** el envío de `CancelarCita` falla por red
- **THEN** la vista muestra el error y reintentar envía el mismo comando con la misma clave de idempotencia
