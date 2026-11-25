# Transferencia: wa-numero-continuacion

- Responsable: frente único (Christian Avila, `cgac05`); los frentes A y B ya no se distinguen en las specs.
- Objetivo: que «Abrir WhatsApp» del call center continúe la conversación desde el número de la llamada.
- Autorización de implementación: Christian en el hilo, 2026-11-25 ~13:40 UTC. Pidió: «revisalo, como regla cualquier desarrollo orquestalo con codex». También escribió: «te faculto a autoriza lo que consideres y cuestioname cualquier cosa que consideres necesaria». Con esa facultad, Claude autoriza la revisión 1. No autoriza commits.
- Revisión 1 en el checkout `noki` (rama `main`, base `f5260a8`), sin commit. SHA-256 (12): `proposal.md` cad0ff1c4c5c · `design.md` c5342a382797 · `tasks.md` 0cbcde00fd76 · `specs/consolas-internas/spec.md` 5a495193388b · `specs/simulador-whatsapp/spec.md` 00a5ca975fee. `openspec validate --strict` → válido.
- Restricciones: solo `apps/web/src/vistas/CallCenter.tsx`, `apps/web/src/vistas/Wa.tsx` y sus pruebas. `CallCenter.tsx` y `consolas.test.tsx` tienen cambios sin commit de `web-sesion`: trabajar encima sin revertirlos. No tocar API, núcleo ni contratos. Sin servidores (la demo corre aparte en `noki-identidad`), sin commits. Controles en serie.
- Autorización de cierre: otorgada por Christian en el hilo, 2026-11-25 («Sí, cierra y publica»), tras revisión PASS.
