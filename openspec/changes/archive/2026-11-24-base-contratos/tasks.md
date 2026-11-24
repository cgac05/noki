# Tasks

Cada grupo es un punto de control: al terminarlo, sus verificaciones deben estar en verde y registradas en `implementacion.md` antes de empezar el siguiente. Si se bloquea un grupo, los anteriores quedan útiles por sí solos.

## 1. Punto de control 1: workspace, lint y lint:deps en verde

- [x] 1.1 Ejecutar `corepack enable`; crear `package.json` raíz (privado, `type: module`, `packageManager` con versión exacta, `engines.node >=20`), `.nvmrc`, `pnpm-workspace.yaml` (`packages/*`, `packages/adapters/*`, `apps/*`) y `tsconfig.base.json` según design D1–D2; verificar que `pnpm install` termina sin errores y el escenario "Versiones declaradas".
- [x] 1.2 Crear los paquetes de design D1 (`domain`, `application`, `contracts`, los siete adaptadores incluido `memory`, `api`, `sd-mock`, `web`) con `package.json`, `tsconfig.json` y `src/index.ts`; verificar que `packages/domain/package.json` no tiene `dependencies`, que `packages/contracts` solo depende de `zod` y que `pnpm -r exec tsc --noEmit` pasa.
- [x] 1.3 Configurar ESLint según design D3 y `pnpm lint` (ESLint + `tsc --noEmit`); verificar que pasa en verde y que falla al introducir temporalmente `as any`, `// @ts-ignore`, `// @ts-nocheck` y `// @ts-expect-error` sin descripción en cualquier paquete, y `new Date()`, `Date.now()`, `Math.random()`, `crypto.randomUUID()` y `performance.now()` en `packages/domain`; y que **no** falla con `new Date('2026-01-01T00:00:00Z')` ni con `@ts-expect-error` descrito. Registrar salidas y revertir. Ref: arquitectura-hexagonal "Sin escapes del sistema de tipos", "Sin fuentes no deterministas".
- [x] 1.4 Configurar dependency-cruiser con las reglas (a)–(f) y `no-circular` de design D3 y `pnpm lint:deps`; verificar que pasa en verde y que falla con importaciones temporales de `fastify` en el dominio, de un adaptador en aplicación, de `@noki/contracts` en dominio y en aplicación, de un adaptador desde otro, de `@noki/domain` desde `apps/web` y de algo distinto de `zod` en `contracts`. Registrar salidas y revertir. Ref: arquitectura-hexagonal.
- [x] 1.5 Configurar Vitest (`pnpm test` sin infraestructura; `pnpm test:integracion` aparte) según design D9; verificar que `pnpm test` corre con Docker detenido.
- [x] 1.6 Crear `.gitignore` (incluye `.env`, `node_modules`, salidas de Vite) y `.env.example` con las variables de `AGENTS.md` §11; verificar con `git status` que un `.env` de prueba no aparece.
- [x] 1.7 Punto de control: `pnpm install && pnpm lint && pnpm lint:deps && pnpm test` en verde desde un checkout limpio; registrar en `implementacion.md`.

## 2. Punto de control 2: tipos de dominio y contratos compilando

- [x] 2.1 Definir en `packages/domain` los tipos y constantes de design D4–D5; verificar con pruebas los escenarios "Lista exacta de estados", "Estados obsoletos ausentes", "Casillas definidas" y "Trámite sin tipo" (parte de tipos).
- [x] 2.2 Definir `EnvolturaEvento` y la unión de eventos de Agendar e Identidad y canal; verificar con pruebas de tipos "Payload ligado al tipo", "Exhaustividad" y "Sin datos sensibles en payloads".
- [x] 2.3 Definir los errores de dominio tipados; verificar con pruebas que cada error conserva código y datos y es instancia de `Error`.
- [x] 2.4 Definir los puertos `Reloj` y `GeneradorId`, implementar `RelojFalso` y `GeneradorIdSecuencial` en `@noki/adapter-memory` y `RelojSistema` y `GeneradorIdUuidV7` en `apps/api/src/sistema/`; verificar con pruebas "Reloj falso controlable", "Secuencia reproducible en pruebas" y "UUID v7 válido".
- [x] 2.5 Definir en `packages/contracts` `vocabulario.ts`, `comandos.ts` y `siguientePregunta.ts`; verificar con pruebas "JSON mal formado rechazado", "Tipos derivados del esquema", "Payload ligado al comando", "Comando válido", "Pregunta de captura sensible" y "Trámite completo".
- [x] 2.6 Definir `mensajesBot.ts`, `whatsapp.ts`, `tiempoReal.ts` y `errores.ts`; verificar con pruebas "Cuarto botón rechazado", "Lista de once filas rechazada", "PIN sin valor inicial", "Entrada vacía rechazada", "Respuesta con mensajes del bot", "Sala mal formada", "Evento desconocido" y "Sin detalles internos".
- [x] 2.7 En `@noki/adapter-in-http`, definir `MAPEO_ERRORES_HTTP` y la prueba de coherencia dominio ↔ contratos; verificar "Mapeo completo", "Códigos esperados" y "Divergencia detectada" (agregar temporalmente un estado solo en el dominio, registrar el fallo y revertir).
- [x] 2.8 Documentar en `docs/eventos.md` (envoltura, eventos tipados, familias reservadas) y en `docs/contratos.md` (un apartado por módulo de `contracts` y el mapeo de errores); actualizar `PLAN.md` §4 y `AGENTS.md` §4–§5 para incluir `packages/contracts` y sus reglas de dependencia, sin cambiar otras reglas; verificar que cada evento de la unión y cada módulo de `contracts` aparecen documentados.
- [x] 2.9 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 3. Punto de control 3: Docker, migración y restricción de reservas

