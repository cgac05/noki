# Proposal

## Why

El repositorio solo contiene documentos de planificación: no hay monorepo, scripts, tipos compartidos, datos ni infraestructura. Dos personas van a trabajar en paralelo (núcleo/backend y canales/frontend) y ambas dependen del mismo vocabulario (estados, eventos, comandos, mensajes del bot, errores) y de las mismas fronteras hexagonales. Sin una base común en `main`, cada rama inventaría su propia versión de esos contratos y el merge rompería el Flujo A. Corresponde a la fase "Contratos" (horas 0–2) de `PLAN.md` §11.

## What Changes

- Monorepo pnpm (TypeScript `strict`, ESM) con la estructura de `PLAN.md` §4 / `AGENTS.md` §4 más el paquete nuevo `packages/contracts`: `packages/domain`, `packages/application`, `packages/contracts`, `packages/adapters/*` (incluido `memory`), `apps/api`, `apps/sd-mock`, `apps/web`, `infra/`, `docs/`. `AGENTS.md` §4–§5 y `PLAN.md` §4 se actualizan para reflejar `packages/contracts`.
- Entorno fijado: `packageManager` con la versión de pnpm, `engines.node >=20`, `.nvmrc`, `.env.example` y `.gitignore` con `.env`.
- Scripts raíz: `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:integracion`, `pnpm db:migrate`, `pnpm seed`, `pnpm demo:reset`, `pnpm dev`.
- dependency-cruiser con las reglas 1–3 de `AGENTS.md` §5, más: `domain` y `application` no importan `contracts`, y `contracts` solo depende de `zod`.
- Lint que prohíbe en todo el repo `any` explícito (incluido `as any`), `@ts-ignore` y `@ts-nocheck` (solo se admite `@ts-expect-error` con descripción), y en `domain` y `application`: `Date.now()`, `new Date()` sin argumentos, `Math.random()`, `crypto.randomUUID()` y `performance.now()`.
- Contratos sin lógica de negocio ni IA, en dos lugares:
  - `packages/domain` (solo tipos y constantes TS, sin dependencias): tipos de trámite (`AGENDAR`, `ADELANTO`, `FACTURA`), estados de llenado de casillas de `PLAN.md` §6, casillas, canales, actores, niveles de autenticación, `PerfilServicio` (§5), envoltura común de eventos, unión discriminada de los eventos de Agendar e Identidad y canal (§7) y errores de dominio tipados.
  - `packages/contracts` (**nuevo**, solo depende de `zod`): esquemas Zod de la API, con tipos obtenidos por `z.infer`: `ComandoRequest` de `POST /api/comandos`, `RespuestaComando`, `SiguientePregunta` con pista de interfaz (tipo de entrada, opciones, campos `sensitive`/`passcode`), mensaje del bot (texto, botones ≤3, lista ≤10, modal tipo Flow), contrato de `POST /api/canales/wa/mensajes`, eventos y salas de Socket.IO y cuerpo de error. Validan en tiempo de ejecución, no solo al compilar.
  - El mapeo de errores de dominio a HTTP de `AGENTS.md` §6 vive en `in-http`, junto con una prueba que asegura que los enumerados de `contracts` coinciden con los del dominio.
- `apps/api` expone `GET /health` (proceso vivo) y `GET /ready` (consulta Postgres con `SELECT 1` y Redis con `PING`).
- Puertos `Reloj` y `GeneradorId` con adaptadores en memoria y una implementación real de UUID v7 fuera del dominio.
- Migración `001_nucleo`: identidad (paciente, contacto, vínculo, credencial, usuario interno), hilo, trámite, evento, catálogo de servicios, sedes, oferta por sede, recurso, reserva con índice único parcial, localidad, `outbox`, `evento_procesado`, `token_usado`, extensión `pg_trgm` e índice de trigramas sobre nombre y sinónimos del servicio.
- Semilla mínima: 3 sedes en zonas horarias distintas (incluye Tepic y Bahía de Banderas), los 4 servicios de §5 con perfil y sinónimos, la localidad Xalisco y las credenciales de `AGENTS.md` §10.
- `infra/docker-compose.yml` con Postgres y Redis; `apps/sd-mock` con `GET /health`; `apps/web` con Vite + React que muestra una página índice.
- `docs/eventos.md` y `README.md` con los comandos de arranque y las credenciales de demo.

Fuera de alcance (cambios posteriores): tablas de huecos, intereses de adelanto, recordatorios, preferencias de contacto, facturación y `perfil_fiscal` (cada una llega en su propia migración); lógica de la máquina de estados y `siguientePregunta`; resolvedor de continuidad; demás puertos y adaptadores; relay del outbox, Redis Streams, BullMQ; emisión de tokens, OTP y verificación de PIN; endpoints de negocio; rutas de los canales en `apps/web`; historial de eventos e intereses de adelanto en la semilla; cualquier componente de IA; despliegue.

## Capabilities

### New Capabilities
- `arquitectura-hexagonal`: fronteras entre capas verificables automáticamente y prohibición de fuentes no deterministas (tiempo, aleatoriedad) en dominio y aplicación.
- `entorno-desarrollo`: comandos del workspace, versión de herramientas, infraestructura local, migraciones, datos semilla, salud y disponibilidad de las apps y configuración por variables de entorno reproducibles por cualquier integrante.
- `contratos-canales`: esquemas compartidos, validables en ejecución, de los comandos, respuestas, siguiente pregunta, mensajes del bot, simulador de WhatsApp, eventos de tiempo real y errores que consumen todos los canales; y vocabulario de dominio (estados, casillas, tipos de trámite, eventos) coherente con ellos.

### Modified Capabilities
_Ninguna; no existen especificaciones previas._

## Impact

- Archivos nuevos en la raíz (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`, configuración de ESLint, Vitest y dependency-cruiser, `.gitignore`, `.env.example`, `README.md`) y en `packages/`, `apps/`, `infra/`, `docs/`.
- Dependencias nuevas: typescript, tsx, vitest, eslint (+ typescript-eslint), dependency-cruiser, zod (solo `contracts` y quien lo consume), fastify, kysely, pg, ioredis, argon2 (solo en la semilla), react, vite, tailwind y un generador de UUID v7. Ninguna en `packages/domain`.
- Requisitos de la máquina: pnpm vía `corepack enable` y Docker con Compose. En esta máquina `pnpm` no está en el PATH al momento de planificar.
- `pnpm demo:reset` borra la base: queda restringido a `DEMO_MODE=true`.
- Riesgo: la migración `001_nucleo` fija nombres que ambas ramas usarán; cambios posteriores van en migraciones nuevas.
- Riesgo: `contracts` repite los enumerados del dominio porque no puede importarlo; una prueba de tipos en `in-http` detecta cualquier divergencia.
- Decisión arquitectónica nueva respecto de `PLAN.md` §4 y `AGENTS.md` §4–§5 (paquete `contracts`): requiere autorización explícita del usuario.
- Habilita el trabajo paralelo: rama de núcleo (dominio, horas 2–6) y rama de canales (esqueleto del frontend, horas 2–10).
