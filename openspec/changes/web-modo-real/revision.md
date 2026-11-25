# Revisión: web-modo-real (revisión 2)

**Dictamen: PASS con riesgos residuales.** Base `main` `0b59599`, árbol local de `noki` el 2026-11-25.

## Comprobaciones de Claude

| Control | Resultado |
|---|---|
| Diff contra D1–D5 y alcance del handoff | Conforme. Núcleo limitado a la guarda de `solicitarContinuacion` y a `datosContinuacion`. |
| `vitest` unitarios y web (`--testTimeout=30000`) | Verde, 495 pruebas. Con 5 s hubo cortes por carga de la máquina, no por fallos. |
| `pnpm -r exec tsc --noEmit`, `tsc -p tests`, `eslint .`, `lint:deps` | Código 0. |
| `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` | Código 0. |
| `test:integracion` (Postgres 55432) | `puertosApiPostgres` verde, incluida la prueba nueva de origen `TOKEN_WEB`/`TOKEN_CC`. Fallan 5 pruebas de migraciones (`gin_trgm_ops`, `kysely_migration_lock`) por el entorno; no tocan este cambio. |
| Recorrido en navegador | BLOQUEADO: la demo corre desde `noki-identidad` en `main` y no se levantó una segunda API (puertos fijos y Redis compartido). |

## Hallazgos

- Sin hallazgos bloqueantes.
- Riesgo residual: recorrido real `/web` → `/wa?continuar=` pendiente hasta que la demo tome `main`.
- Riesgo de gobierno: frente único por decisión de Christian, sin firma de `LuisMaster119`.
