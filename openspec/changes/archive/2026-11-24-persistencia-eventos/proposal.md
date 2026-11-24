# Proposal

## Why

`nucleo-tramite` (archivado) dejó el trámite, la continuidad y la política de identidad funcionando solo con adaptadores en memoria. Para que el Flujo A (`PLAN.md` §12) sobreviva a un reinicio, no reserve dos veces el mismo horario y alimente después la línea de tiempo, el tablero y los consumidores, el núcleo necesita persistencia real con eventos publicados. Corresponde a la fase "Infraestructura real" (horas 6–10) de `PLAN.md` §11 y a la fila `persistencia-eventos` del frente A en `docs/trabajo-paralelo.md` ("event store y outbox, Redis Streams, reservas, `sd-mock`"). Este cambio también resuelve las sugerencias H-02 a H-05 de la revisión de `nucleo-tramite`, que se dejaron para este punto.

## What Changes

- **Migración `002_persistencia`** (sin editar `001_nucleo`): estado serializado del trámite y su canal de origen, folio en la reserva, hilo y nivel del contacto y del vínculo, contador de intentos de verificación por contacto y secuencia de folios de la agenda simulada si hace falta. Además convierte `evento.idempotency_key` y `evento_procesado.idempotency_key` de `uuid` a `text` (con un `CHECK` de formato), porque una operación con varios eventos genera claves `<uuid>:n` (design D2).
- **Repositorios Postgres** (`packages/adapters/out-postgres`, Kysely) de los puertos existentes: trámites (con concurrencia optimista y **outbox**: estado, eventos y filas de outbox en la misma transacción), hilos, contactos y vínculos, pacientes (las comparaciones de fecha de nacimiento y la búsqueda por datos ocurren en SQL y nunca devuelven esos datos), catálogo e intentos de verificación.
- **Event store**: cada evento guardado queda en la tabla `evento` con su envoltura completa y su `idempotency_key` única; la partición del outbox es `hash(pacienteId ?? hiloId) % 8` (`AGENTS.md` §7).
- **Relay del outbox a Redis Streams**: servicio de aplicación con puertos `OutboxPort` (Postgres) y `PublicadorEventos` (`out-redis`), publicación al menos una vez en `eventos:{n}`, sin perder eventos ni marcar como publicado lo que falló. Se arranca en `apps/api`.
- **Consumidor base de Redis Streams** (`packages/adapters/in-events`): grupos de consumidores, reproceso de pendientes al reiniciar, descarte de duplicados por `idempotency_key` (puerto `RegistroProcesados` con `evento_procesado`) y envío a `eventos:fallidos` tras 3 fallos. Sin consumidores de negocio todavía.
- **Reservas atómicas en Postgres** (`AgendaPort`): el índice único de `reserva` garantiza un solo ganador; un hold vencido deja de bloquear el horario; horario ocupado o hold vencido responden `ReglaViolada('HORARIO_NO_DISPONIBLE')` (H-05).
- **`sd-mock` con agenda simulada**: disponibilidad de horarios, registro idempotente de citas que devuelve el folio y cancelación, con latencia y porcentaje de fallo configurables. Cliente `out-sd` con reintentos acotados detrás de un puerto nuevo `AgendaExternaPort`.
- **Confirmación como saga** (H-04): el folio lo emite la agenda simulada; la confirmación es idempotente por reserva y, si el trámite no puede guardarse, se compensa (cita cancelada en `sd-mock` y reserva liberada). Un hold vencido detectado al confirmar regresa el trámite a `LISTO_PARA_RESERVAR` con `ReservaExpirada`.
- **H-02**: el registro de intentos solo cuenta y bloquea; `IntentoVerificacionFallido` lo construye la aplicación y se guarda por el mismo event store y outbox.
- **H-03**: un folio bien formado sin fecha de nacimiento recibe siempre la misma respuesta, exista o no; un folio inexistente con fecha cuenta como intento fallido.
- **Pruebas**: unitarias con adaptadores en memoria para cada puerto nuevo o cambiado, y de integración contra Postgres y Redis reales, incluida la obligatoria de `AGENTS.md` §9 "50 intentos concurrentes por el mismo horario → exactamente 1 éxito".

