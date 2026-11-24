# Implementación: contratos-flujo-a

- Revisión entregada: `3476dfe` más el diff local de `feat/contratos-flujo-a` en el worktree `noki-contratos`.
- Tareas completadas: 1.1–2.3, 8 de 8. Los vistos buenos de Christian Avila y LuisMaster119 constan en `handoff.md`.
- El contrato admite el contacto de entrada, `SolicitarContinuacion`, la reserva en la vista de trámite, `INTERNO` y los eventos de salas del cliente. La ficha conserva `null` y el Call Center muestra un guion para cada dato ausente. El contexto de demo contiene únicamente tres identificadores nullables.
- Por autorización de Christian en este chat, se adelantaron solo los datos simulados de `contextoDemo` al grupo 1 para que el control 1.5 incluyera la suite web. El guion simulado devuelve los tres IDs de demo cuando ya hay una cita y devuelve `null` en los tres campos antes de la confirmación. La ficha se ajustó después del control 1.5.

## Archivos modificados

- Contratos: `packages/contracts/src/comandos.ts`, `consultas.ts`, `tiempoReal.ts` y `vocabulario.ts`.
- HTTP: `packages/adapters/in-http/src/mapeoErroresHttp.ts` y `packages/adapters/in-http/test/coherencia.test.ts`.
- Pruebas de contratos: `tests/unit/contratos.test.ts` y `tests/unit/consultas.test.ts`.
- Web, tarea 2.1: `apps/web/src/cliente/mock/guionFlujoA.ts`, `apps/web/src/vistas/CallCenter.tsx` y `apps/web/src/vistas/vistas.test.tsx`. Se añadió una prueba de la ficha con datos nulos. Las pruebas web existentes se conservaron.
- Documentación y seguimiento: `docs/contratos.md`, `AGENTS.md` §7, y `handoff.md`, `tasks.md` e `implementacion.md` en este cambio.

## Validaciones

| Tarea | Comando o comprobación | Resultado real |
|---|---|---|
| 1.1 | `pnpm exec vitest run --project unitarios tests/unit/contratos.test.ts` | PASS. Tres fallos esperados antes del cambio, 10/10 después. |
| 1.2 | `pnpm exec vitest run --project unitarios packages/adapters/in-http/test/coherencia.test.ts` | PASS. Falló antes por la ausencia de `INTERNO`, 2/2 después. |
| 1.3 | `pnpm exec vitest run --project unitarios tests/unit/contratos.test.ts` | PASS. Falló antes por la ausencia de los eventos del cliente, 11/11 después. |
| 1.4 | `pnpm exec vitest run --project unitarios tests/unit/consultas.test.ts` | PASS. Tres fallos esperados antes del cambio, 19/19 después. |
| 1.5 | `pnpm lint && pnpm lint:deps && pnpm test` | PASS. 146 pruebas en 25 archivos. Sin violaciones de dependencias en 140 módulos y 344 dependencias. |
| 2.1 | `pnpm exec vitest run --project web` | PASS. 51 pruebas en 4 archivos. La prueba nueva falló primero al encontrar las celdas vacías y luego verificó los dos guiones. La suite recorre Call Center → WhatsApp → App → Clínica. |
| 2.1 | `pnpm --filter @noki/web build` | PASS. Vite compiló 241 módulos. Emitió avisos sobre directivas `use client` de React Router y TanStack Query. |
| 2.1 | `Invoke-WebRequest -Uri http://127.0.0.1:4179/callcenter` contra Vite local | PASS para HTTP 200 y el elemento raíz de React. La inspección manual en navegador quedó BLOQUEADA por dos tiempos de espera de la herramienta. |
| 2.2 | Contrastar los nombres de la documentación con los esquemas y las siete claves KPI con el spec `consultas-api` | PASS. |
| 2.3 | `pnpm install && pnpm lint && pnpm lint:deps && pnpm test` | PASS. Instalación actualizada, sin violaciones de dependencias y 147 pruebas en 25 archivos. `@noki/contracts` sigue dependiendo solo de Zod. |
| Artefactos | `npx --offline --yes --package @fission-ai/openspec@1.14.0 openspec validate contratos-flujo-a --type change --strict --no-interactive` | PASS. Las instrucciones de aplicación devuelven `all_done`, 8/8. `design.md` figura como prerrequisito de planificación ausente conforme al handoff de la revisión 2. |
| Diff | `git diff --check` | PASS. |

El HTTP 404 de `/api/demo/contexto` fuera de `DEMO_MODE=true` corresponde al grupo 7 de `api-comandos`. Aquí se verificaron la ruta, la marca `soloDemo` y el esquema de respuesta. Pendiente la revisión independiente de Claude.


## Corrección H-01 (2026-11-24)

- La solicitud de este chat («Corrige el hallazgo H-01») cubre la corrección documental de la tarea 2.2. Los vistos buenos para la revisión 2 constan en `handoff.md`.
- En `AGENTS.md` §7 se restauró `tramiteId` y el formato de código Markdown del comando y su payload. Los resultados anteriores corresponden a la implementación revisada en la primera vuelta.

| Comando o comprobación | Resultado |
|---|---|
| `git diff -- AGENTS.md` | PASS. La línea añadida coincide con la corrección de `revision.md` y el diff no agrega tabulaciones. |
| `git diff --check` | PASS. |
| `pnpm lint` | PASS. ESLint y comprobación de tipos completados. |

Pendiente la segunda revisión de Claude.
