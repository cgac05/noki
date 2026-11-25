# Transferencia: identidad-asesor

- Responsable: frente B (canales), `LuisMaster119`. No toca archivos compartidos ni contratos; basta su autorización.
- Objetivo: identificación opcional del paciente por el asesor en `/callcenter` y pasos de identificación en el guion simulado de WhatsApp, sobre lo que integró `identidad-paciente`; ver `proposal.md` (Why).
- Alcance autorizado: `proposal.md` (What Changes), sin lo listado en «Fuera de alcance»; design D1–D6. Decisiones del usuario del 2026-11-24:
  - hacer este trabajo como cambio aparte de `consolas-internas`;
  - en el guion simulado, la identificación va en WhatsApp (sin rama opcional en el call center).
- Autorización de implementación: otorgada por `LuisMaster119`, responsable del frente B, en el chat de Claude Code el 2026-11-24, en respuesta a "¿Autorizas implementar identidad-asesor con la revisión 1 presentada?". Cita: "Autorizo implementar". Cubre la revisión 1 (hashes de abajo, comprobados sin cambios al registrarla). No autoriza commits.
- Revisión presentada: revisión 1 en la rama `feat/identidad-asesor`, sobre `main` `cb3d56a`. SHA-256 (12 primeros caracteres): `proposal.md` a73adbc7cdfd · `design.md` 09f05e1dbe5b · `tasks.md` b37d2d99ddf6 · `specs/consolas-internas/spec.md` 4ac721f10137 · `specs/cliente-api-canales/spec.md` 72d7958f8757. `openspec validate identidad-asesor --type change --strict --no-interactive` → válido.
- Artefactos a leer:
  - `proposal.md`, los dos specs, `design.md` y `tasks.md`.
  - `openspec/specs/{identificacion-paciente,siguiente-pregunta,consolas-internas,cliente-api-canales,simulador-whatsapp}/spec.md`.
  - `packages/domain/src/tipos/agendar.ts` (pistas por paso), `docs/contratos.md` (`IdentificarPaciente`), `PLAN.md` §8 y §12 y `AGENTS.md` §5–§9.
- Tareas pendientes: 1.1–3.3 de `tasks.md`.
- Restricciones:
  - Solo `apps/web/**`. Sin cambios en `@noki/contracts`, dominio, API ni archivos compartidos; si hacen falta, detener y proponer un cambio compartido.
  - Sin reglas de identidad en la web; solo forma del contrato.
  - Fecha, CURP y datos básicos nunca en almacenamiento, consola, URL ni estado de mutaciones o consultas.
  - Evidencia en la carpeta del cambio, sin rutas locales. Completar cada punto de control antes del siguiente. No crear commits.
- Criterios de aceptación: todos los requisitos y escenarios de los deltas de `consolas-internas` y `cliente-api-canales`. El Flujo A simulado completo funciona con la identificación nueva en WhatsApp.
- Validaciones requeridas: puntos de control 1.5 y 2.4, recorrido manual 3.1, compilaciones 3.2 y control final 3.3, incluido `pnpm test:integracion` con Docker.
- Detener la parte afectada si:
  - las pistas reales del dominio no siguen la convención de D2 (opciones `MI`, `OTRA_PERSONA`, `NINGUNO`, `SIN_CURP`; ids de campo iguales a las claves del payload);
  - hace falta un campo, consulta o comando nuevo;
  - `main` integra un cambio que modifique `IdentificarPaciente`, `SiguientePregunta` o las pistas de `paciente`.
- Autorización de cierre: otorgada por `LuisMaster119`, responsable del frente B, en el chat de Claude Code el 2026-11-24, en respuesta a "¿Autorizas commit, push, integrar en main y cerrar identidad-asesor con esta revisión?". Cita: "Autorizo todo". Cubre:
  - el commit de la implementación, la evidencia y la revisión, y el push de `feat/identidad-asesor`;
  - la integración en `main` por fast-forward y su push;
  - la sincronización de specs y el archivado en `main` de la segunda revisión con dictamen PASS de `revision.md` (base `d7f7590`).

  Las sugerencias H-02 a H-04 quedan sin atender.
