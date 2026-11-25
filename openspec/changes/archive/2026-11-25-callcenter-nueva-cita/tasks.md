# Tasks

Requisitos: NT = `contratos-canales` «Iniciar un trámite nuevo aunque haya uno en proceso»; LN = `continuidad-canales` «Llamada entrante con cita nueva»; EC = `consolas-internas` «Elegir entre continuar o nueva cita en la llamada». Decisiones D1–D4. FN = `contratos-consultas` «Fecha de nacimiento para validar en la llamada»; VF = `consolas-internas` «Validación de la fecha de nacimiento por el asesor».

- [x] 1.1 En rojo y luego en verde: NT en `tests/unit/contratos.test.ts`; implementar D1 en `packages/contracts/src/comandos.ts` y documentar en `docs/contratos.md`.
- [x] 1.2 En rojo: escenarios de LN en `tests/unit/nucleo/casosTramite.test.ts` (memoria) y uno por HTTP en `tests/integracion/` (Postgres). Evidencia en `evidencias/01-rojo.txt`.
- [x] 1.3 Implementar D2 en `CasosTramite.iniciar` (y el paso del payload en `rutasComandos.ts` si hace falta). Verificación: 1.2 en verde; pruebas existentes de llamada entrante y retoma en verde.
- [x] 2.1 En rojo y luego en verde: escenarios de EC en `apps/web/src/vistas/consolas.test.tsx`; implementar D3 en `CallCenter.tsx` y el cliente simulado.
- [x] 2.2 En rojo y luego en verde: FN (consulta `fechaNacimientoLlamada` solo de demo: contrato, ruta, `LecturasMemoria`, `LecturasComandosPostgres`, cliente simulado; prueba de que `fichaHilo` no cambia y de que fuera de demo no existe) y «Validación de la fecha de nacimiento por el asesor» en `consolas.test.tsx`; implementar D4 en `CallCenter.tsx`.
- [x] 3.1 Controles en serie: `vitest run --project unitarios --project web --maxWorkers=2`, integración de los archivos tocados, `eslint`, `tsc` (paquetes y `tests/tsconfig.json`), `lint:deps`. Si el sandbox lo bloquea, anotarlo: el revisor los corre.

## Estado de validación

Las seis tareas cuentan con evidencia de esta revisión. Se reprodujeron los fallos de las pruebas contra la base `371bc39` y el fallo de H-05 contra la implementación previa a la corrección. La revisión corregida pasó las suites unitaria y web, la integración de llamada y los controles estáticos.

[Resultados de la vuelta 1](evidencias/05-vuelta-1.txt)
