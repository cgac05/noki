# Implementación: nucleo-tramite

- Resumen: núcleo del Flujo A con registro de tipos, entidad y eventos, siguiente casilla, política de identidad, casos de uso, continuidad y adaptadores en memoria.
- Revisión entregada: cambios locales en `feat/nucleo-tramite`, basados en la revisión 3 autorizada.
- Archivos modificados: `packages/adapters/in-http/test/siguientePregunta.test.ts`, `packages/adapters/memory/src/AgendaMemoria.ts`, `packages/adapters/memory/src/CatalogoMemoria.ts`, `packages/adapters/memory/src/ContactosMemoria.ts`, `packages/adapters/memory/src/HiloRepoMemoria.ts`, `packages/adapters/memory/src/index.ts`, `packages/adapters/memory/src/PacientesMemoria.ts`, `packages/adapters/memory/src/RegistroIntentosMemoria.ts`, `packages/adapters/memory/src/TramiteRepoMemoria.ts`, `packages/adapters/memory/src/VerificadorTokensMemoria.ts`, `packages/application/src/CasosTramite.ts`, `packages/application/src/index.ts`, `packages/application/src/ports/nucleo.ts`, `packages/application/src/ResolvedorContinuidad.ts`, `packages/domain/src/HiloAtencion.ts`, `packages/domain/src/identidad/politica.ts`, `packages/domain/src/index.ts`, `packages/domain/src/RegistroTiposTramite.ts`, `packages/domain/src/siguientePregunta.ts`, `packages/domain/src/tipos/agendar.ts`, `packages/domain/src/Tramite.ts`, `tests/unit/nucleo/adaptadores.test.ts`, `tests/unit/nucleo/agendar.test.ts`, `tests/unit/nucleo/casosTramite.test.ts`, `tests/unit/nucleo/hilo.test.ts`, `tests/unit/nucleo/politica.test.ts`, `tests/unit/nucleo/registroTipos.test.ts`, `tests/unit/nucleo/siguientePregunta.test.ts`, `tests/unit/nucleo/tramite.test.ts`, `tasks.md` y este informe.
- Tareas: 1.1–5.6 completadas. Pendiente 5.7 en un árbol Git limpio.
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
| Validación final 5.7 | `pnpm lint && pnpm lint:deps && pnpm test` | PASS en el árbol de trabajo, 65 pruebas y 0 violaciones. Pendiente repetir en un checkout limpio de la revisión implementada, que sigue sin commit. |

## Contratos para api-comandos

- Reglas de `ReglaViolada`: `SERVICIO_NO_DISPONIBLE_EN_SEDE` con `alternativas` cuando el catálogo rechaza la sede, `TIPO_TRAMITE_NO_REGISTRADO`, `CASILLAS_PENDIENTES` con `casillas` y `TOKEN_INVALIDO`.
- Factores: `TOKEN`, `FOLIO_FECHA_NAC`, `OTP`, `BOTON_APROBACION`, `PIN`, `ENLACE_MAGICO`, `OTP_CONTACTO_ANTERIOR`, `VINCULO` y `FOLIO`.
- El consumidor de aplicación debe usar los resúmenes permitidos al exponer resultados de nivel 1. El resultado interno del caso de uso conserva el agregado y sus eventos.
- El verificador distingue tokens de continuidad y llegada. Los adaptadores en memoria usan tokens deterministas de un solo uso. La firma, la infraestructura real y la emisión de OTP quedan para los cambios correspondientes.
- Se eligió una vigencia de 24 horas para la cotización en memoria, calculada desde el reloj inyectado.

## Identificación de la revisión probada
Base Git: `c9ba23fb5bbad5cfbe9aa10d2be23652163dcd76`.

- `d424eaa17209` · `packages/adapters/in-http/test/siguientePregunta.test.ts`
- `1d561654eff0` · `packages/adapters/memory/src/AgendaMemoria.ts`
- `6051b5f897d6` · `packages/adapters/memory/src/CatalogoMemoria.ts`
- `72923b19f6e4` · `packages/adapters/memory/src/ContactosMemoria.ts`
- `9c9c91d0cd0d` · `packages/adapters/memory/src/HiloRepoMemoria.ts`
- `617bf7365bd3` · `packages/adapters/memory/src/index.ts`
- `ead7fdb15416` · `packages/adapters/memory/src/PacientesMemoria.ts`
- `e72b378786c3` · `packages/adapters/memory/src/RegistroIntentosMemoria.ts`
- `1aaf2a95fadb` · `packages/adapters/memory/src/TramiteRepoMemoria.ts`
- `314e6e73625d` · `packages/adapters/memory/src/VerificadorTokensMemoria.ts`
- `3f7cfeb132b6` · `packages/application/src/CasosTramite.ts`
- `b5f73e4f18b6` · `packages/application/src/index.ts`
- `4be1ae377b61` · `packages/application/src/ports/nucleo.ts`
- `43d22ee23fae` · `packages/application/src/ResolvedorContinuidad.ts`
- `a857bc9ddfa6` · `packages/domain/src/HiloAtencion.ts`
- `ac7309d920ee` · `packages/domain/src/identidad/politica.ts`
- `53df14c8d07d` · `packages/domain/src/index.ts`
- `f29120ffa802` · `packages/domain/src/RegistroTiposTramite.ts`
- `f6946d0354b7` · `packages/domain/src/siguientePregunta.ts`
- `58588c50430d` · `packages/domain/src/tipos/agendar.ts`
- `ff0315416396` · `packages/domain/src/Tramite.ts`
- `7a7ab14eb0f8` · `tests/unit/nucleo/adaptadores.test.ts`
- `f6cf902ff57b` · `tests/unit/nucleo/agendar.test.ts`
- `977d51a1f288` · `tests/unit/nucleo/casosTramite.test.ts`
- `c909f30fc9c7` · `tests/unit/nucleo/hilo.test.ts`
- `0d7938fa49af` · `tests/unit/nucleo/politica.test.ts`
- `0930c81e300d` · `tests/unit/nucleo/registroTipos.test.ts`
- `1aa7c6965cf1` · `tests/unit/nucleo/siguientePregunta.test.ts`
- `e61c16693851` · `tests/unit/nucleo/tramite.test.ts`
