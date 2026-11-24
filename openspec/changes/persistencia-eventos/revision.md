# Revisión: persistencia-eventos

- Dictamen: BLOCKED (primera vuelta, 2026-11-24). Toda la evidencia aplicable sobre el árbol de trabajo está en verde y no encontré incumplimientos demostrados. El bloqueo es la tarea 5.6 (H-01): falta repetir los controles desde un checkout limpio de un commit autorizado.
- Revisión inspeccionada: cambios sin commit en `feat/persistencia-eventos` sobre `main` `7789d32`: 69 archivos, +2398/−63, contando los nuevos (`git add -N` temporal y `git reset` sin cambiar el índice). SHA-256 del diff sin `openspec/`: b10a57e27fb4. Artefactos de planificación: revisión 4 autorizada (`handoff.md`), con `tasks.md` cambiado solo en casillas.
- Cobertura:
  - Los 5 specs del cambio (17 requisitos), design D1–D11 y las tareas 1.1–5.6.
  - Código revisado: `002_persistencia.sql`, `Tramite.instantanea`/`rehidratar`, `CasosTramite.confirmar` (saga), `ResolvedorContinuidad` (H-02/H-03), `RelayOutbox`, puertos `publicacion.ts` y `nucleo.ts`, `TramiteRepoPostgres`, `eventStore.ts` (partición FNV-1a), `OutboxPostgres`, `AgendaPostgres`, `RegistroIntentosPostgres`, `PacientesPostgres`, `EventosSinTramitePostgres`, `RegistroProcesadosPostgres`, `PublicadorRedisStreams`, `ConsumidorStreams`, `AgendaExternaSd`, `AgendaMemoria`, `crearSdMock.ts` y `apps/api/src/main.ts`.
  - Pruebas inspeccionadas: la obligatoria de 50 reservas concurrentes (`tests/integracion/agendaPostgres.test.ts:49`), relay con dos relays y prefijo aislado (`relayPostgres.test.ts:46`) y consumidor (`consumidorStreams.test.ts:40,65`).
- Evidencia comprobada independientemente (2026-11-24, árbol de trabajo, `corepack pnpm` con un shim temporal de `pnpm` fuera del repo):
  - `pnpm lint` → PASS (ESLint y `tsc --noEmit` en todos los paquetes y en `tests/`).
  - `pnpm lint:deps` → PASS, "no dependency violations found (138 modules, 327 dependencies cruised)".
  - `pnpm test` → PASS, 24 archivos y 114 pruebas.
  - `pnpm test:integracion` con `DATABASE_URL` apuntando al contenedor aislado `noki-persistencia-test-postgres` (127.0.0.1:55432) y Redis local → PASS, 11 archivos y 30 pruebas.
  - `git diff --quiet main -- infra/migraciones/001_nucleo.sql` → sin diferencias.
  - Búsqueda de `Date.now()`, `new Date()`, `Math.random` y `randomUUID` en `packages/domain` y `packages/application` → sin resultados. Búsqueda de `skip` y `.only` en `tests/` → sin resultados.
  - Lectura frente a los requisitos:
    - Transacción de trámite, eventos y outbox con `UPDATE … WHERE version` e `INSERT … ON CONFLICT DO NOTHING`, y `marcarGuardado()` después del commit (`TramiteRepoPostgres.ts`).
    - `CHECK` de formato de las claves y conversión a `text` (`002`).
    - Bloqueo consultivo de sesión conservado hasta `liberar()` en `finally` (`OutboxPostgres.ts`, `RelayOutbox.ts`).
    - `HORARIO_NO_DISPONIBLE` en memoria y en Postgres, sin `ConflictoVersion`.
    - Hold vencido marcado `EXPIRADA` en la misma transacción.
    - Saga: hold vencido sin llamada externa; cancelación si falla la confirmación local; compensación ante `ConflictoVersion` salvo si el trámite quedó confirmado con el mismo folio.
    - H-03: folio bien formado sin fecha → `REQUIERE_VERIFICACION` antes de consultar el repositorio.
    - H-02: `IntentoVerificacionFallido` construido en el resolvedor y guardado por `EventosSinTramite`.
    - `PacientesPostgres` devuelve solo `boolean` o IDs, con consultas parametrizadas.
