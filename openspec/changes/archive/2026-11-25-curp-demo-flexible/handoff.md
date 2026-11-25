# Transferencia: curp-demo-flexible

- Responsable: frente único (decisión de Christian Avila, 2026-11-25 11:46 UTC).
- Objetivo: que una CURP real se acepte en `/callcenter` durante la expo. Decisión de Christian en el proyecto (13:18 UTC): "no es necesario validar con semillla solo que sean 18 para la expo".
- Autorización de implementación: el coordinador del proyecto, el 2026-11-25 entre 13:17 y 13:18 UTC ("Corrígelo con Codex con prioridad"), en ejercicio de la delegación que Christian escribió a las 12:19 UTC. No autoriza commits; el cierre lo autoriza Christian en el hilo.
- Revisión 1 en el checkout `noki`, base `51e4df6`, sin commit. SHA-256 (12): `proposal.md` 7116cba8e0ad · `design.md` 9ab462d89bb5 · `tasks.md` 9390d5b53d1e · `specs/identificacion-paciente/spec.md` d225b27f91f8. `openspec validate --strict` → válido.
- Restricciones: solo `packages/contracts/src/comandos.ts`, `packages/application/src/CasosTramite.ts`, una línea en `apps/api/src/componerComandos.ts` y otra en `apps/api/src/pruebas.ts`, y pruebas. Otro trabajo tiene cambios sin commit en esos dos archivos de `apps/api`: no tocar ni revertir sus líneas. Sin migraciones ni commits. Controles en serie.
- Autorización de cierre: otorgada por `cgac05` (Christian Avila) en el hilo del proyecto el 2026-11-25 a las 13:31 UTC, tras `revision.md` vuelta 1 PASS. Cita: "autorizo cerrar curp-demo-flexible".
