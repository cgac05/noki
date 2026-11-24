# Implementación: nucleo-tramite

- Resumen: núcleo del Flujo A con registro de tipos, entidad y eventos, siguiente casilla, política de identidad, casos de uso, continuidad y adaptadores en memoria.
- Revisión entregada: `105f87d59fe94df7d0e709b8de63d52255add10d` en `feat/nucleo-tramite`, basada en la revisión 3 autorizada.
- Archivos modificados: `packages/adapters/in-http/test/siguientePregunta.test.ts`, `packages/adapters/memory/src/AgendaMemoria.ts`, `packages/adapters/memory/src/CatalogoMemoria.ts`, `packages/adapters/memory/src/ContactosMemoria.ts`, `packages/adapters/memory/src/HiloRepoMemoria.ts`, `packages/adapters/memory/src/index.ts`, `packages/adapters/memory/src/PacientesMemoria.ts`, `packages/adapters/memory/src/RegistroIntentosMemoria.ts`, `packages/adapters/memory/src/TramiteRepoMemoria.ts`, `packages/adapters/memory/src/VerificadorTokensMemoria.ts`, `packages/application/src/CasosTramite.ts`, `packages/application/src/index.ts`, `packages/application/src/ports/nucleo.ts`, `packages/application/src/ResolvedorContinuidad.ts`, `packages/domain/src/HiloAtencion.ts`, `packages/domain/src/identidad/politica.ts`, `packages/domain/src/index.ts`, `packages/domain/src/RegistroTiposTramite.ts`, `packages/domain/src/siguientePregunta.ts`, `packages/domain/src/tipos/agendar.ts`, `packages/domain/src/Tramite.ts`, `tests/unit/nucleo/adaptadores.test.ts`, `tests/unit/nucleo/agendar.test.ts`, `tests/unit/nucleo/casosTramite.test.ts`, `tests/unit/nucleo/hilo.test.ts`, `tests/unit/nucleo/politica.test.ts`, `tests/unit/nucleo/registroTipos.test.ts`, `tests/unit/nucleo/siguientePregunta.test.ts`, `tests/unit/nucleo/tramite.test.ts`, `tasks.md` y este informe.
- Tareas: 25 de 25 completadas, incluida la validación 5.7.
- Decisión del responsable en este chat: solo adaptadores en memoria en este cambio, según D9. Los adaptadores reales corresponden a cambios posteriores.

| Validación | Comando | Resultado real |
|---|---|---|
| Tarea 1.1 | `pnpm lint && pnpm lint:deps && pnpm test` | PASS con 23 pruebas antes de añadir 1.2 |
| Tareas 1.1 y 1.2 | `pnpm exec vitest run --project unitarios tests/unit/nucleo` | PASS, 5 pruebas |
| Tarea 1.2 | `pnpm exec tsc --project tests/tsconfig.json` | PASS |
| Estado después de 1.2 | `pnpm lint && pnpm lint:deps && pnpm test` | PASS, 24 pruebas y 0 violaciones de dependencias.  |
| Integración | `pnpm test:integracion` | NO APLICA según el alcance aprobado, que excluye infraestructura nueva |
| Punto de control 1.6 | `pnpm lint && pnpm lint:deps && pnpm test` | PASS, 30 pruebas y 0 violaciones de dependencias. |
| Punto de control 2.5 | `pnpm lint && pnpm lint:deps && pnpm test` | PASS, 34 pruebas. Búsqueda de ramificaciones sin coincidencias. La mutación temporal a INVALIDA fue rechazada por Zod en pista.entrada y se revirtió. |
| Punto de control 3.3 | `pnpm lint && pnpm lint:deps && pnpm test` | PASS, 49 pruebas. |
| Punto de control 4.4 | `pnpm lint && pnpm lint:deps && pnpm test` | PASS, 55 pruebas. |
| Tiempo de núcleo 5.6 | `pnpm exec vitest run --project unitarios tests/unit/nucleo --pool=threads --no-isolate --maxWorkers=1` | PASS, 45 pruebas, duración total de Vitest 1.86 s y 101 ms de ejecución. Docker no expuso su API local. |
| Planeación | `openspec validate nucleo-tramite --type change --strict --no-interactive` | PASS. |
| Validación final 5.7 | `pnpm install && pnpm lint && pnpm lint:deps && pnpm test` | PASS desde un worktree limpio del commit `105f87d`. Los cuatro comandos terminaron con código 0. |

## Contratos para api-comandos

- Reglas de `ReglaViolada`: `SERVICIO_NO_DISPONIBLE_EN_SEDE` con `alternativas` cuando el catálogo rechaza la sede, `TIPO_TRAMITE_NO_REGISTRADO`, `CASILLAS_PENDIENTES` con `casillas` y `TOKEN_INVALIDO`.
- Factores: `TOKEN`, `FOLIO_FECHA_NAC`, `OTP`, `BOTON_APROBACION`, `PIN`, `ENLACE_MAGICO`, `OTP_CONTACTO_ANTERIOR`, `VINCULO` y `FOLIO`.
- El consumidor de aplicación debe usar los resúmenes permitidos al exponer resultados de nivel 1. El resultado interno del caso de uso conserva el agregado y sus eventos.
- El verificador distingue tokens de continuidad y llegada. Los adaptadores en memoria usan tokens deterministas de un solo uso. La firma, la infraestructura real y la emisión de OTP quedan para los cambios correspondientes.
- Se eligió una vigencia de 24 horas para la cotización en memoria, calculada desde el reloj inyectado.

## Evidencia del punto de control 5.7

- Commit validado: `105f87d59fe94df7d0e709b8de63d52255add10d`.
- Checkout: `git worktree add --detach .noki-validation-105f87d 105f87d`.
- `git status --porcelain` no produjo salida antes ni después de los controles.

| Comando | Extracto de la salida |
|---|---|
| `pnpm install` | `Scope: all 14 workspace projects`; `Lockfile is up to date, resolution step is skipped`; 284 paquetes instalados; `Done in 6.8s using pnpm v11.25.0`. |
| `pnpm lint` | `eslint . && pnpm typecheck`; `pnpm -r exec tsc --noEmit && tsc --project tests/tsconfig.json`; sin errores. |
| `pnpm lint:deps` | `no dependency violations found (79 modules, 137 dependencies cruised)`. |
| `pnpm test` | Vitest 4.0.14: `Test Files 14 passed (14)`, `Tests 65 passed (65)`, `Duration 1.96s`. |