- Evidencia de Codex no repetida: `openspec validate persistencia-eventos --type change --strict` (el CLI no está instalado en la máquina de Claude), prueba manual de 5.4 con `XRANGE` y la medición de 1.77 s de las pruebas de núcleo y persistencia.
- Controles no ejecutados:
  - Tarea 5.6: BLOQUEADA, porque la revisión no tiene commit.
  - Una prueba de integración dedicada a "Redis no disponible" en el relay: la cubre la prueba con adaptadores en memoria de `tests/unit/persistencia/relay.test.ts`. Lo acepto como suficiente porque la ruta de fallo es la misma en `RelayOutbox`.

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | CRITICAL | Tarea 5.6 | `tasks.md` 5.6 sin marcar; `implementacion.md` "BLOQUEADO: el cambio no tiene un commit autorizado" | Con autorización escrita del responsable, crear un commit local de la revisión en `feat/persistencia-eventos`. Codex ejecuta `pnpm install && pnpm lint && pnpm lint:deps && pnpm test && pnpm test:integracion` en un worktree limpio de ese commit, fuera del repo o ignorado, registra el hash y la salida en `implementacion.md` y marca 5.6. Abierto |
| H-02 | SUGGESTION | agenda-simulada "Cliente de agenda externa con reintentos"; reservas-horario (compensación) | `AgendaExternaSd.ts`: `registrar` por defecto es una función vacía; `CasosTramite` tiene `registrarError?` opcional; nada los conecta todavía | En `api-comandos`, inyectar el logger (pino con `correlation_id`) en ambos al armar el composition root; si no, los reintentos y las compensaciones fallidas no dejan rastro |
| H-03 | SUGGESTION | publicacion-eventos "Relay del outbox" | `apps/api/src/main.ts`: con Postgres o Redis caídos, el aviso `RELAY_OUTBOX_FALLIDO` se escribe cada 250 ms | Limitar la frecuencia del aviso o usar espera creciente mientras falle |
| H-04 | SUGGESTION | persistencia-tramites "Partición"; design D3 | `eventStore.ts`: `creado_en = clock_timestamp()` se fija al insertar, no al confirmar. Dos transacciones concurrentes de trámites distintos del mismo paciente pueden confirmarse en orden inverso y el relay publicarlas fuera del orden de confirmación | Riesgo conocido de D3; aceptable para la demo. Documentarlo en `docs/persistencia.md` o, si un consumidor depende del orden, ordenar por una secuencia asignada al confirmar |
| H-05 | SUGGESTION | agenda-simulada "Agenda simulada en sd-mock" | `crearSdMock.ts`: registrar de nuevo una reserva cuya cita se canceló devuelve el folio cancelado; `AgendaExternaSd` también reintenta respuestas 4xx | Opcional: responder con la cita inactiva como error y no reintentar 4xx. No afecta al Flujo A |

- Condiciones para recomendar el cierre: resolver H-01 y verificar su evidencia. H-02 a H-05 son opcionales: H-02 corresponde a `api-comandos` y H-03 a H-05 son mejoras.
- Riesgos residuales:
  - Sin BullMQ, los holds vencidos se detectan al confirmar o al apartar de nuevo (D10).
  - `openspec validate` solo lo ejecutó Codex.
  - `docs/eventos.md` (compartido) sigue diciendo que no hay outbox; queda para un cambio compartido aparte.
- Próximo responsable: Christian (co-responsable del frente A) decide si autoriza el commit local para la tarea 5.6. Después, Codex ejecuta 5.6 y Claude hace la segunda vuelta.
