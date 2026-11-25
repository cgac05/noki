# Tasks

Requisito: IP = `identificacion-paciente` «CURP flexible en modo demo». Decisiones D1–D3.

- [x] 1.1 Escribir en rojo los escenarios de IP (memoria, `tests/unit/nucleo/`) y la prueba de contrato de 18 alfanuméricos.
- [x] 1.2 Implementar D1 (contrato y opción `curpFlexible`, pasada desde `componerComandos` y `crearApiPruebas` con el valor de `demo`), D2 y D3. Verificación: 1.1 en verde y las pruebas existentes de identificación en verde (las que prueban `CURP_INVALIDA`/`CURP_NO_COINCIDE` deben correr con `curpFlexible` falso).
- [x] 1.3 Controles en serie: `vitest tests/unit/nucleo tests/unit/api tests/unit/contratos.test.ts`, integración `identidadPostgres` y `comandosHttp`, `eslint` y `tsc` de los paquetes tocados. Evidencia en `evidencias/`.
