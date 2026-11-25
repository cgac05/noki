# Transferencia: idempotencia-wa

- Responsable: frente A (núcleo), co-responsables `J3sus-esb` y `cgac05`; basta uno. No toca archivos compartidos.
- Objetivo: corregir el 500 de WhatsApp después de «Acepto la preparación» cuando el paciente se asignó desde el call center (reporte del frente B). La causa reproducida está en `proposal.md` (Why).
- Alcance propuesto: `proposal.md` (What Changes), sin lo listado en «Fuera de alcance»; design D1–D2.
- Autorización de implementación: otorgada por `cgac05` (Christian Avila), co-responsable del frente A, en el hilo del proyecto el 2026-11-25. Cita: "Autorizo idempotencia-wa revisión 1 y elijo la opción (a) para H-02." Cubre la revisión 1 y, con la opción (a), la revisión 2, que solo cambia documentos: `CasosTramite.aceptarPreparacion` y el evento `PreparacionAceptada` entran en `proposal.md` y en design D3. No autoriza commits. Antes se había registrado aquí el texto del prompt de implementación, que no valía como autorización (H-01 de `revision.md`).
- Revisión presentada: revisión 2 en la rama local `feat/idempotencia-wa` (árbol `noki-identidad`), sobre `main` `b66e393`, sin commit. SHA-256 (12 primeros caracteres): `proposal.md` f565f200c006 · `design.md` 54c129a02601 · `tasks.md` b9eb3f5e2c3a · `specs/canal-whatsapp/spec.md` dac58ae7f174 · `specs/persistencia-tramites/spec.md` ec07ad982d3f. `openspec validate` → válido.
- Artefactos a leer: `proposal.md`, `design.md`, `tasks.md` y los deltas de `canal-whatsapp` y `persistencia-tramites`; `packages/domain/src/Tramite.ts` (`anotar`); `AGENTS.md` §5–§9.
- Tareas pendientes: ninguna (5/5 hechas por Codex).
- Restricciones:
  - Solo archivos del frente A.
  - Sin migraciones ni dependencias.
  - No cambiar la regla de sufijos de `Tramite` ni el contrato.
  - Evidencia en la carpeta del cambio. No crear commits.
- Detener la parte afectada si:
  - el modo estricto destapa claves repetidas en código de producción fuera de `ConversacionWa`;
  - hace falta cambiar un contrato o la capa de idempotencia HTTP.
- Autorización de cierre: otorgada por `cgac05` (Christian Avila), co-responsable del frente A, en el hilo del proyecto el 2026-11-25, después de la segunda vuelta PASS de `revision.md`. Cita: "Autorizo commit, push de feat/idempotencia-wa, integrar en main por fast-forward y cerrar idempotencia-wa". Cubre el commit, el push de la rama, el fast-forward de `main` y su push, y la sincronización de specs y el archivado.
