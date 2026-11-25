# temporizadores-tramite Specification

## Purpose
Define los temporizadores del trámite sobre BullMQ: su programación a partir de los eventos publicados, el vencimiento automático del hold, la inasistencia tras la tolerancia, la expiración por inactividad y su comportamiento ante fallos.

## Requirements

### Requirement: Programación desde los eventos publicados
Un consumidor del grupo `temporizadores` sobre Redis Streams SHALL, por cada evento publicado con `tramiteId`, dejar programados los trabajos que corresponden al estado actual del trámite leído del repositorio: `HOLD` a `expiraEn` mientras esté `HORARIO_RESERVADO`; `INASISTENCIA` a `inicio + toleranciaMin` del perfil mientras esté `CONFIRMADA`; e `INACTIVIDAD` a `ultimaActividad + inactividadHoras` del tipo mientras esté en un estado previo a `CONFIRMADA`. Los trabajos que no correspondan MUST cancelarse. Cada trabajo MUST tener el identificador lógico `${tipo}:${tramiteId}`, de modo que exista como máximo uno por tipo y trámite; en BullMQ MUST guardarse con el `jobId` `${tipo}-${tramiteId}`, porque BullMQ no admite `:` en un id propio. Los escenarios nombran los trabajos por su identificador lógico. Procesar el mismo evento más de una vez, o un evento anterior después de uno posterior, MUST dejar los mismos trabajos.

#### Scenario: Hold programado al apartar
- **WHEN** un trámite aparta un horario con `expiraEn` a 10 min y se publica `HorarioReservado`
- **THEN** existe un solo trabajo `HOLD:<tramiteId>` que vence en `expiraEn` y uno `INACTIVIDAD:<tramiteId>`

#### Scenario: Confirmar cambia los trabajos
- **WHEN** el trámite confirma la cita y se publica `CitaConfirmada`
- **THEN** ya no existen `HOLD:<tramiteId>` ni `INACTIVIDAD:<tramiteId>` y existe `INASISTENCIA:<tramiteId>` con vencimiento en `inicio + toleranciaMin`

#### Scenario: Evento repetido
- **WHEN** el mismo `HorarioReservado` llega dos veces al grupo `temporizadores`
- **THEN** sigue existiendo un solo trabajo `HOLD:<tramiteId>`

#### Scenario: Evento antiguo reprocesado
- **WHEN** después de `CitaConfirmada` se reprocesa el `HorarioReservado` anterior del mismo trámite
- **THEN** no reaparece `HOLD:<tramiteId>` y `INASISTENCIA:<tramiteId>` sigue programado

#### Scenario: Trámite terminado
- **WHEN** se publica `CitaCancelada`, `PacienteLlego` o `TramiteExpirado`
- **THEN** el trámite queda sin trabajos programados

### Requirement: Vencimiento automático del hold
Cuando el `Reloj` alcanza `expiraEn` de un hold vigente, el trabajo `HOLD` SHALL, sin intervención de ningún canal, devolver el trámite a `LISTO_PARA_RESERVAR` con el evento `ReservaExpirada{ reservaId }` y dejar la reserva en estado `EXPIRADA`. Los eventos generados por un temporizador MUST llevar actor `sistema`, nivel 0 y el último canal del trámite, y MUST NOT producir `CanalCambiado`. Si el trámite ya no está `HORARIO_RESERVADO` con esa misma reserva, el trabajo MUST terminar sin cambios. Si se ejecuta antes de que el `Reloj` llegue a `expiraEn`, MUST reprogramarse sin cambios.

#### Scenario: Hold vencido sin confirmar
- **WHEN** un trámite tiene un hold de 10 min y pasan 10 min según el `Reloj` sin confirmar
- **THEN** el trámite queda `LISTO_PARA_RESERVAR`, el event store tiene `ReservaExpirada` con actor `sistema`, la reserva está `EXPIRADA` y `siguientePregunta` vuelve a pedir el horario

#### Scenario: Confirmado antes de vencer
- **WHEN** el trámite se confirma antes de `expiraEn` y después se ejecuta un `HOLD` pendiente
- **THEN** el trámite sigue `CONFIRMADA` con la misma versión y no se emite `ReservaExpirada`

#### Scenario: Ejecución anticipada
- **WHEN** el trabajo `HOLD` se ejecuta cuando el `Reloj` todavía no llega a `expiraEn`
- **THEN** el trámite no cambia y el trabajo queda programado de nuevo para `expiraEn`

#### Scenario: Confirmar y vencer a la vez
- **WHEN** un comando `ConfirmarCita` y el trabajo `HOLD` actúan sobre el mismo trámite al mismo tiempo, justo cuando el `Reloj` alcanza `expiraEn`
- **THEN** solo uno de los dos guarda su transición y el trámite termina en un único estado coherente; si ya se había registrado la cita externa y la reserva no se pudo confirmar, la cita externa se cancela

