# Transferencia: llamada-retoma-tramite

- Responsable: frente único (decisión de Christian Avila, 2026-11-25 11:46 UTC).
- Objetivo: que Call Center retome el trámite en proceso del número que llama aunque se haya iniciado en WhatsApp. Causa en `proposal.md` (Why).
- Alcance: `proposal.md` (What Changes), design D1–D3, delta de `continuidad-canales`.
- Autorización de implementación: otorgada el 2026-11-25 a las 12:48 UTC por el coordinador del proyecto ("Autorizo el cambio"), en ejercicio de la delegación que Christian escribió a las 12:19 UTC ("Claude al ser un solo frente y por el tiempo te faculto a autorizar…"), para corregir la falla que Christian reportó a las 12:48 UTC. No autoriza commits; el cierre a `main` lo autoriza Christian en el hilo.
- Revisión presentada: revisión 1 en el checkout `noki` (rama `claude/project-thread-kdenjy`, base `51e4df6`), sin commit. SHA-256 (12): `proposal.md` b04746fc27a1 · `design.md` 4d1819ab1a6b · `tasks.md` 0c7d06d546ff · `specs/continuidad-canales/spec.md` a7b354cb014c. `openspec validate --strict` → válido.
- Tareas pendientes: ninguna (5/5; `revision.md` vuelta 2 PASS).
- Restricciones:
  - Solo `packages/domain/src/vocabulario.ts`, `packages/application/src/CasosTramite.ts`, `packages/application/src/ports/nucleo.ts`, `packages/adapters/out-postgres/src/ContactosPostgres.ts`, `packages/adapters/memory/src/ContactosMemoria.ts`, `docs/eventos.md` y pruebas nuevas o del núcleo. Otro trabajo modifica a la vez `apps/web`, `apps/api`, `packages/adapters/in-http` y lecturas en esta carpeta: no tocarlos ni revertirlos.
  - Sin migraciones, dependencias ni cambios de contrato HTTP. No crear commits. Controles en serie.
- Detener si: hace falta migración, cambio de contrato o cambio en la web.
- Autorización de cierre: otorgada por `cgac05` (Christian Avila) en el hilo del proyecto el 2026-11-25 a las 13:24 UTC, en respuesta a la solicitud «Autorizo cerrar llamada-retoma-tramite» (commit solo de sus archivos, rebase sobre main, controles, integración, archivo y demo). Cita: "autorizo".
