# Transferencia: consolas-internas

- Responsable: frente B (canales), `LuisMaster119`. No toca archivos compartidos ni contratos; basta su autorización.
- Objetivo: que `/callcenter`, `/clinica`, `/admin` y `/app` usen lo que agregó `contratos-flujo-a` (ANI, `SolicitarContinuacion`, salas de Socket.IO, `contextoDemo`) y queden listas para `VITE_API=real`; ver `proposal.md` (Why).
- Alcance autorizado: `proposal.md` (What Changes), sin lo listado en "Fuera de alcance"; design D1–D9. Decisiones del usuario del 2026-11-24 al preparar la propuesta: incluir el cliente Socket.IO real con salas, e incluir `/app` en el contexto de modo real.
- Autorización de implementación: otorgada por `LuisMaster119`, responsable del frente B, en el chat de Claude Code el 2026-11-24, en respuesta a "¿Autorizas implementar consolas-internas con la revisión 1 presentada?". Cita: "Autorizo implementar". Cubre la revisión 1 (hashes de abajo, comprobados sin cambios al registrarla). No autoriza commits.
- Revisión presentada: revisión 1 en la rama `feat/consolas-internas`, sobre `main` `42d6a78`; SHA-256 (12 primeros caracteres): `proposal.md` 47acb9cd9828 · `design.md` acce7926df67 · `tasks.md` 705ab6737061 · `specs/consolas-internas/spec.md` 67befadb6d23 · `specs/cliente-api-canales/spec.md` 260044e9353d · `specs/navegacion-canales/spec.md` eccc2a11e322. `openspec validate consolas-internas --type change --strict --no-interactive` → válido.
- Artefactos a leer: `proposal.md`, los tres specs, `design.md`, `tasks.md`; `PLAN.md` §7, §8, §9 y §12; `AGENTS.md` §5–§9; `docs/contratos.md` (consultas, `metricas.kpis`, salas) y `docs/eventos.md`; `openspec/specs/{cliente-api-canales,navegacion-canales,simulador-whatsapp}/spec.md`.
- Tareas pendientes: 1.1–4.3 de `tasks.md`.
- Restricciones:
  - Solo `apps/web/**`, más `pnpm-lock.yaml` por `socket.io-client`. Sin cambios en `@noki/contracts` ni en archivos compartidos; si hacen falta, detener y proponer un cambio compartido.
  - Sin lógica de negocio ni cálculo de métricas en las vistas, y sin `fetch` ni Socket.IO en `vistas/`.
  - El ANI y el código de continuación no se guardan en almacenamiento del navegador ni en la consola.
  - Evidencia en la carpeta del cambio, sin rutas locales. Completar cada punto de control antes del siguiente. No crear commits.
- Criterios de aceptación: todos los requisitos y escenarios de `consolas-internas` y de los deltas de `cliente-api-canales` y `navegacion-canales`; el Flujo A simulado completo sigue funcionando por el camino nuevo.
- Validaciones requeridas: puntos de control 1.4, 2.4 y 3.6; recorrido manual 4.1; compilaciones 4.2; control final 4.3, incluido `pnpm test:integracion` con Docker.
- Detener la parte afectada si:
  - hace falta un campo, comando, evento o sala que el contrato no tiene;
  - la web tendría que decidir reglas de negocio o calcular métricas;
  - la major de `socket.io` de `api-comandos` difiere de la del cliente (D3);
  - `identidad-paciente` llega a `main` y cambia lo que reciben estas vistas.
- Pendiente fuera de esta revisión: la identidad del asesor va en un cambio aparte (decisión del 2026-11-24, abajo).
- Parada por `identidad-paciente` (2026-11-24): Codex se detuvo antes de 4.3 porque `main` avanzó a `91de578`, que integra `identidad-paciente` (ver `implementacion.md`). Evaluación de Claude: el cambio solo agrega al contrato `IdentificarPaciente` y `pista.paso`, ambos opcionales. No modifica `apps/web/**`, `pnpm-lock.yaml` ni las lecturas que usan estas vistas (`FichaHilo`, `LlegadaVista`, `MetricasVista`, `ContextoDemo`). Por eso no cambia lo que reciben las consolas ni requiere actualizar los artefactos.
- Decisión de `LuisMaster119` (2026-11-24, chat de Claude Code, a la pregunta "¿Cómo sigo con la identidad del asesor en el call center?"), respuesta: "Cambio aparte". La identidad del asesor y los pasos de identidad del guion simulado quedan fuera de este cambio y van en un cambio nuevo. Esto sustituye la nota "se agrega con `/opsx:update`" de `proposal.md` (Fuera de alcance) sin ampliar el alcance, así que la autorización de la revisión 1 sigue vigente.
- Instrucciones para continuar (Codex):
  - Rebase de `feat/consolas-internas` sobre `main` vigente (`91de578` o posterior) y `pnpm install --frozen-lockfile`.
  - Completar 4.1 y 4.3 sobre la rama rebasada y actualizar `implementacion.md` y el manifiesto.
  - Sin `IdentificarPaciente` ni `pista.paso` en las vistas.
  - Si 4.1 sigue bloqueado por la herramienta de navegador, registrarlo así; Claude repetirá el recorrido en su revisión.
- Autorización de cierre: otorgada por `LuisMaster119`, responsable del frente B, en el chat de Claude Code el 2026-11-24, en respuesta a "¿Autorizas commit, push, integrar en main y cerrar consolas-internas con esta revisión?". Cita: "Autorizo todo". Cubre:
  - el commit de la implementación, la evidencia y la revisión, y el push de `feat/consolas-internas`;
  - la integración en `main` por fast-forward y su push;
  - la sincronización de specs y el archivado en `main` de la revisión con dictamen PASS de `revision.md` (rama rebasada sobre `91de578`).

  Las sugerencias H-01 y H-02 quedan sin atender.
