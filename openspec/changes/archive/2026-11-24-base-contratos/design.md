# Design

## Context

Repositorio vacío de código (ver proposal.md - Why). Restricciones vigentes: stack de `PLAN.md` §3, estructura y reglas de `PLAN.md` §4 y `AGENTS.md` §4–§6, contratos de `AGENTS.md` §7, seguridad de §8, semilla de §10, modelo de datos de `PLAN.md` §5, estados de §6 y eventos de §7. La máquina de planificación tiene Node 24, Docker 29 con Compose v5 y corepack, pero `pnpm` no está en el PATH. Este cambio es la base de dos ramas paralelas (núcleo y canales), así que prioriza contratos estables y arranque rápido sobre funcionalidad.

## Goals / Non-Goals

**Goals:**
- Que ambas ramas compartan exactamente los mismos tipos de estado, evento, comando, pregunta, mensaje, tiempo real y error desde el primer minuto.
- Que las fronteras hexagonales y el determinismo se verifiquen con un comando.
- Que `pnpm install && pnpm lint && pnpm lint:deps && pnpm test` funcione sin infraestructura, y que con Docker `pnpm demo:reset` deje una base lista para la demo.

**Non-Goals:**
- Ningún comportamiento de negocio: sin transiciones, sin calcular `siguientePregunta`, sin endpoints de comandos ni del simulador, sin servidor Socket.IO, sin relay del outbox.
- Sin rutas que usen los esquemas todavía: `in-http` los aplicará en el cambio de la API de comandos.
- Sin paso de compilación a `dist/` para los paquetes internos; sin contenedores para las apps; sin IA.

## Decisions

