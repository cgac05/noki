# Revisión: llamada-retoma-tramite

## Vuelta 1 — 2026-11-25 — FAIL

Revisor: Claude. Base `51e4df6`, revisión 1, sin commit; tareas 5/5 marcadas por Codex.

Diseño D1–D3 cumplido en el diff (`CasosTramite.iniciar`, `tramiteDeLlamada`, `ContactosPort.hilosPorTelefono` en memoria y Postgres, `LLAMADA_CC`, `docs/eventos.md`). `buscarTelefonoCapturado` sin cambios (lo usa otro trabajo).

| Control | Resultado |
|---|---|
| `vitest tests/unit/nucleo` | 92/92 |
| `tsc -p packages/application --noEmit` | 0 errores |
| Integración `llamadaRetomaTramite.test.ts` | 1/1 |
| Integración `comandosHttp.test.ts` completo | 3/4: falla «Flujo A por HTTP» (`datosRepetidos` 0, se esperaba ≥ 1) |
| Mismo archivo con los 5 archivos del núcleo de este cambio restaurados a `HEAD` | 4/4 |

### Hallazgos
- **H-01 (bloqueante, CC «Llamada entrante retoma…»):** la regresión la causa este cambio. La primera prueba del archivo deja un trámite en proceso con el contacto `0000000001`, que coincide en 10 dígitos con el número que usa «Flujo A por HTTP». Con la regla nueva, la llamada de «Flujo A» retoma ese trámite en lugar de crear uno, y cambian los datos que esa prueba da por hechos. El comportamiento nuevo es el especificado; lo que hay que ajustar es la prueba, para que cada caso use su propio número o deje su trámite cerrado, sin debilitar las aserciones de KPI. Agregar además una aserción en «Flujo A» de que la llamada retoma o crea según corresponda.
- H-02 (sugerencia): `iniciar` sigue creando el contacto `callcenter` y su hilo aunque luego retome otro trámite. Aceptable.

### Dictamen
FAIL por H-01. Correcciones a Codex y segunda vuelta.

## Vuelta 2 — 2026-11-25 — PASS

H-01 corregido solo en `tests/integracion/comandosHttp.test.ts`: la primera prueba usa el número de Beto y «Flujo A» comprueba que la llamada de Ana crea un `BORRADOR` con `TramiteIniciado`; la aserción `datosRepetidos ≥ 1` se conserva.

| Control (independiente, en serie) | Resultado |
|---|---|
| Integración `comandosHttp`, `llamadaRetomaTramite`, `rellenoHuecos` | 8/8 |
| `vitest tests/unit/nucleo tests/unit/api` | 149/149 |

H-02 sigue como sugerencia. Riesgos residuales en `proposal.md` (ANI falsificado, número compartido por dos pacientes). Recomiendo cierre: commit solo de `vocabulario.ts`, `CasosTramite.ts`, `ports/nucleo.ts`, `ContactosPostgres.ts`, `ContactosMemoria.ts`, `docs/eventos.md`, `tests/unit/nucleo/casosTramite.test.ts`, `tests/integracion/comandosHttp.test.ts`, `tests/integracion/llamadaRetomaTramite.test.ts` y la carpeta del cambio.
