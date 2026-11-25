# Revisión: web-sesion

## Vuelta 1 — 2026-11-25 (Claude)

**Dictamen: PASS** (con observaciones; falta la prueba manual en el navegador, que se hará en la demo después de integrar).

Base: `main` `f5260a8` + cambios sin commit de `web-sesion` (y de `wa-numero-continuacion`, en archivos distintos salvo `CallCenter.tsx`/`consolas.test.tsx`, cuyas líneas se revisaron por separado).

### Controles ejecutados por el revisor (Codex los tenía BLOQUEADOS por `EPERM`)

| Control | Resultado |
|---|---|
| `vitest run --project unitarios --maxWorkers=2` | 53 archivos, 293/293 |
| `vitest run --project web --maxWorkers=2` | 28 archivos, 233/233 (con workers por defecto hubo 8 timeouts por carga de la máquina; en serie pasan) |
| `pnpm -r exec tsc --noEmit` | sin errores |
| `tsc --project tests/tsconfig.json` | 1 error en `tests/unit/nucleo/casosTramite.test.ts:655` (H-01, ya presente en `main`) |
| `eslint .` | sin errores |
| `depcruise` | sin violaciones (255 módulos) |
| Integración Postgres (`tests/integracion/ejecutar.ts`) | 57/58; falla `rellenoHuecos` oleada (H-02, igual en `main` limpio) |

### Hallazgos

- **H-01 (externo, media):** `tests/unit/nucleo/casosTramite.test.ts:655` pasa `sexo` y `entidadNacimiento` a `buscarPorDatos`, que no los admite en `DatosDeclarados`; `pnpm test` falla en `tsc`. Viene de `curp-demo-flexible` (ya en `main`). Corrección: se encarga a Codex dentro de `retoma-por-telefono` (toca pruebas del núcleo).
- **H-02 (externo, media):** `tests/integracion/rellenoHuecos.test.ts` «modo oleada» falla también en `main` `f5260a8` limpio (esperaba el paciente `…014` y recibe `…017`). Probable interferencia con los datos o el Redis de la demo que está corriendo; se remite aparte.
- **H-03 (observación):** la contraseña `prueba123` solo se valida en la vista y `AsignarPaciente` desde web se traduce a actor `sistema` solo en demo. Es lo pedido por Christian para la expo; fuera de demo no hay sesión web.