#### Scenario: Compensación imposible en la carrera
- **WHEN** en la carrera anterior la agenda externa rechaza la cancelación después de sus reintentos
- **THEN** el error original llega al canal, el trámite queda `LISTO_PARA_RESERVAR` y se registra `COMPENSACION_AGENDA_FALLIDA` con el `correlation_id` y sin datos personales, igual que en las demás compensaciones de `reservas-horario`

### Requirement: Inasistencia tras la tolerancia
Cuando el `Reloj` alcanza `inicio + toleranciaMin` de una cita `CONFIRMADA` sin llegada registrada, el trabajo `INASISTENCIA` SHALL pasar el trámite a `NO_ASISTIO` con el evento `Inasistencia{ sedeId }`. Si el trámite ya no está `CONFIRMADA`, MUST terminar sin cambios.

#### Scenario: Paciente que no llegó
- **WHEN** una cita confirmada a las 09:00 con tolerancia de 15 min llega a las 09:15 según el `Reloj` sin `PacienteLlego`
- **THEN** el trámite queda `NO_ASISTIO` y se emite `Inasistencia` con actor `sistema`

#### Scenario: Paciente que llegó
- **WHEN** la recepción registró la llegada antes de la tolerancia y después se ejecuta un `INASISTENCIA` pendiente
- **THEN** el trámite sigue `EN_CLINICA` sin eventos nuevos

### Requirement: Expiración por inactividad
Un trámite en un estado previo a `CONFIRMADA` sin ninguna operación durante las `inactividadHoras` de su tipo (24 h para `AGENDAR`) SHALL pasar a `EXPIRADO` con el evento `TramiteExpirado{ motivo: 'INACTIVIDAD' }`. Si tenía un hold, la reserva MUST quedar `EXPIRADA`. Cualquier operación que guarde al menos un evento del trámite MUST reiniciar el plazo; un comando exitoso que no emite eventos (por ejemplo, `CumplirRequisito` con el requisito ya cumplido) no cambia la versión ni `ultimaActividad` y MUST NOT reiniciarlo. Un trámite `CONFIRMADA` o posterior MUST NOT expirar por inactividad.

#### Scenario: Cotización abandonada
- **WHEN** un trámite `COTIZADO` pasa 24 h según el `Reloj` sin operaciones
- **THEN** queda `EXPIRADO`, se emite `TramiteExpirado` con motivo `INACTIVIDAD` y deja de aparecer en los trámites abiertos del paciente

#### Scenario: Actividad reinicia el plazo
- **WHEN** un trámite `COTIZADO` recibe `SeleccionarSede` a las 23 h y luego pasan otras 2 h
- **THEN** sigue `COTIZADO` y su trabajo `INACTIVIDAD` vence 24 h después de esa operación

#### Scenario: Comando sin efectos
- **WHEN** un trámite `COTIZADO` recibe a las 23 h un `CumplirRequisito` de un requisito ya cumplido, que responde con éxito sin eventos
- **THEN** su trabajo `INACTIVIDAD` sigue venciendo 24 h después de la última operación con eventos y a las 24 h queda `EXPIRADO`

#### Scenario: Cita confirmada
- **WHEN** un trámite `CONFIRMADA` pasa 24 h sin operaciones
- **THEN** no expira por inactividad

### Requirement: Temporizadores resilientes
Los trabajos programados SHALL sobrevivir al reinicio de la API y ejecutarse al volver si vencieron durante la caída. Un trabajo cuyo trámite no existe MUST terminar sin efecto. Un fallo al ejecutar MUST reintentarse hasta 3 veces con espera creciente; al agotar los intentos MUST registrarse con el código `TEMPORIZADOR_FALLIDO`, el tipo y el `tramiteId`, sin datos personales ni `stack`.

#### Scenario: Hold que vence con la API apagada
- **WHEN** la API se detiene con un `HOLD` programado, el `Reloj` pasa `expiraEn` y la API vuelve a arrancar
- **THEN** el trámite queda `LISTO_PARA_RESERVAR` con un solo `ReservaExpirada`

#### Scenario: Trámite borrado por el reinicio de la demo
- **WHEN** se ejecuta un trabajo de un trámite que ya no existe tras `pnpm demo:reset`
- **THEN** termina sin efecto y sin registrar un fallo

#### Scenario: Fallo persistente
- **WHEN** el guardado del trámite falla en los 3 intentos de un trabajo
- **THEN** el log tiene `TEMPORIZADOR_FALLIDO` con el tipo y el `tramiteId` y no contiene datos personales
