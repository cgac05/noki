# tiempo-real Specification

## Purpose
Define el servidor de Socket.IO de la API, alimentado por los eventos publicados en Redis Streams, con los nombres, esquemas y salas del contrato.

## Requirements

### Requirement: Emisión en tiempo real desde los eventos publicados
`apps/api` SHALL servir Socket.IO en el mismo puerto HTTP, con CORS solo para `PUBLIC_BASE_URL`. Un consumidor del grupo `tiempo-real` sobre Redis Streams SHALL emitir, por cada evento publicado: `tramite:actualizado` a `tramite:<id>`, `hilo:<id>` y, si hay paciente, `paciente:<id>`; `hilo:linea-tiempo` a `hilo:<id>`; `admin:metricas` a `admin`; y `sede:fila` a `sede:<id>` cuando el evento es `PacienteLlego`. Cada dato emitido MUST validarse con `ESQUEMAS_EVENTOS_SOCKET` y MUST NOT contener datos personales más allá de lo que permite ese esquema. El consumidor MUST ser idempotente y descartar duplicados como el consumidor base.

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
- **THEN** recibe `sede:fila` con el trámite y una posición entera no negativa

### Requirement: Cierre ordenado del tiempo real
Al recibir `SIGINT` o `SIGTERM`, la API SHALL cerrar Socket.IO y detener el consumidor `tiempo-real` antes del relay y de las conexiones a Postgres y Redis, sin perder eventos: lo no confirmado con `XACK` se reprocesa al reiniciar.

#### Scenario: Reinicio con eventos pendientes
- **WHEN** la API se detiene después de leer un evento y antes de confirmarlo, y vuelve a arrancar
- **THEN** el evento se emite al reiniciar