- [x] 3.1 Crear `infra/docker-compose.yml` con Postgres y Redis, healthchecks y valores alineados con `.env.example` (design D10); verificar con `docker compose -f infra/docker-compose.yml up -d postgres redis` y `docker compose -f infra/docker-compose.yml ps` que ambos quedan `healthy`.
- [x] 3.2 Escribir `infra/migraciones/001_nucleo.sql` según design D7 e implementar el ejecutor y `pnpm db:migrate`; verificar con `pnpm test:integracion` "Migración sobre base vacía" (incluida la ausencia de tablas excluidas y `tipo` obligatorio en `tramite`) y "Migración repetida".
- [x] 3.3 Verificar con `pnpm test:integracion` "Doble reserva rechazada por la base", "Reserva liberada no bloquea", "Idempotencia de eventos", "Consumidor idempotente", "Token de un solo uso" e "Índices presentes".
- [x] 3.4 Verificar "Sin infraestructura": con Docker detenido `pnpm test:integracion` termina con error explicativo; registrar la salida.
- [x] 3.5 Punto de control: `pnpm db:migrate` dos veces y `pnpm test:integracion` en verde; registrar en `implementacion.md`. Si Docker no está disponible, registrar el grupo como BLOQUEADO con el error real.

## 4. Punto de control 4: apps con /health y /ready y semilla

- [x] 4.1 Crear `apps/sd-mock` y `apps/api` con Fastify y `GET /health`; agregar las funciones de comprobación en `out-postgres` y `out-redis` y `GET /ready` en `api` (design D10); verificar con `pnpm test:integracion` "Proceso vivo", "Todo conectado", "Redis caído" y "Postgres caído".
- [x] 4.2 Crear `apps/web` con Vite + React + Tailwind y una página índice que importe al menos una constante de `@noki/contracts`; verificar que `pnpm --filter @noki/web build` termina sin errores y que `pnpm lint:deps` sigue en verde.
- [x] 4.3 Agregar `pnpm dev`; verificar manualmente `/health` en 4000 y 4001, `/ready` en 4000 y la página en 5173 sin errores de consola. Ref: "Frontend accesible".
- [x] 4.4 Implementar la semilla y `pnpm seed` según design D8; verificar con `pnpm test:integracion` "Semilla completa", "Semilla repetida", "Secretos de demo con hash" y "Sinónimo con errores encuentra el servicio", y revisar manualmente "Datos ficticios".
- [x] 4.5 Implementar `pnpm demo:reset` con la guardia de `DEMO_MODE`; verificar "Reinicio en modo demo" y "Reinicio bloqueado fuera de demo".
- [x] 4.6 Escribir `README.md` con requisitos (Node según `.nvmrc`, corepack, Docker), arranque, tabla de comandos, uso de `/ready` antes de presentar, credenciales de demo de `AGENTS.md` §10 marcadas como solo demo y nota sobre argon2id; verificar siguiendo los pasos tal como están escritos.
- [x] 4.7 Punto de control final: desde un checkout limpio, `pnpm install && pnpm lint && pnpm lint:deps && pnpm test` y, con Docker y `DEMO_MODE=true`, `pnpm demo:reset && pnpm test:integracion`; registrar comandos y resultados reales en `implementacion.md`.
