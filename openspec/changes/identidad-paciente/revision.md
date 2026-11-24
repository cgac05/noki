# Revisión: identidad-paciente

## Primera vuelta (2026-11-24)

- Dictamen: BLOCKED
- Revisión inspeccionada: worktree `noki-identidad`, rama `feat/identidad-paciente` sin commits sobre `9de129b`, diff pendiente de 33 archivos modificados y 10 nuevos según `implementacion.md` (revisión 4 de los artefactos: `design.md` 84b96846c6f7, `specs/identificacion-paciente/spec.md` ef6e9450c5cf).
- Cobertura: los seis specs del cambio y D1–D9; `infra/migraciones/003_identidad.sql`; `identidad/{curp,identificacion,nombre,telefono}.ts`; `CasosTramite.identificarPaciente` y `asignarPaciente`; `ResolvedorContinuidad`; `ContactosPostgres`; contrato (`comandos.ts`, `siguientePregunta.ts`); límites de alcance.
- Evidencia comprobada independientemente (Claude, en el worktree):
  - `pnpm lint` PASS; `pnpm lint:deps` PASS (144 módulos, 357 dependencias, sin violaciones); `pnpm test` PASS (27 archivos, 173 pruebas).
  - `tests/integracion/ejecutar.ts` con `DATABASE_URL` del contenedor de prueba en 127.0.0.1:55432 y Redis local: PASS (12 archivos, 32 pruebas), incluidas `identidadPostgres.test.ts` (registro concurrente, `curp_base` nula con sexo `X`, vista sin identificación) y la migración incremental.
  - `git diff` vacío para `apps/web`, `001_nucleo.sql` y `002_persistencia.sql`; `packages/contracts` sigue con `zod` como única dependencia.
  - Lectura del código: `vincular` solo actualiza con `EXCLUDED.nivel >= vinculo.nivel` (revisión 4); la prioridad 2 filtra `nivel >= 1` y vigencia de 180 días; candidatos limitados a 9 con `ref` del `GeneradorId` y nombre enmascarado; `AsignarPaciente` con actor `paciente` → `ASIGNACION_SOLO_PERSONAL`; el fallo de fecha del candidato cuenta intento, emite `IntentoVerificacionFallido` y borra la elección; bloqueo → `IDENTIFICACION_BLOQUEADA`.
  - Evidencia de Codex no repetida: `openspec validate --strict` (el CLI no existe en la máquina de Claude) y la ejecución del reinicio de demo.
- Controles no ejecutados: `openspec validate` (BLOQUEADO: CLI ausente en CGAC1 para Claude); prueba manual del demo (NO APLICA: sin cambios visibles en `apps/web` ni rutas HTTP en este cambio).

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | WARNING | handoff (revisión 4); `docs/colaboracion-openspec.md` "Ciclo y autorizaciones" | `handoff.md` registra la revisión 4 con autorización PENDIENTE; `implementacion.md` dice que el usuario la confirmó "en este chat" (el de Codex), sin cita ni fecha | Christian escribe la autorización de la revisión 4 en el hilo del proyecto y Claude la registra. Sin código que cambiar. |
| H-02 | WARNING | continuidad-canales "Resolución por prioridades", escenario "Vínculo declarado no revela"; tarea 2.4 | Ninguna prueba ejercita el resolvedor con un vínculo **vigente** de nivel 0; "Declaración no reactiva un vínculo vencido" (`tests/unit/nucleo/casosTramite.test.ts:269`) solo cubre un vínculo de nivel 1 vencido. El filtro existe (`ResolvedorContinuidad.ts`, `nivel >= 1`) | Agregar la prueba del escenario: `wa_id` con único vínculo de nivel 0 reciente, paciente con trámite abierto en otro hilo → `SIN_RESULTADO`, sin intento. |
| H-03 | SUGGESTION | identificacion-paciente "CURP validada y concordante", escenario "Verificador incorrecto" | `CURP_INVALIDA` no aparece en ninguna prueba; el rechazo solo se prueba en `validarCurp` (`curp.test.ts`) | Agregar una aserción en el caso de uso: paso `CURP` con verificador alterado → `ReglaViolada('CURP_INVALIDA')`. |
| H-04 | SUGGESTION | D8; persistencia-tramites | `003_identidad.sql` indexa `right(valor_externo, 10)` con filtro de canal, pero `pacientesPorTelefono` y `buscarTelefonoCapturado` consultan `right(regexp_replace(...), 10)` sin ese filtro, así que el índice no se usa | Opcional para la demo: alinear la expresión del índice con la consulta. |

