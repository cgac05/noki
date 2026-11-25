## ADDED Requirements

### Requirement: Varias operaciones en un mismo mensaje
Cuando un solo mensaje de WhatsApp ejecuta más de una operación del núcleo (por ejemplo, cumplir un requisito y después reservar el horario preferido, o retomar y después confirmar un hold vencido), la primera operación SHALL usar la `Idempotency-Key` del mensaje y cada operación siguiente SHALL usar una clave nueva (UUID v7) con el mismo `correlation_id`. Ningún evento del mensaje MUST compartir `idempotency_key` con otro, y el mensaje MUST NOT responder 500 por una clave repetida.

#### Scenario: Paciente asignado desde el call center
- **WHEN** el asesor asigna a Ana, cotiza Química sanguínea en Tepic y solicita la continuación, y en WhatsApp se envía `CONTINUAR <token>`, se elige un horario y se pulsa «Acepto la preparación»
- **THEN** la respuesta es 200, el trámite queda `HORARIO_RESERVADO` en ese horario, el bot ofrece «Confirmar cita» y los eventos `PreparacionAceptada` y `HorarioReservado` tienen claves distintas, tanto en memoria como en Postgres

#### Scenario: Reintento del mismo mensaje
- **WHEN** se reenvía ese mensaje con la misma `Idempotency-Key`
- **THEN** la respuesta es igual a la primera y no se registra ningún evento nuevo
