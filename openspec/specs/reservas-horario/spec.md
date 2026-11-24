# reservas-horario Specification

## Purpose

Define la reserva atómica de horarios en PostgreSQL, el vencimiento del hold sin temporizador y la confirmación de la cita como saga con la agenda externa, con compensación si el trámite no puede confirmarse.

## Requirements

### Requirement: Un solo ganador por horario
Apartar un horario SHALL ser atómico sobre `(sede, recurso, inicio)`: entre solicitudes concurrentes por el mismo horario, exactamente una MUST obtener la reserva y las demás MUST recibir `ReglaViolada` con regla `HORARIO_NO_DISPONIBLE`, nunca `ConflictoVersion`. Si la solicitud no indica recurso, la agenda MUST elegir un recurso de la sede compatible con el servicio y libre a esa hora; si no hay ninguno, MUST responder `HORARIO_NO_DISPONIBLE`. El adaptador en memoria MUST seguir la misma regla.

#### Scenario: 50 intentos concurrentes por el mismo horario (prueba obligatoria)
- **WHEN** 50 solicitudes de 50 trámites distintos intentan apartar a la vez el mismo horario de una sede con un solo recurso compatible, contra Postgres
- **THEN** exactamente 1 obtiene la reserva, las otras 49 reciben `HORARIO_NO_DISPONIBLE` y en `reserva` hay una sola fila activa para ese horario

#### Scenario: Horario ocupado en memoria
- **WHEN** con `AgendaMemoria` se aparta un horario ya apartado y vigente
- **THEN** se lanza `ReglaViolada` con `HORARIO_NO_DISPONIBLE`

### Requirement: Hold vencido sin temporizador
Un hold `APARTADA` cuyo `expira_en` ya pasó según el `Reloj` SHALL dejar de bloquear su horario: al apartar ese horario, la agenda MUST marcarlo `EXPIRADA` en la misma transacción y entregar el horario al nuevo solicitante. Confirmar una reserva con el hold vencido MUST fallar con `HORARIO_NO_DISPONIBLE`.

#### Scenario: Horario de un hold vencido
- **WHEN** un hold venció y otro trámite aparta el mismo horario
- **THEN** el nuevo trámite obtiene la reserva y la reserva anterior queda `EXPIRADA`

### Requirement: Confirmación como saga con la agenda externa
Confirmar una cita SHALL seguir este orden: si el hold del trámite ya venció según el `Reloj`, el caso de uso MUST expirar el hold (el trámite vuelve a `LISTO_PARA_RESERVAR` y emite `ReservaExpirada`), guardar, liberar la reserva y lanzar `HORARIO_NO_DISPONIBLE` sin llamar a la agenda externa. Si sigue vigente, MUST obtener el folio de la agenda externa (idempotente por reserva), confirmar la reserva local con ese folio y después confirmar y guardar el trámite. Si la reserva local ya no puede confirmarse, MUST cancelar la cita externa. Si el guardado del trámite falla con `ConflictoVersion` y el trámite almacenado no quedó `CONFIRMADA` con ese mismo folio, MUST cancelar la cita externa y liberar la reserva; si quedó confirmado con ese folio, MUST NOT compensar. En todos los casos el error original MUST propagarse.

#### Scenario: Confirmación exitosa
- **WHEN** un trámite con hold vigente confirma la cita
- **THEN** la agenda externa emitió un folio de 8–9 dígitos, la reserva está `CONFIRMADA` con ese folio y el trámite está `CONFIRMADA` con `CitaConfirmada{folio}`

#### Scenario: Hold vencido al confirmar
- **WHEN** el `Reloj` pasó el `expiraEn` del hold y se confirma la cita
- **THEN** se lanza `HORARIO_NO_DISPONIBLE`, el trámite guardado está `LISTO_PARA_RESERVAR` con `ReservaExpirada` y la agenda externa no recibió ninguna llamada

#### Scenario: Conflicto tras obtener el folio
- **WHEN** entre obtener el folio y guardar, otra operación cambia el trámite sin confirmarlo
- **THEN** se lanza `ConflictoVersion`, la cita externa queda cancelada y la reserva liberada

#### Scenario: Dos confirmaciones en paralelo
- **WHEN** dos peticiones confirman a la vez el mismo trámite con hold vigente
- **THEN** una confirma, la otra recibe `ConflictoVersion`, ambas recibieron el mismo folio y la cita externa sigue activa

#### Scenario: Agenda externa caída
- **WHEN** la agenda externa falla en todos los reintentos al confirmar
- **THEN** se lanza `ReglaViolada` con `AGENDA_NO_DISPONIBLE`, el trámite sigue `HORARIO_RESERVADO` con su versión y el hold sigue vigente para reintentar
