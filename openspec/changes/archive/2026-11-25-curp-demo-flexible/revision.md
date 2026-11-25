# Revisión: curp-demo-flexible

## Vuelta 1 — 2026-11-25 — PASS

Revisor: Claude. Revisión 1, checkout `noki`, sin commit. Codex implementó D1–D3, pero no pudo correr Vitest, ESLint ni tsc en su sandbox (`EPERM`). Por eso dejó 1.2 y 1.3 sin marcar. Los controles los corrió el revisor:

| Control (en serie, checkout compartido) | Resultado |
|---|---|
| `vitest tests/unit/nucleo tests/unit/api tests/unit/contratos.test.ts` | 174/175. El único fallo es `sesionWebMemoria.test.ts`, del cambio `web-sesion` de otro trabajo que sigue en curso; no está en este cambio. |
| Integración `identidadPostgres` + `comandosHttp` | 5/5 |
| `tsc --noEmit` de `application` y `contracts` | 0 errores |
| `eslint` de los 4 archivos del cambio | 0 errores |

Contraste: contrato `^[A-Z0-9]{18}$` (D1); `curpFlexible` opcional, que `componerComandos` y `crearApiPruebas` igualan a `demo` (una línea en cada uno); con `curpFlexible`, una CURP inválida o con fecha distinta → `marcarSinCurp()` sin error ni intento (D2); nombres que no concuerdan → registro sin CURP (D3). Fuera de demo se conservan `CURP_INVALIDA` y `CURP_NO_COINCIDE`.

Hallazgos: H-01 (sugerencia) falta una prueba HTTP del escenario «CURP con verificador incorrecto en demo»; la cubre la prueba en memoria del núcleo. H-02 (riesgo aceptado por Christian): en la expo se aceptan CURP no verificables, pero no se guardan.

Las tareas 1.2 y 1.3 quedan cumplidas con estos controles. Recomiendo el cierre con un commit solo de los hunks de este cambio.
