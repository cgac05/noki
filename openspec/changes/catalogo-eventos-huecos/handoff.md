# Transferencia: catalogo-eventos-huecos

- Responsables: cambio compartido (toca `docs/eventos.md`, más `packages/domain/src/{eventos,identificadores}.ts` y `tests/unit/dominio.test.ts` del frente A). Frente A: `J3sus-esb` o `cgac05` (basta uno). Frente B: `LuisMaster119`. Propuesta de implementación: frente A.
- Objetivo: fijar en el código y en `docs/eventos.md` los once eventos del relleno de huecos y `RiesgoEstimado` (T3 de predicción) antes de que `relleno-huecos` y la T3 los emitan; ver `proposal.md` (Why).
- Alcance: `proposal.md` (What Changes), design D1–D5, sin lo listado en «Non-Goals».
- Decisiones que el frente A debe contrastar con su diseño de `relleno-huecos` antes de autorizar:
  - D1: payloads de cada evento.
  - D2: a qué trámite pertenece cada evento.
  - D3: payload de `RiesgoEstimado` (retoma los preliminares D3 y D4 de `prediccion-riesgo`).
  - D4: nombres de los identificadores `HuecoId`, `OfertaHuecoId` e `InteresAdelantoId`.

  Si alguna cambia, Claude actualiza los artefactos y se vuelve a pedir la autorización a ambos frentes.
- Autorización de implementación del frente A: PENDIENTE.
- Autorización de implementación del frente B: otorgada por `LuisMaster119` en el chat de Claude Code el 2026-11-25, en respuesta a "¿Autorizas, por el frente B, catalogo-eventos-huecos con la revisión 1?". Cita: "Autorizo por B". Cubre la revisión 1 (hashes de abajo, comprobados sin cambios al registrarla) y que lo implemente el frente A. No autoriza commits. No basta para implementar: falta la autorización del frente A.
- Revisión presentada: revisión 1 en la rama `feat/catalogo-eventos-huecos`, sobre `main` `230d246`. SHA-256 (12 primeros caracteres): `proposal.md` 6dacbc8765a5 · `design.md` ebac5ac761a4 · `tasks.md` c25e71f51403 · `specs/contratos-canales/spec.md` 1b22e81f21a8. `openspec validate catalogo-eventos-huecos --type change --strict --no-interactive` → válido.
- Artefactos a leer:
  - `proposal.md`, el spec, `design.md` y `tasks.md`.
  - `PLAN.md` §6 (tablas `hueco`, `oferta_hueco`, `interes_adelanto`), §7 y §10.1.
  - `docs/eventos.md`, `packages/domain/src/eventos.ts`, `tests/unit/dominio.test.ts`.
  - `openspec/specs/{contratos-canales,prediccion-riesgo}/spec.md` y `openspec/changes/archive/2026-11-25-prediccion-riesgo/design.md` (D3, D4).
- Tareas pendientes: 1.1–3.1 de `tasks.md`.
- Restricciones:
  - Solo los archivos de `proposal.md` (Impact). Nadie emite los eventos en este cambio.
  - Payloads solo con IDs y datos del hueco; nada de datos sensibles ni del paciente que liberó el horario en los eventos del candidato.
  - Evidencia en la carpeta del cambio. No crear commits sin autorización.
- Criterios de aceptación: requisito y escenarios del delta de `contratos-canales`; `main` sigue compilando y en verde.
- Validaciones requeridas: 1.1 en rojo y control final 3.1, incluido `pnpm test:integracion` con Docker.
- Orden de integración: este cambio entra a `main` antes de `relleno-huecos` y de la T3. `feat/contratos-relleno-huecos` no comparte archivos con este cambio y puede integrarse antes o después.
- Detener la parte afectada si:
  - el frente A cambia D1–D4;
  - otro cambio integra en `main` eventos nuevos o cambia `tests/unit/dominio.test.ts`: rebase y resolver sin cambiar el alcance.
- Autorización de cierre: PENDIENTE (ambos frentes).