- Condiciones para recomendar el cierre: H-01 registrado; H-02 corregido con su prueba en verde; rama adelantada a `main` actual (`42d6a78`, `simulador-wa`) y `pnpm lint`, `pnpm lint:deps`, `pnpm test` y `pnpm test:integracion` repetidos en verde; autorizaciones de commit, integración en `main`, sincronización y archivado de ambos frentes. Riesgo residual aceptado por Christian: nombre enmascarado visible para quien tenga el número dentro de 180 días.
- Próximo responsable: Christian (autorización de la revisión 4 en el hilo) y Codex (H-02, y opcionalmente H-03 y H-04).

## Segunda vuelta (2026-11-24)

- Dictamen: BLOCKED, solo por H-01 (falta la autorización escrita de la revisión 4). El cumplimiento técnico está demostrado; al registrarse H-01 el dictamen pasa a PASS sin repetir controles, si el diff no cambia.
- Revisión inspeccionada: rama `feat/identidad-paciente` adelantada a `42d6a78` (`main` con `simulador-wa`), mismo diff sin commits más las pruebas nuevas de H-02 y H-03 y `implementacion.md` actualizado.
- Evidencia comprobada independientemente (Claude): `pnpm lint` PASS; `pnpm lint:deps` PASS (159 módulos, 416 dependencias); `pnpm test` PASS (36 archivos, 212 pruebas); integración en 127.0.0.1:55432 PASS (12 archivos, 32 pruebas); `git diff HEAD` vacío para `apps/web`, `001` y `002`.

| Hallazgo | Gravedad | Estado | Evidencia |
|---|---|---|---|
| H-01 | WARNING | ABIERTO | `handoff.md`: revisión 4 con autorización PENDIENTE. |
| H-02 | WARNING | RESUELTO | `tests/unit/nucleo/casosTramite.test.ts:269` "Vínculo declarado no revela": vínculo de nivel 0 reciente en otro hilo → `SIN_RESULTADO`, sin `fallar` ni eventos. |
| H-03 | SUGGESTION | RESUELTO | `tests/unit/nucleo/casosTramite.test.ts:290`: `CURP_INVALIDA` en el caso de uso, sin avanzar ni contar intento. |
| H-04 | SUGGESTION | ABIERTO, opcional | Índice de teléfono no alineado con la consulta; sin efecto en la demo. |

- Condiciones para recomendar el cierre: H-01 registrado; autorización de commit, integración en `main`, sincronización de specs y archivado de un responsable de cada frente (cambio compartido). Riesgo residual aceptado: nombre enmascarado visible dentro de 180 días; H-04 queda como mejora.
- Próximo responsable: Christian (H-01 y autorización de cierre del frente A) y `LuisMaster119` (autorización de cierre del frente B, transmitida textualmente).

## Tercera vuelta (2026-11-24)

- Dictamen: PASS
- Revisión inspeccionada: la misma de la segunda vuelta (sin cambios de código desde entonces).
- H-01: RESUELTO. Christian Avila autorizó la revisión 4 en el hilo del proyecto el 2026-11-24; registrado en `handoff.md`. H-02 y H-03 resueltos en la segunda vuelta; H-04 (SUGGESTION) queda como mejora opcional.
- Riesgo residual: nombre enmascarado visible para quien tenga el número dentro de 180 días (aceptado por Christian); H-04.
- Próximo responsable: Claude, cierre autorizado por ambos frentes (`handoff.md`).
