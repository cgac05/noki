## MODIFIED Requirements

### Requirement: Emisión en tiempo real desde los eventos publicados
`apps/api` SHALL servir Socket.IO en el mismo puerto HTTP, con CORS solo para `PUBLIC_BASE_URL`. Un consumidor del grupo `tiempo-real` sobre Redis Streams SHALL emitir, por cada evento publicado: `tramite:actualizado` a `tramite:<id>`, `hilo:<id>` y, si hay paciente, `paciente:<id>`; `hilo:linea-tiempo` a `hilo:<id>`; `admin:metricas` a `admin`; y `sede:fila` a `sede:<id>` cuando el evento es `PacienteLlego` o `TurnoActualizado`, con la posición del trámite en la fila de la sede según «Fila de la sede», o cuando es `AtencionCerrada`, con posición 0 (fuera de la fila). Cada dato emitido MUST validarse con `ESQUEMAS_EVENTOS_SOCKET` y MUST NOT contener datos personales más allá de lo que permite ese esquema. El consumidor MUST ser idempotente y descartar duplicados como el consumidor base.

#### Scenario: Actualización tras un comando
- **WHEN** un cliente está en la sala `tramite:<id>` y se ejecuta `SeleccionarSede` sobre ese trámite
- **THEN** recibe `tramite:actualizado` con la versión nueva en menos de 2 s

#### Scenario: Métricas en vivo
- **WHEN** un cliente está en la sala `admin` y se confirma una cita
- **THEN** recibe `admin:metricas` con `citasConfirmadas` incrementado

#### Scenario: Evento repetido en el stream
- **WHEN** el mismo evento llega dos veces al grupo `tiempo-real`
- **THEN** se procesa una sola vez

#### Scenario: Llegada a la sede
- **WHEN** se registra una llegada en Tepic y un cliente está en `sede:<Tepic>`
- **THEN** recibe `sede:fila` con el trámite y su posición en la fila, que es 1 si es la única llegada registrada

#### Scenario: Fila después de cerrar una atención
- **WHEN** en Tepic están A y B en la fila, un cliente está en `sede:<Tepic>` y recepción cierra la atención de A
- **THEN** recibe `sede:fila` con A en posición 0 y con B en posición 1
