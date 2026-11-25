# Proposal

## Why

`persistencia-eventos` (archivado) dejó el núcleo con Postgres, outbox, Redis Streams, reservas atómicas y la agenda de `sd-mock`, pero la API solo expone `/health` y `/ready`: ningún canal puede operar un trámite real. `contratos-consultas` (archivado) fijó las 9 consultas GET de `RUTAS_CONSULTAS` y la web ya las usa en modo mock, a la espera de esta API. Este cambio es la fila `api-comandos` del frente A (horas 10–14 de `docs/trabajo-paralelo.md`; fase MVP de `PLAN.md` §11) y deja todo listo para la integración conjunta del Flujo A (horas 14–18), cuando el frente B cambie a `VITE_API=real`. También atiende los pendientes que las revisiones anteriores dejaron para este punto: H-02 a H-05 de `persistencia-eventos` y H-01 y H-02 de `contratos-consultas`.

## What Changes

- **`POST /api/comandos`** (`packages/adapters/in-http`): valida el cuerpo con `ComandoRequestSchema`, exige `Idempotency-Key` (UUID), traduce cada `tipo` al caso de uso de `CasosTramite` y responde con `RespuestaComandoSchema`. Errores según `AGENTS.md` §6 y `MAPEO_ERRORES_HTTP`, con `CuerpoErrorSchema` y sin detalles internos. Repetir una clave con el mismo cuerpo devuelve la misma respuesta sin volver a ejecutar; con otro cuerpo responde 400 (design D3).
- **Actores y sesión (H-01, preparado)**: sin sesión, los actores internos (`asesor:<id>`, `recepcion:<id>`) del cuerpo solo se aceptan con `DEMO_MODE=true`; `sistema` nunca llega por HTTP. Si llega `Authorization: Bearer <token de contexto>` válido, su nivel y paciente alimentan el contexto de identidad. La emisión de sesiones queda para el cambio de seguridad (design D5).
- **Las 9 consultas GET de `RUTAS_CONSULTAS`**, cada una validando parámetros con el esquema de la tabla y respondiendo con el esquema de la tabla, sobre un puerto de lectura nuevo (`LecturasPort`) con adaptadores Postgres y en memoria. `GET /api/demo/bandeja` solo existe con `DEMO_MODE=true`. Se definen las claves de `metricas.kpis` (design D7).
- **Tokens firmados con `jose`** (`packages/adapters/out-security`): verificador real de `VerificadorTokens` (HS256 con `TOKEN_SECRET`, `jti` de un solo uso registrado en `token_usado`) y emisor del `tokenQr` de cada cita (uso `LLEGADA`), estable entre lecturas y nunca el folio (design D4).
- **WhatsApp simulado**: `POST /api/canales/wa/mensajes` con `SolicitudMensajeWaSchema` → `RespuestaMensajeWaSchema`. Un motor de conversación en el adaptador traduce `CONTINUAR <token>`, texto libre, botones y respuestas del modal tipo Flow a casos de uso, y arma cada mensaje del bot desde `siguientePregunta` (lista, botones o Flow) sin repetir datos sensibles. Estado de conversación por contacto en un puerto nuevo (design D6).
- **Socket.IO** en `apps/api`: un consumidor `tiempo-real` sobre Redis Streams emite `tramite:actualizado`, `hilo:linea-tiempo`, `admin:metricas` y `sede:fila` a las salas de `AGENTS.md` §7, con los esquemas de `ESQUEMAS_EVENTOS_SOCKET` (design D8).
- **Composition root** (`apps/api/src/main.ts`): conecta los adaptadores Postgres, Redis, `out-sd` y `out-security`; CORS para `PUBLIC_BASE_URL`; logger pino con `correlation_id` inyectado en `AgendaExternaSd` y en `CasosTramite.registrarError` (**H-02** de `persistencia-eventos`); espera creciente del relay y aviso sin repetir mientras Postgres o Redis fallan (**H-03**).
- **Migración `004_api`** (revisión 4; `003` lo tomó `identidad-paciente`): claves de idempotencia de comandos, estado de conversación de WhatsApp y bandeja de demo.
- **Agenda externa**: `AgendaExternaPort.disponibilidad` (lo usa la lista de horarios de WhatsApp); `sd-mock` responde error si se registra de nuevo una reserva cuya cita se canceló y el cliente no reintenta respuestas 4xx (**H-05**).
- **H-04**: se documenta en `docs/persistencia.md` el orden de publicación entre transacciones concurrentes del mismo paciente.
- **Pruebas**: unitarias de los adaptadores HTTP con `fastify.inject` y adaptadores en memoria; integración de comandos, consultas, WhatsApp y Socket.IO contra Postgres y Redis reales; la obligatoria de `AGENTS.md` §9 "un token de un solo uso no funciona la segunda vez" con el verificador real.

### Revisión 4: lo que ya está en `main`

`contratos-flujo-a` (`9de129b`), `simulador-wa` (`42d6a78`) e `identidad-paciente` (`91de578`) están integrados. Esta API traduce también `IdentificarPaciente`, y el motor de WhatsApp identifica al paciente por pasos con el caso de uso de `identidad-paciente`, en lugar del Flow de coincidencia exacta de las revisiones 1–3. El grupo 7 ya no espera a nadie.

### Lo que dependía del cambio compartido `contratos-flujo-a`

El contrato vigente no alcanza para operar el Flujo A real de punta a punta. Esas piezas se proponen en un cambio compartido aparte, `contratos-flujo-a` (necesita el visto bueno del frente B), y aquí solo se implementa su lado del servidor cuando ese cambio esté en `main` (tareas del grupo 7):

