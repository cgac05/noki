# Transferencia: wa-una-pregunta

- Responsable: frente A (núcleo), co-responsables `J3sus-esb` y `cgac05`; basta uno. No toca archivos compartidos ni `apps/web`. El 2026-11-25 a las 11:46 UTC Christian decidió en el proyecto trabajar como un único frente.
- Objetivo: que `/wa` haga una pregunta por mensaje, permita elegir día, pida sexo y entidad como opciones y concluya el registro con la API real. Las cuatro fallas reportadas por Christian y sus causas reproducidas están en `proposal.md` (Why).
- Alcance propuesto: `proposal.md` (What Changes), sin lo listado en «Fuera de alcance»; design D1–D6.
- Autorización de implementación: otorgada por `cgac05` (Christian Avila), co-responsable del frente A, en el hilo del proyecto el 2026-11-25 a las 11:44 UTC, en respuesta a la presentación de la revisión 1 con los hashes de abajo. Cita: "adelante". Antes pidió en el mismo hilo que Claude orqueste a Codex ("para ambos casos orquesta tu como agente de programacion a codex para resolverlo"). Cubre la revisión 1 y el lanzamiento de Codex por Claude. No autoriza commits.
- Revisión 2 (solo D5, su requisito en `agenda-simulada`, un escenario nuevo y la tarea 1.1): corrige el solape de folios que Codex encontró en 1.1 (`implementacion.md`). Autorización de la revisión 2: otorgada por `cgac05` (Christian Avila) en el hilo del proyecto el 2026-11-25 a las 11:48 UTC. Cita: "Autorizo la revisión 2 de wa-una-pregunta." Cubre la revisión 2. No autoriza commits.
- Revisión 3 (solo el texto del requisito de `agenda-simulada` y una frase de D5): limita la garantía de folios al ciclo de 899 999 segundos, por la segunda pausa de Codex en 1.1. Autorización de la revisión 3: otorgada por `cgac05` (Christian Avila) en el hilo del proyecto el 2026-11-25 a las 11:51 UTC. Cita: "Autorizo la revisión 3 de wa-una-pregunta." No autoriza commits.
- Revisión presentada: revisión 3 en la rama local `claude/project-thread-kdenjy` (checkout `noki`), sobre `main` `0b59599`, sin commit. SHA-256 (12 primeros caracteres): `proposal.md` c70fba809ae4 · `design.md` c390d838389e · `tasks.md` ad46d1c8c6d5 · `specs/canal-whatsapp/spec.md` 999e325eafda · `specs/agenda-simulada/spec.md` 355c8adb4a96 (revisión 2: design dadf3485cd7a, agenda-simulada bbab5a16dd7e; revisión 1: design c3988cf4e460, tasks 71e9451d5490, agenda-simulada f572d8660e91). `openspec validate --strict` → válido.
- Artefactos a leer: `proposal.md`, `design.md`, `tasks.md`, los dos deltas; `packages/adapters/in-http/src/ConversacionWa.ts`, `identificacionWa.ts`, `textosWa.ts`; `apps/sd-mock/src/crearSdMock.ts`; `packages/domain/src/tipos/agendar.ts` (solo lectura); `AGENTS.md` §5–§9.
- Tareas pendientes: ninguna (9/9 hechas por Codex; `revision.md` vuelta 1 PASS).
- Restricciones:
  - Solo archivos del frente A. Sin cambios en `packages/contracts`, `apps/web`, dominio, migraciones ni dependencias.
  - Ningún secreto ni dato de paciente como texto libre: cada dato va en Flow `sensitive` o como opción.
  - Evidencia en la carpeta del cambio, sin rutas locales ni datos personales. No crear commits.
  - Controles en serie (en paralelo producen timeouts).
- Detener la parte afectada si:
  - hace falta cambiar el contrato, la pista del dominio o la web;
  - las pruebas existentes de WhatsApp necesitan cambios fuera del paso de horario o de `DATOS`.
- Autorización de cierre: otorgada por `cgac05` (Christian Avila) en el hilo del proyecto el 2026-11-25 a las 12:32 UTC, después de la vuelta 1 PASS de `revision.md` y de la solicitud con el alcance «commit solo de sus archivos, rebase sobre main, controles, fast-forward de main, archivo y push». Cita: "Autorizo cerrar wa-una-pregunta".
