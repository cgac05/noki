# Implementación de contratos-relleno-huecos

- Revisión 1 en `noki-identidad`, rama `claude/project-thread-nqfp68`, HEAD `77e5281` sobre `main` `230d246`, con el diff pendiente. Las autorizaciones de `cgac05` y `LuisMaster119` del 25 de noviembre de 2026 constan en [handoff.md](handoff.md).
- El contrato agrega `wa:mensajes` y la sala `wa:<waId>`, además de `HuecoVista` y `panelHuecos`. El panel admite hasta 50 huecos y descarta datos de pacientes y el canal de cada oferta. El guion simulado devuelve una lista vacía y la documentación incorpora las cuatro claves previstas de KPI.
- Tareas 1.1 a 3.1 completadas. El [manifiesto](evidencias/03-archivos-entregados.json) lista los archivos modificados y las evidencias con sus hashes. El handoff autorizado y la carpeta del otro cambio eran modificaciones preexistentes.
- Se reutilizó la validación de `waId` de la solicitud de WhatsApp y se compartió la validación IANA entre citas y huecos. Las reexportaciones existentes de `index.ts` publican los tipos nuevos. El único paquete del que depende `@noki/contracts` sigue siendo Zod.
- La emisión del evento, el registro del endpoint, el orden del panel y el cálculo de indicadores corresponden al cambio del núcleo. La adaptación web se verificó mediante compilación y pruebas automatizadas del guion y sus vistas. La revisión independiente queda pendiente.

| Tarea | Comando o comprobación | Resultado | Evidencia |
|---|---|---|---|
| 1.1 | `corepack pnpm exec vitest run --project unitarios tests/unit/contratos.test.ts tests/unit/consultas.test.ts` antes de implementar | Código 1 esperado, 8 fallos por contratos ausentes | [01-rojo.txt](evidencias/01-rojo.txt) |
| 1.2 | Mismas pruebas tras implementar | Código 0, 45 pruebas aprobadas | [02-verde.txt](evidencias/02-verde.txt) |
| 2.1 | `corepack pnpm -r exec tsc --noEmit` y revisión del diff | Código 0. El único cambio de web es el valor vacío del guion. | [02-tsc.txt](evidencias/02-tsc.txt) |
| 2.2 | Revisión de D1–D4, `PLAN.md` §10.1 y §10.8, y el catálogo de eventos | Conforme. Se documentan el contrato y los KPI previstos. | `docs/contratos.md` y `AGENTS.md` §7 |
| 3.1 | `corepack pnpm lint` | Código 0 | [03-lint.txt](evidencias/03-lint.txt) |
| 3.1 | `corepack pnpm lint:deps` | Código 0, 234 módulos sin violaciones | [03-deps.txt](evidencias/03-deps.txt) |
| 3.1 | `corepack pnpm test` con `VITEST_MAX_WORKERS=4` | Código 0, 414 pruebas aprobadas en 69 archivos | [03-test.txt](evidencias/03-test.txt) |
| 3.1 | `corepack pnpm test:integracion` con Postgres de prueba en el puerto 55432 y Redis en el 6379 | Código 0, 47 pruebas aprobadas en 17 archivos | [03-integracion.txt](evidencias/03-integracion.txt) |

La primera corrida de [test](evidencias/03-test-primer-intento.txt) registró nueve fallos de pruebas web. La primera corrida de [integración](evidencias/03-integracion-primer-intento.txt) agotó el tiempo de preparación de `comandosHttp.test.ts`. Ambas se ejecutaron en paralelo con los otros controles y pasaron en los reintentos descritos arriba, con los mismos plazos de Vitest.