Fuera de alcance: BullMQ y temporizadores (expiración programada del hold, recuperación por inactividad, `EXPIRADO`, `NO_ASISTIO` por tolerancia; ver design D10), consumidores de negocio (proyecciones, tiempo real, notificador, huecos, recordatorios), `POST /api/comandos`, consultas HTTP y Socket.IO (`api-comandos`), conectar los casos de uso a Postgres en `apps/api` (lo hace `api-comandos` en el composition root), tokens firmados con jose, OTP y PIN reales (`VerificadorTokens` sigue en memoria), catálogo y resultados en `sd-mock` (el catálogo se lee de las tablas sembradas), vista de `eventos:fallidos` en `/admin`, carga con k6 y cualquier archivo de `apps/web`.

## Capabilities

### New Capabilities
- `persistencia-tramites`: migración `002`, repositorios Postgres de los puertos del núcleo, event store y outbox en la misma transacción con concurrencia optimista y partición.
- `publicacion-eventos`: relay del outbox a Redis Streams particionados y consumidor base idempotente con reproceso y cola de fallidos.
- `reservas-horario`: holds atómicos en Postgres, vencimiento del hold sin temporizador, confirmación como saga con la agenda externa y compensación.
- `agenda-simulada`: agenda de `sd-mock` con latencia y fallos configurables, y su cliente con reintentos.

### Modified Capabilities
- `continuidad-canales`: "Resolución por prioridades" (respuesta uniforme para folios sin fecha, H-03) y "Límite de intentos" (evento construido en aplicación y persistido por el outbox, H-02).

## Impact

- Archivos del frente A: `infra/migraciones/002_persistencia.sql` (nuevo), `packages/domain/src/**` (instantánea y rehidratación del trámite, `RecursoId`), `packages/application/src/**` (puertos nuevos y cambiados, relay, saga de confirmación, ajustes del resolvedor), `packages/adapters/{memory,out-postgres,out-redis,in-events,out-sd}/**`, `apps/sd-mock/src/**`, `apps/api/src/main.ts` (arranque y cierre del relay), pruebas en `tests/unit/` y `tests/integracion/`, y una guía nueva `docs/persistencia.md`.
- Dependencias: `ioredis` 5.8.2 (ya fijada en la raíz y en `out-redis`) se agrega a `packages/adapters/in-events/package.json` y `zod` 4.1.13 (ya fijada en `contracts`) a `apps/sd-mock/package.json`; cambia `pnpm-lock.yaml`, así que se hace rebase sobre `main` y `pnpm install` justo antes de integrar (`docs/trabajo-paralelo.md`). Ninguna dependencia que no esté ya en el workspace; `out-sd` usa `fetch` de Node.
- **No** se modifican archivos compartidos (`packages/contracts`, `docs/contratos.md`, `docs/eventos.md`, `AGENTS.md`, `PLAN.md`, configuración raíz, `.env.example`) ni `apps/web`. El vocabulario de eventos y errores alcanza: las reglas nuevas son valores de `ReglaViolada.regla` (`HORARIO_NO_DISPONIBLE`, `AGENDA_NO_DISPONIBLE`). `docs/eventos.md` dice que la base no implementa outbox; esa frase queda desactualizada y se corrige en un cambio compartido aparte (design, Open Questions).
- Contratos internos que cambian (puertos de aplicación, no API): `AgendaPort.confirmar` recibe el folio en lugar de generarlo; `RegistroIntentos.fallar` deja de construir eventos; puertos nuevos `AgendaExternaPort`, `EventosSinTramite`, `OutboxPort`, `PublicadorEventos` y `RegistroProcesados`. Los casos de uso y adaptadores en memoria se ajustan en este mismo cambio.
- Dependencia para `api-comandos`: conecta los repositorios Postgres en `apps/api/src/main.ts`, traduce `HORARIO_NO_DISPONIBLE` y `AGENDA_NO_DISPONIBLE` (422) y agrega los consumidores de tiempo real sobre el consumidor base.
- Riesgo: sin BullMQ, un hold vencido solo se detecta al confirmar o al apartar ese horario; el trámite puede mostrarse `HORARIO_RESERVADO` hasta entonces (design D10).
- Riesgo: el cambio es grande para un bloque de 4 h. Las tareas están ordenadas para que los grupos 1–3 (persistencia, outbox y reservas) basten para `api-comandos` si el tiempo aprieta.
- Responsable: frente A (`J3sus-esb` y Christian Avila, co-responsables). La implementación solo procede con la autorización de uno de ellos registrada en `handoff.md`.
