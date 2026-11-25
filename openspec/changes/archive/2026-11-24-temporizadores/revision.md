# Revisión: temporizadores

## Segunda vuelta (2026-11-25)

- Dictamen: PASS
- Revisión inspeccionada: la misma revisión 4 del código de la primera vuelta, más la línea de `permitir-builds-bullmq` en `pnpm-workspace.yaml`. El resto del diff no cambió.
- Evidencia comprobada independientemente: `corepack pnpm install --frozen-lockfile` sin variables `pnpm_config_*`, salida 0; `lint`, `lint:deps`, `test` (280) y `test:integracion` (45) en verde. `main` avanzó a `c9d18dd`; esos commits solo tocan `apps/web` y `openspec/`, así que el rebase no choca con los archivos de este cambio.
- H-01: RESUELTO por `permitir-builds-bullmq` (PASS en su `revision.md`). H-02 a H-04: siguen como SUGGESTION opcionales.
- Condiciones para recomendar el cierre: integrar primero `permitir-builds-bullmq`, después este cambio sobre ese `main`, repetir los cuatro controles tras el rebase y archivar ambos en `main`. Riesgos residuales: cita externa huérfana si la compensación es imposible (aceptado en la revisión 4) y desfase del reloj de demo en memoria (D6).
- Próximo responsable: Christian (frente A): autorizar el cierre.

## Primera vuelta (2026-11-25)

- Dictamen: BLOCKED
- Revisión inspeccionada: revisión 4 autorizada (`handoff.md`), árbol de trabajo sin commit de `feat/temporizadores` sobre `d7f7590` el 2026-11-25, 29 archivos modificados y 13 nuevos según `git status`; `implementacion.md` de Codex con 15 de 15 tareas.
- Cobertura: los requisitos de `temporizadores-tramite` y `reloj-demo`; design D1–D8 y Risks; tareas 1.1–3.6; `TemporizadoresTramite`, `RelojDemo`, `ProgramadorTemporizadores`, `ProgramadorBullMQ`, `WorkerTemporizadores`, `rutaRelojDemo`, `RelojAjustable`, la composición de `apps/api/src/main.ts` y `componerComandos.ts`, y las pruebas nuevas o modificadas.
- Evidencia comprobada independientemente (Claude, misma máquina, mismo árbol):
  - `corepack pnpm lint`: PASS. `corepack pnpm lint:deps`: PASS, 202 módulos sin violaciones.
  - `corepack pnpm test`: PASS, 280 pruebas en 51 archivos.
  - `corepack pnpm test:integracion` con `DATABASE_URL` en `127.0.0.1:55432` y Redis local: PASS, 45 pruebas en 15 archivos.
  - `corepack pnpm install --offline --frozen-lockfile`: FAIL, `ERR_PNPM_IGNORED_BUILDS` por `msgpackr-extract@3.0.7` (salida 1). pnpm escribió una entrada provisional en `pnpm-workspace.yaml`; Claude la revirtió y el archivo quedó igual a `main`.
  - Lectura del diff: el estado decide cada trabajo (tabla D3), `ejecutar` vuelve a comprobar estado, `reservaId`, versión y `Reloj` (D4), el contexto es `sistema`/nivel 0/último canal, `jobId` `${tipo}-${tramiteId}` (revisión 2), `REPROGRAMAR` con `moveToDelayed` + `DelayedError`, 3 intentos con espera exponencial y registro `TEMPORIZADOR_FALLIDO` con tipo y `tramiteId`.
- Evidencia de Codex (no repetida): la prueba manual 3.4 (Admin actualiza y muestra `ReservaExpirada`; `/wa` vuelve a ofrecer horarios al siguiente mensaje).
- Controles no ejecutados: prueba manual 3.4 por Claude (se acepta la evidencia de Codex; no afecta el dictamen). `openspec validate` de la revisión 4 pasó antes de entregarla.

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | WARNING | `entorno-desarrollo` "Instalación con corepack"; `docs/trabajo-paralelo.md` (rebase y `pnpm install` antes de integrar); tarea 2.1 | `pnpm install --frozen-lockfile` sale con 1: `ERR_PNPM_IGNORED_BUILDS` por `msgpackr-extract`, dependencia nativa opcional de BullMQ. Codex lo sorteó con `pnpm_config_strict_dep_builds=false` (`implementacion.md`, Validaciones). Un checkout limpio, el frente B tras el rebase y la integración a `main` fallan igual. | Declarar `msgpackr-extract: false` en `allowBuilds` de `pnpm-workspace.yaml` (msgpackr usa su implementación en JS; no hace falta compilar). Es configuración raíz compartida: necesita un cambio pequeño con el visto bueno de ambos frentes, integrado en `main` antes o junto con este cambio. Después repetir `pnpm install --frozen-lockfile` sin variables y los cuatro controles. ABIERTO. |
| H-02 | SUGGESTION | "Trámite terminado"; "Cotización abandonada" | Las pruebas cubren `PacienteLlego` (INASISTENCIA sin efecto) y `EXPIRADO` (sin trabajos), pero ninguna `CitaCancelada`, ni que el trámite expirado deje de aparecer en `tramitesAbiertos`. La lógica es la misma tabla, así que el riesgo es bajo. | Agregar una prueba con `cancelar` que deje el trámite sin trabajos y una lectura de abiertos tras la expiración. Opcional. |
| H-03 | SUGGESTION | AGENTS.md §5.5 | `TemporizadoresTramite.trabajo` calcula los plazos con `structuredClone(reloj.ahora())` y `setTime` para no escribir `new Date(ms)` en `application`. Cumple la letra de la regla, pero oscurece una suma de milisegundos. | Un ayudante puro (por ejemplo `sumarMs(iso, ms)` con aritmética de `Date.parse` y un formateo explícito) o una excepción documentada para construir fechas a partir de un instante dado. Opcional. |
| H-04 | SUGGESTION | `reloj-demo` "Cuerpo inválido" | `rutaRelojDemo` responde 400 con `{ codigo: 'CUERPO_INVALIDO' }`, distinto de `CuerpoErrorSchema` que usan las demás rutas. Cumple el escenario (400 sin cambiar el reloj). | Usar el mismo formato de error que `rutasComandos` cuando el endpoint pase a `@noki/contracts` en el cambio compartido del botón de `/admin`. |

- Condiciones para recomendar el cierre: resolver H-01 con el cambio compartido de `pnpm-workspace.yaml` (vistos buenos de A y B), hacer rebase de `feat/temporizadores` sobre `main` actual (`c9d18dd` o posterior), y repetir `pnpm install --frozen-lockfile`, `lint`, `lint:deps`, `test` y `test:integracion` en verde. Riesgos residuales aceptados: cita externa huérfana si la compensación es imposible (revisión 4) y desfase del reloj de demo en memoria (D6). H-02 a H-04 no bloquean.
- Próximo responsable: Christian (frente A) y Luis (frente B): decidir el cambio compartido de H-01. Luego Claude prepara ese cambio y vuelve a verificar.