### D1. Paquetes internos consumidos como fuente TypeScript
Cada paquete declara `exports` hacia `src/*.ts`; las apps corren con `tsx` (api, sd-mock) y Vite (web); la verificación de tipos es `tsc --noEmit` por paquete desde un `tsconfig.base.json` con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` y `moduleResolution` `NodeNext` (o `Bundler` en web).
- Alternativa: referencias de proyecto con `tsc -b` y `dist/`. Descartada: paso de build extra y errores de caché en un hackatón de 30 h.
- Nombres: `@noki/domain`, `@noki/application`, `@noki/contracts`, `@noki/adapter-<nombre>` (`memory`, `in-http`, `in-events`, `out-postgres`, `out-redis`, `out-sd`, `out-security`), `@noki/api`, `@noki/sd-mock`, `@noki/web`. Los adaptadores sin contenido se crean con `src/index.ts` vacío para fijar la estructura.

### D2. Entorno y versiones
`package.json` raíz con `packageManager: "pnpm@<versión exacta activada por corepack>"` y `engines.node: ">=20"`; `.nvmrc` con `24` (LTS instalada en la máquina de planificación, dentro del rango). `engine-strict` no se activa para no bloquear a quien tenga Node 20 o 22.

### D3. Fronteras con dependency-cruiser y lint estricto
- `.dependency-cruiser.cjs`, reglas `forbidden`: (a) `packages/domain` → cualquier cosa fuera de sí mismo, incluido `node_modules`; (b) `packages/application` → `packages/adapters`, `packages/contracts`, `apps` o `node_modules`; (c) `packages/adapters/X` → `packages/adapters/Y` (Y≠X); (d) `packages/*` → `apps/*`; (e) `packages/contracts` → cualquier cosa salvo `zod`; (f) `apps/web` → `packages/domain`, `packages/application` o `packages/adapters`. Además `no-circular`.
- ESLint flat config con typescript-eslint, en todo el repo: `@typescript-eslint/no-explicit-any` (cubre `as any`) y `@typescript-eslint/ban-ts-comment` con `ts-ignore` y `ts-nocheck` prohibidos y `ts-expect-error: 'allow-with-description'` con descripción mínima. Solo para `packages/domain/**` y `packages/application/**`: `no-restricted-properties` contra `Date.now`, `Math.random`, `crypto.randomUUID`, `globalThis.crypto.randomUUID` y `performance.now`, y `no-restricted-syntax` con `NewExpression[callee.name='Date'][arguments.length=0]`, que permite `new Date(valor)`.
- `pnpm lint` = ESLint + `tsc --noEmit` en todos los paquetes. `pnpm lint:deps` = depcruise sobre `packages` y `apps`.

### D4. Dos ubicaciones de contratos: dominio y `contracts`
Decisión pedida por el usuario; modifica `PLAN.md` §4 y `AGENTS.md` §4–§5, que se actualizan en este cambio.
- **Dominio** (`packages/domain/src/`, TS puro sin Zod): `TipoTramite` (`AGENDAR | ADELANTO | FACTURA`), `EstadoTramite` con los diez estados de §6 (sin `SUSPENDIDO` ni estados de versiones previas), `Casilla` (`servicio | sede | paciente | requisitos | elegibilidad | horario`), `Canal`, `Actor`, `NivelAuth` (0–3), `RelacionVinculo`, `MetodoVinculo`, `PerfilServicio` (§5, tal cual), IDs con *branding*; `EnvolturaEvento<T, P>` con los campos comunes de §7 y la unión `EventoDominio` de **Agendar** e **Identidad y canal**; errores `ReglaViolada`, `StepUpRequerido`, `ConflictoVersion`, `NoEncontrado`, `TransicionInvalida`, con discriminante `codigo`. Las demás familias de §7 se documentan como **reservadas** en `docs/eventos.md`.
- **`packages/contracts`** (solo `zod`; tipos por `z.infer`), un módulo por contrato y un `index.ts`:
  - `vocabulario.ts`: `z.enum` de canales, estados, casillas, tipos de trámite y códigos de error (repetidos del dominio; ver coherencia abajo).
  - `comandos.ts`: `ComandoRequest` como `z.discriminatedUnion('tipo', …)` (`IniciarTramite`, `SeleccionarServicio`, `SeleccionarSede`, `AsignarPaciente`, `ReservarHorario`, `ConfirmarCita`, `CancelarCita`, `RegistrarLlegada`), cada uno con su `payload`; `RespuestaComando { tramite: TramiteVista, siguientePregunta, eventos: EventoVista[] }`. `TramiteVista` incluye `tipo` y excluye datos sensibles.
  - `siguientePregunta.ts`: unión `{ tipo: 'COMPLETO' } | { tipo: 'PREGUNTA', casilla, pista }`, `pista: { entrada: 'TEXTO' | 'BOTONES' | 'LISTA' | 'FLOW' | 'NINGUNA', opciones?, campos? }`, campo con `captura: 'texto' | 'fecha' | 'sensitive' | 'passcode'`.
  - `mensajesBot.ts`: `MensajeBot` de `texto`, `botones` (`.min(1).max(3)`), `lista` (secciones; `superRefine` limita a 10 filas en total), `flow` (campos discriminados por `captura`; la variante `passcode` no admite `valorInicial`).
  - `whatsapp.ts`: `SolicitudMensajeWa` (`waId` + `refine` que exige `texto`, `payloadBoton` o `flowResponse`), `RespuestaMensajeWa { mensajes: MensajeBot[] }`.
  - `tiempoReal.ts`: `EVENTOS_SOCKET` (constantes, p. ej. `tramite:actualizado`, `hilo:linea-tiempo`, `admin:metricas`, `sede:fila`, `bandeja:mensaje`), esquema del dato por evento y `SalaSchema` (regex de los cinco prefijos) con tipo *template literal*.
  - `errores.ts`: `CuerpoError { error: { codigo, mensaje, datos? } }` como objeto que descarta campos desconocidos como `stack`.
- **`in-http`** (único paquete que conoce dominio y contratos): `MAPEO_ERRORES_HTTP` con `satisfies Record<CodigoErrorDominio | 'VALIDACION', number>` según `AGENTS.md` §6, y la prueba de coherencia (`expectTypeOf<z.infer<…>>().toEqualTypeOf<…>()` más comparación de listas en ejecución) para canales, estados, casillas, tipos de trámite y códigos de error.
- `apps/web` importa solo `@noki/contracts` (regla D3-f).
- Alternativas: tipos puros en `application` (descartada: no valida en ejecución y obliga a la web a depender de una capa interna); contratos en el dominio (descartada: un contrato HTTP es asunto de los adaptadores).

### D5. Convenciones de datos en los contratos
Fechas como cadenas ISO 8601 en UTC (`z.string().datetime()` en contratos); dinero en centavos enteros; payloads y vistas con IDs, nunca datos personales (`AGENTS.md` §8).

### D6. Reloj e identificadores
Puertos `Reloj { ahora(): Date }` y `GeneradorId { nuevo(): string }` en `packages/application/src/ports/`. En `@noki/adapter-memory`: `RelojFalso` (fecha fija, `adelantar(ms)`, `fijar(fecha)`) y `GeneradorIdSecuencial`. Reales `RelojSistema` y `GeneradorIdUuidV7` en `apps/api/src/sistema/`, porque la estructura aprobada no tiene adaptador de sistema.

### D7. Migración `001_nucleo`
- SQL plano en `infra/migraciones/001_nucleo.sql`; ejecutor en `@noki/adapter-out-postgres` con el `Migrator` de Kysely y un proveedor que lee los `.sql` de `infra/migraciones` en orden. Cada tabla excluida llegará como `002_…`, `003_…` en su propio cambio.
- Tablas (columnas de §5 en `snake_case`, PK `uuid`, `timestamptz`): `paciente`, `contacto_canal` (`UNIQUE (canal, valor_externo)`), `vinculo` (PK `contacto_id, paciente_id`), `credencial`, `usuario_interno`, `hilo_atencion`, `tramite`, `evento` (`UNIQUE (idempotency_key)`, `tramite_id` nulo permitido), `servicio`, `sede`, `oferta_sede` (`precio_centavos integer`), `recurso`, `reserva` (índice único parcial `(sede_id, recurso_id, inicio) WHERE estado IN ('APARTADA','CONFIRMADA')`), `localidad`, `outbox` (`id`, `evento_id` FK única, `particion`, `creado_en`, `publicado_en` nulo, `intentos`, `ultimo_error`; índice parcial sobre pendientes), `evento_procesado` (PK `consumidor, idempotency_key`, `procesado_en`), `token_usado` (`jti` PK, `usado_en`, `expira_en`).
- `CHECK` para los enumerados de §5 (tipo de trámite, estado de reserva, relación y método de vínculo, rol de usuario interno).
- `usuario_interno(id, usuario UNIQUE, rol CHECK IN ('ASESOR','RECEPCION','ADMIN'), sede_id NULL, hash, creado_en)` no está en §5: es necesario para las credenciales de `AGENTS.md` §10. Se reporta como adición al modelo.
- Trigramas: `CREATE EXTENSION IF NOT EXISTS pg_trgm`; GIN `gin_trgm_ops` sobre `servicio.nombre` y sobre `noki_texto_sinonimos(sinonimos)`, una función SQL `IMMUTABLE` que concatena el `text[]`, porque `array_to_string` no es inmutable y no puede indexarse directamente.
- Alternativa: migraciones TS de Kysely. Descartada: `AGENTS.md` §4 ubica las migraciones SQL en `infra/` y el SQL es más fácil de revisar.

### D8. Semilla y reinicio
- Datos en `apps/api/src/semilla/` (composition root, puede usar Kysely y `argon2` directamente); `pnpm seed` ejecuta un *upsert* con UUID fijos para que enlaces de demo y pruebas sean estables y la segunda ejecución no duplique.
- Sedes: Tepic (`America/Mazatlan`), Bahía de Banderas (`America/Bahia_Banderas`) y Tijuana (`America/Tijuana`), tres desfases distintos. Servicios de §5 con perfil completo y sinónimos; `oferta_sede` y `recurso` compatibles en cada sede (al menos Tepic ofrece los 4). Localidad Xalisco → Tepic.
- Pacientes `ana` y `beto` con datos ficticios, contacto `whatsapp` con los números de §10, vínculo `TITULAR` y credencial PIN `1234`; usuarios internos `asesor1`, `recepcion.tepic` (sede Tepic) y `admin` con `demo123`. Todo con hash argon2id.
- `pnpm demo:reset`: si `DEMO_MODE !== 'true'` sale con error antes de conectarse; si no, `DROP SCHEMA public CASCADE; CREATE SCHEMA public`, migra y siembra.
- Sin intereses de adelanto ni historial de eventos (llegan con sus cambios).

### D9. Pruebas
Vitest por workspace. `pnpm test` = unitarias, pruebas de esquemas y pruebas de tipos (`expectTypeOf` / `@ts-expect-error` con descripción), sin red. `pnpm test:integracion` = migración sobre base limpia, restricciones (al menos la reserva duplicada), trigramas, semilla, reinicio, `/health` de `api` y `sd-mock` y `/ready` de `api` con dependencias arriba y con una caída simulada por URL inalcanzable. Usa una base separada (`noki_test`) que el propio script crea. Sin infraestructura termina con error; nunca `skip` ni aprobado.

### D10. Aplicaciones mínimas, salud y disponibilidad
- `api` 4000 y `sd-mock` 4001, Fastify con `GET /health` → `{ "estado": "ok" }` sin consultar dependencias.
- `api` con `GET /ready`: `SELECT 1` en Postgres y `PING` en Redis en paralelo, límite de 1 s cada uno; 200 `{ estado: 'ok', postgres: 'ok', redis: 'ok' }` o 503 con la dependencia en `'error'`, sin URL ni mensaje del driver. Las funciones de comprobación las exportan `out-postgres` y `out-redis`; `apps/api` las combina (composition root).
- `web` 5173 con Vite + React + Tailwind y página índice. `pnpm dev` corre las tres en paralelo. Postgres 5432 y Redis 6379 con healthcheck.

## Risks / Trade-offs

- [Enumerados repetidos en `contracts` divergen del dominio] → Prueba de coherencia en `in-http`, que falla en `pnpm test` y en `pnpm lint`.
- [Documentación compartida desalineada con el paquete nuevo] → Este cambio actualiza `PLAN.md` §4 y `AGENTS.md` §4–§5 para que no se lea como contradicción.

- [La migración inicial queda corta] → Correcciones en migraciones nuevas; `001_nucleo` no se edita una vez integrada en `main`.
- [Contratos de canales incompletos para el Flujo A] → Ampliarlos se reporta como cambio de contrato (`AGENTS.md` §12 DoD) y se integra en `main` en un cambio pequeño.
- [La semilla usa argon2 directamente y el futuro adaptador de seguridad usa otros parámetros] → El adaptador `out-security` debe verificar hashes argon2id estándar; se documenta en el README.
- [`demo:reset` ejecutado contra una base equivocada] → Guardia `DEMO_MODE=true` y mensaje con el host de `DATABASE_URL` antes de borrar.
- [Versiones de pnpm distintas entre integrantes] → `packageManager` + `corepack enable`.

## Migration Plan

No hay sistema previo. Entregar por puntos de control (`tasks.md` §1–§4), cada uno verificable aunque los siguientes no estén listos. Integrar en `main` antes de abrir las ramas de núcleo y canales; ambas parten de ese commit. Revertir = descartar el commit de la base.
