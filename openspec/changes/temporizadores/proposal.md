# Proposal

## Why

El dominio ya tiene las transiciones temporales de `PLAN.md` §6 (`expirarHold`, `marcarInasistencia`, `expirarPorInactividad`), pero nada las dispara. Hoy el hold solo vence de forma perezosa: cuando alguien intenta confirmar tarde o cuando otro trámite aparta el mismo horario (`reservas-horario`, "Hold vencido sin temporizador"). Mientras tanto el trámite sigue en `HORARIO_RESERVADO`, `/admin` no ve `ReservaExpirada` y la demostración de resiliencia de `PLAN.md` §12 ("el hold expira → `ReservaExpirada` → se ofrecen horarios nuevos sin error") no se puede mostrar en vivo. Tampoco hay forma de "adelantar el reloj" que exige `PLAN.md` §14.13.

`PLAN.md` §3 y §6 fijan BullMQ para los temporizadores y `AGENTS.md` §7 fija el `job_id` determinista `${tipo}:${tramiteId}`. Este cambio pone esa infraestructura y la usa para las tres transiciones que ya existen, de modo que los recordatorios (§10.2) y las ofertas de huecos (§10.1) puedan montarse después sobre el mismo puerto.

## What Changes

- **Puerto `ProgramadorTemporizadores`** en `packages/application` con adaptador BullMQ (cola en `out-redis`, worker en `in-events`) y adaptador en memoria para pruebas (design D1, D2).
- **Programación desde los eventos publicados**: un consumidor nuevo del grupo `temporizadores` sobre Redis Streams reconcilia, por cada evento con `tramiteId`, los trabajos del trámite con su estado actual leído del repositorio. Así es idempotente y no depende del orden de reproceso (design D3).
- **Tres temporizadores** con `job_id` `${tipo}:${tramiteId}` (design D4):
  - `HOLD`: al llegar `expiraEn`, el trámite vuelve a `LISTO_PARA_RESERVAR`, emite `ReservaExpirada` y la reserva queda `EXPIRADA`.
  - `INASISTENCIA`: a `inicio + perfil.toleranciaMin` de una cita `CONFIRMADA` sin llegada, el trámite pasa a `NO_ASISTIO` y emite `Inasistencia`.
  - `INACTIVIDAD`: tras 24 h sin actividad (valor del tipo `AGENDAR` en el registro de tipos), un trámite previo a `CONFIRMADA` pasa a `EXPIRADO` y emite `TramiteExpirado{ motivo: 'INACTIVIDAD' }`; si tenía hold, la reserva se libera.
- **Ejecución segura**: cada trabajo vuelve a comprobar el estado y el `Reloj` antes de aplicar; si no corresponde, no hace nada, y si aún no vence, se reprograma. Actor `sistema`, nivel 0, canal = último canal del trámite. Reintentos con espera y registro de fallos sin datos personales (design D5).
- **Reloj ajustable de demo**: `RelojSistema` se sustituye en `apps/api` por un reloj con desfase. `POST /api/demo/reloj { adelantarMinutos }` (404 fuera de `DEMO_MODE=true`) adelanta el reloj de toda la API y adelanta los trabajos que ya vencieron con el nuevo tiempo (design D6).
- **Dominio**: `Tramite` expone `ultimaActividad` (ts de la última operación) y el registro de tipos declara `inactividadHoras`. `AgendaPort` gana `expirar(reservaId)` para dejar la reserva `EXPIRADA` en lugar de `CANCELADA` (design D4, D7).

### Fuera de alcance

- Recordatorios `T48`, `PREPARACION`, `T2` y `POST` (§10.2), con su notificador, opt-in y horario de silencio: cambio `recordatorios` posterior sobre este puerto.
- TTL de ofertas de hueco (§10.1), "recuperación tras X h de inactividad" y el evento `TramiteSuspendido`: necesitan notificar al paciente.
- Avisar proactivamente al paciente por WhatsApp de que su hold venció. Al siguiente mensaje, `siguientePregunta` vuelve a pedir el horario.
- Botón "adelantar reloj" en `/admin` y el esquema del endpoint en `@noki/contracts`: es frente B y archivo compartido; va en un cambio compartido pequeño posterior (design, Open Questions).
- Reprogramar una cita, clonar un trámite `EXPIRADO` y avisar a la agenda externa de una inasistencia.
- Retroceder el reloj de demo.

## Capabilities

### New Capabilities

- `temporizadores-tramite`: programación de temporizadores desde los eventos, vencimiento automático del hold, inasistencia tras la tolerancia, expiración por inactividad y su resiliencia.
- `reloj-demo`: reloj ajustable de la API en modo demo y disparo de los temporizadores vencidos al adelantarlo.

### Modified Capabilities

Ninguna. `reservas-horario` conserva su vencimiento perezoso como respaldo; `tiempo-real` ya emite cualquier evento publicado, incluidos los que producen los temporizadores.

## Impact

- **Frente A únicamente**: `packages/domain` (getter `ultimaActividad`, `inactividadHoras` en la definición de `AGENDAR`), `packages/application` (puerto, casos de uso `TemporizadoresTramite` y `RelojDemo`, `AgendaPort.expirar`), `packages/adapters/{memory,out-redis,in-events,in-http,out-postgres}`, `apps/api` (composición, reloj ajustable, arranque y cierre del worker), pruebas en `tests/unit/` y `tests/integracion/`, y `docs/persistencia.md` si cambia la descripción de la reserva.
- **Dependencia nueva**: `bullmq` (versión exacta) en `out-redis` e `in-events`; actualiza `pnpm-lock.yaml`. Según `docs/trabajo-paralelo.md`, hacer rebase sobre `main` y `pnpm install` justo antes de integrar.
- **Sin archivos compartidos**: no cambia `@noki/contracts`, `docs/eventos.md` (todos los eventos usados ya existen), `docs/contratos.md`, `AGENTS.md`, `.env.example` ni la configuración raíz. Por eso basta la autorización del frente A.
- **Sin migración**: la columna `reserva.estado` ya admite `EXPIRADA` y `tramite.ultima_actividad` ya existe.
- **Riesgo para el Flujo A**: bajo si el hold dura lo de `perfil.ttlReservaMin` y la confirmación ocurre antes; el temporizador solo hace visible y explícito lo que la agenda ya hacía de forma perezosa.
