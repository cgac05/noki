# Transferencia: pantallas-clinica-alertas

- Responsable: frente B (canales), `LuisMaster119`. No toca archivos compartidos ni contratos; basta su autorización.
- Objetivo: fila de atención y «Cerrar atención» en `/clinica`, y alertas de seguridad en `/admin`, sobre `contratos-clinica-alertas` y `clinica-alertas`; ver `proposal.md` (Why).
- Alcance: `proposal.md` (What Changes), sin lo listado en «Fuera de alcance»; design D1, D3, D4 y D5 (D2 retirada).
- Historial:
  - Revisión 1: autorizada por `LuisMaster119` el 2026-11-24 en el chat de Claude Code, en respuesta a "¿Autorizas implementar pantallas-clinica-alertas con la revisión 1, una vez que el contrato esté en main?". Cita: "Autorizo". Hashes de la revisión 1: `proposal.md` 8f7ba79aef64 · `design.md` b68b07ccb8fb · `tasks.md` 7fdbe2f58166 · `specs/consolas-internas/spec.md` a974b21c6188 · `specs/cliente-api-canales/spec.md` 6c7c2d146fd6. Codex la implementó (1.1–3.2), y la revisión de Claude del 2026-11-25 dio BLOCKED solo por el recorrido real (`revision.md`).
  - Motivo de la revisión 2 (2026-11-25): `LuisMaster119` transmitió en el chat de Claude Code el acuerdo de los frentes: «ComprobarIdentidad NO se implementa: en clínica basta el QR firmado y el cambio compartido documentacion-compartida lo quita del contrato, así que quita de pantallas-clinica-alertas cualquier botón o acción de "INE verificada"». También avisó que `clinica-alertas` ya está en `main` (`71f01f5`).
- Autorización de implementación de la revisión 2: otorgada por `LuisMaster119`, responsable del frente B, en el chat de Claude Code el 2026-11-25, en respuesta a "¿Autorizas implementar pantallas-clinica-alertas con la revisión 2?". Cita: "Autorizo". Cubre la revisión 2 (hashes de abajo, comprobados sin cambios al registrarla) y las tareas 4.1–4.4. No autoriza commits.
- Revisión presentada: revisión 2 en la rama `feat/pantallas-clinica-alertas`, con la base avanzada por Claude a `main` `71f01f5` (sin conflictos: `main` no toca `apps/web` ni estos specs). SHA-256 (12 primeros caracteres): `proposal.md` e6ccbe1d0c51 · `design.md` a44e60c9c1d0 · `tasks.md` a410dac37577 · `specs/consolas-internas/spec.md` 23f1274ade99 · `specs/cliente-api-canales/spec.md` 21f3f40be347. `openspec validate pantallas-clinica-alertas --type change --strict --no-interactive` → válido.
- Artefactos a leer: `proposal.md`, los dos specs, `design.md`, `tasks.md` y `revision.md`; `openspec/specs/{consolas-internas,cliente-api-canales,contratos-canales,contratos-consultas}/spec.md`; `AGENTS.md` §5–§9.
- Tareas pendientes: 4.1–4.4 de `tasks.md`.
- Restricciones:
  - Solo `apps/web/**` y la carpeta del cambio. Sin cambios en contratos ni archivos compartidos.
  - Ningún uso de `ComprobarIdentidad` en la web. Sin reglas de negocio ni cálculo de turnos o alertas.
  - Usar `corepack pnpm`. Evidencia en la carpeta del cambio, sin rutas locales. No crear commits.
- Criterios de aceptación: requisitos y escenarios de los deltas de revisión 2 de `consolas-internas` y `cliente-api-canales`; el Flujo A simulado llega a «Atención cerrada» en 14 pasos; recorrido real 4.4 en verde.
- Validaciones requeridas: punto de control 4.3 (incluido `pnpm test:integracion`) y recorrido real 4.4.
- Detener la parte afectada si:
  - la API de `main` no avanza la fila o no devuelve las alertas como describe `clinica-alertas`;
  - `documentacion-compartida` llega a `main` con otros cambios que afecten estas vistas.
- Integración en `main`: tras la nueva revisión de Claude con PASS y la autorización de cierre del frente B. Al terminar, se avisa al frente A.
- Autorización de cierre: otorgada por `LuisMaster119`, responsable del frente B, en el chat de Claude Code el 2026-11-25, en respuesta a "¿Autorizas commit, push, integrar en main y cerrar pantallas-clinica-alertas?". Cita: "Autorizo todo". Cubre:
  - el commit de la implementación, la evidencia y la revisión, y el push de `feat/pantallas-clinica-alertas`;
  - la integración en `main` por fast-forward y su push;
  - la sincronización de specs y el archivado en `main` de la revisión 2 con dictamen PASS de `revision.md` (base `0cf6b53`).

  La sugerencia de foco queda sin atender. La incidencia de WhatsApp se remite al frente A.