- `IniciarTramite` no lleva el contacto (ANI o teléfono); sin él no hay hilo con teléfono ni ficha.
- No hay comando para "Continuar por WhatsApp" desde el call center (consentimiento + código de continuación de `PLAN.md` §9), ni de dónde sacar `codigoContinuacion` en la ficha.
- `FichaHilo` exige nombre y teléfono aunque el hilo aún no tenga paciente ni teléfono.
- `TramiteVista` no expone la reserva, y `ConfirmarCita` la exige.
- `CodigoErrorSchema` no tiene un código para errores internos (500).
- No hay mensaje de cliente para unirse a una sala de Socket.IO.
- `/app` no tiene de dónde obtener `pacienteId` en modo real (H-02 de `contratos-consultas`).

Fuera de alcance: BullMQ y temporizadores (cambio aparte), corrección de `docs/eventos.md` (cambio compartido aparte), emisión de sesiones, login con PIN, OTP y enlace mágico (cambio de seguridad), `POST /api/demo/reloj` y `reset` por HTTP, consumidores de negocio distintos de `tiempo-real` (proyecciones, notificador, huecos, recordatorios), `@socket.io/redis-adapter` (una sola instancia de API), webhook real de Meta, Flujo B y C más allá de lo que da el motor genérico, `/api/admin/embudo` y `/api/admin/huecos`, y cualquier archivo de `apps/web` o compartido.

## Capabilities

### New Capabilities
- `api-comandos`: `POST /api/comandos`, idempotencia por clave, traducción de errores, actores sin sesión, CORS, composición y arranque de la API (H-02, H-03).
- `consultas-api`: las 9 consultas GET de `RUTAS_CONSULTAS`, el puerto de lectura, la bandeja de demo y las claves de `metricas.kpis`.
- `tokens-firmados`: tokens JWS de un solo uso con `jti`, `tokenQr` de la cita y verificación del token de contexto.
- `canal-whatsapp`: endpoint del simulador de WhatsApp y motor de conversación guiado por `siguientePregunta`.
- `tiempo-real`: Socket.IO con salas y eventos del contrato alimentado por Redis Streams.

### Modified Capabilities
- `agenda-simulada`: disponibilidad en el puerto de agenda externa; cita cancelada no se reactiva al registrar de nuevo y el cliente no reintenta 4xx (H-05).

## Impact

- Archivos del frente A: `infra/migraciones/004_api.sql` (nuevo), `packages/application/src/**` (puertos `LecturasPort`, `RegistroComandos`, `ConversacionesWa`, `RegistroTokensUsados`, `BandejaPort`, `AgendaExternaPort.disponibilidad`), `packages/adapters/{in-http,in-events,memory,out-postgres,out-security,out-sd}/**`, `apps/api/**`, `apps/sd-mock/src/**`, `docs/persistencia.md`, pruebas en `packages/adapters/in-http/test/`, `tests/unit/` y `tests/integracion/`. `packages/domain` solo para un método de lectura y, con `contratos-flujo-a`, un método que emite el evento ya existente `ConsentimientoContactoWA`; ningún estado ni evento nuevo.
- Dependencias nuevas, con versión exacta y compatibles con Fastify 5.6.2: `jose` en `out-security`; `socket.io` y `@fastify/cors` en `apps/api`; `socket.io-client` como devDependency de `apps/api` para las pruebas; `date-fns` y `date-fns-tz` en `in-http`, `memory` y `apps/api` para presentar fechas en la zona de la sede (`AGENTS.md` §6, revisión 2); `fastify` 5.6.2 (ya fijada) en `in-http`. Cambia `pnpm-lock.yaml`: rebase sobre `main` y `pnpm install` justo antes de integrar. El `package.json` raíz no cambia.
- **No** se modifican archivos compartidos (`packages/contracts`, `docs/contratos.md`, `docs/eventos.md`, `AGENTS.md`, `PLAN.md`, configuración raíz, `.env.example`) ni `apps/web`. Las claves de `metricas.kpis` quedan en el spec `consultas-api`; su documentación en `docs/contratos.md` va en `contratos-flujo-a`.
- Contratos internos que cambian (puertos de aplicación, no API): `AgendaExternaPort` gana `disponibilidad`; `crearApi` recibe sus dependencias ya construidas en lugar de URLs. Se adaptan las pruebas existentes que usan `crearApi`, conservando cada comprobación.
- Riesgo: el cambio es grande para un bloque de 4 h. Las tareas están ordenadas por valor para el Flujo A: grupos 1–3 (API de comandos, consultas, tokens) y 4 (WhatsApp) son el mínimo para integrar; 5 (Socket.IO) y 6 (pendientes de revisión) pueden quedar después sin bloquear la integración, porque la web ya tolera la ausencia de tiempo real.
- Riesgo: el Flujo A real de punta a punta solo funciona cuando `contratos-flujo-a` esté en `main` y el frente B adopte sus campos. Hasta entonces se prueba con datos sembrados (Ana) y con las pruebas de integración.
- Riesgo de seguridad conocido: las consultas y las salas de Socket.IO no tienen autenticación hasta el cambio de seguridad, como ya registra `AGENTS.md` §7; los actores internos sin sesión solo se aceptan en modo demo.
- Responsable: frente A (`J3sus-esb` y Christian Avila, co-responsables). La implementación solo procede con la autorización de uno de ellos registrada en `handoff.md`.
