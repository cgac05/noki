# Revisión: base-contratos

- Dictamen: PASS
- Revisión inspeccionada: base Git `e7e1c61` + árbol de trabajo sin commit al 2026-11-24 (cambios en `AGENTS.md`, `PLAN.md` y 126 archivos nuevos no seguidos, según `implementacion.md` y `evidencias/entrega.sha256`). Artefactos de planificación con los hashes autorizados en `handoff.md` (revisión 3); `tasks.md` solo cambió en casillas.
- Cobertura: 28/28 tareas; 30 requisitos de los tres specs (arquitectura-hexagonal 7, contratos-canales 11, entorno-desarrollo 12); design D1–D10; diff de `AGENTS.md` y `PLAN.md`; `001_nucleo.sql`, configuración de ESLint y dependency-cruiser, manifiestos, `crearApi.ts`, comprobaciones de Postgres y Redis, semilla y reinicio, pruebas unitarias e integración, README.
- Evidencia comprobada independientemente (Claude, con `pnpm` 11.25.0 de `.tools/corepack`):
  - `pnpm lint` → 0; `pnpm lint:deps` → 0 (61 módulos, 78 dependencias, sin violaciones); `pnpm test` → 0 (5 archivos, 19 pruebas, 838 ms, incluye `tsc` de pruebas de tipos).
  - `pnpm test:integracion` → 0 (3 archivos, 17 pruebas, 0 omitidas) contra Postgres 16 y Redis 7 saludables en Docker: migración y tablas excluidas, `tipo` obligatorio, reserva duplicada, 50 reservas concurrentes con un único éxito, idempotencia de eventos y consumidores, `jti`, índices, semilla idempotente con argon2id, búsqueda difusa, reinicio protegido, `/health` y `/ready` con caídas de Redis y Postgres.
  - `pnpm db:migrate` sobre la base de desarrollo → "ninguna migración pendiente", código 0.
  - `pnpm --filter @noki/web build` → 0.
  - Lint negativo sin escribir archivos (`eslint --stdin` con ruta virtual en `packages/domain`): rechaza `new Date()`, `Date.now()`, `Math.random()`, `crypto.randomUUID()`, `performance.now()`, `as any`, `@ts-ignore`, `@ts-nocheck` y `@ts-expect-error` sin descripción; admite `new Date("…")` y `@ts-expect-error` descrito.
  - Inspección: `packages/domain` sin `dependencies`; `contracts` solo `zod`; `apps/web` solo `@noki/contracts`; reglas (a)–(f) presentes en `.dependency-cruiser.cjs`; estados, casillas y tipos de trámite iguales a `PLAN.md` §6 (`tests/unit/dominio.test.ts`); prueba de coherencia dominio ↔ contratos y mapeo HTTP en `packages/adapters/in-http/test/coherencia.test.ts`; `.env` y `.tools/` ignorados; `/ready` no expone URL; `demo:reset` sale antes de conectar sin `DEMO_MODE=true` e imprime el host antes de borrar; logger de Fastify con `redact` de campos sensibles.
- Evidencia de Codex aceptada tras inspección (no repetida por Claude):
  - Negativas de `lint:deps` (escritura de archivos temporales en el producto): `evidencias/punto-1-negativas.log` muestra los rechazos de `dominio-aislado`, `aplicacion-solo-dominio`, contratos en dominio, etc.; la configuración inspeccionada coincide.
  - "Sin infraestructura" (exige detener Docker): `evidencias/punto-3-sin-infraestructura.log`; el código de `tests/integracion/ejecutar.ts` sale con código 1 y mensaje explicativo si falla la conexión.
  - Comprobación manual de `pnpm dev` (4.3): `evidencias/punto-4-http.json` y `punto-4-manual.json`.
  - Divergencia temporal dominio ↔ contratos: `evidencias/punto-2-divergencia.log`.
- Controles no ejecutados: ninguno aplicable pendiente. `/opsx:verify` no ejecuta pruebas de carga (NO APLICA a este cambio).

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | SUGGESTION | arquitectura-hexagonal; tarea 2.8 | `AGENTS.md:134` dice que `pnpm lint:deps` falla si se rompen "las reglas 1–3", pero también hace cumplir las nuevas 11–12 | Cambiar a "las reglas 1–3, 11 y 12". Abierto, opcional |
| H-02 | SUGGESTION | `AGENTS.md` §8 (privacidad); entrega | 9 de los logs de `evidencias/` contienen rutas absolutas locales con el nombre del usuario y la ruta del store de pnpm | Reemplazar el prefijo de ruta por `<repo>`/`<home>` antes del commit o del archivado si el repositorio será público. Abierto, opcional |
| H-03 | SUGGESTION | `infra/migraciones/001_nucleo.sql` (`token_usado.jti uuid`) | El `jti` queda restringido a UUID | Al diseñar el cambio de seguridad, generar el `jti` con `GeneradorId` (UUID v7) o agregar una migración nueva; `001_nucleo` no se edita. Nota para el siguiente cambio |

- Condiciones para recomendar el cierre: cumplidas. Ningún hallazgo CRITICAL ni WARNING; las tres sugerencias no afectan la aceptación. Riesgos residuales: la entrega no tiene commit; `001_nucleo` queda congelada una vez integrada en `main`; los enumerados repetidos en `contracts` dependen de que la prueba de coherencia siga en `pnpm test`.
- Próximo responsable: usuario. Decidir si se aplican H-01/H-02 (Codex) antes del commit; crear el commit de la base en `main`; y, si acepta el resultado, autorizar explícitamente sincronizar specs y archivar `base-contratos` (Claude).
