# Transferencia: contratos-clinica-alertas

- Responsables: cambio compartido (toca `packages/contracts`, `docs/contratos.md` y `AGENTS.md`). Frente A: `J3sus-esb` o `cgac05` (basta uno). Frente B: `LuisMaster119`. Propuesta de implementación: frente A.
- Objetivo: agregar al contrato lo que necesitan el check-in de clínica y las alertas del tablero (`ComprobarIdentidad`, `CerrarAtencion`, posición en `LlegadaVista`, consulta `alertasSeguridad`); ver `proposal.md` (Why).
- Alcance: `proposal.md` (What Changes), sin lo listado en «Fuera de alcance»; design D1–D5. Lo eligió `LuisMaster119` el 2026-11-24 en la exploración del extra («Clínica y alertas»).
- Decisiones pendientes del frente A, que se resuelven en su visto bueno antes de implementar:
  - D2: «avanzar la fila» = `CerrarAtencion` del primero.
  - D4: los bloqueos se marcan con `bloqueado: true` en el intento que los provoca, sin alerta propia.

  Si alguna cambia, Claude actualiza los artefactos y se vuelve a pedir la autorización a ambos frentes.
- Autorización de implementación del frente B: otorgada por `LuisMaster119` en el chat de Claude Code el 2026-11-24, en respuesta a "¿Autorizas, por el frente B, contratos-clinica-alertas con la revisión 1?". Cita: "Autorizo por B". Cubre la revisión 1 (hashes de abajo, comprobados sin cambios al registrarla), incluida la lectura vacía en `apps/web/src/cliente/mock/guionFlujoA.ts` (D5), y que lo implemente el frente A. No autoriza commits. No basta para implementar: falta la autorización del frente A.
- Autorización de implementación del frente A: PENDIENTE. Debe cubrir expresamente la adaptación de `packages/adapters/in-http/src/rutasComandos.ts` (D5) y confirmar quién implementa.
- Revisión presentada: revisión 1 en la rama `feat/contratos-clinica-alertas`, sobre `main` `465f944`. SHA-256 (12 primeros caracteres): `proposal.md` d1f032430287 · `design.md` 10a58add5ab2 · `tasks.md` 5ee446f6bbb8 · `specs/contratos-canales/spec.md` 2b40e262295f · `specs/contratos-consultas/spec.md` d8d5fcff60ed. `openspec validate contratos-clinica-alertas --type change --strict --no-interactive` → válido.
- Artefactos a leer:
  - `proposal.md`, los dos specs, `design.md` y `tasks.md`.
  - `openspec/specs/{contratos-canales,contratos-consultas,tramite-nucleo,tiempo-real,consultas-api}/spec.md`.
  - `docs/contratos.md`, `docs/eventos.md`, `AGENTS.md` §7 y `docs/trabajo-paralelo.md` (archivos compartidos).
- Tareas pendientes: 1.1–3.1 de `tasks.md`.
- Restricciones:
  - Solo los archivos de `proposal.md` (Impact). Sin lógica de núcleo, API ni pantallas: van en los cambios propios de cada frente.
  - Sin datos personales en `AlertaSeguridad`.
  - Evidencia en la carpeta del cambio. No crear commits sin autorización.
- Criterios de aceptación: requisitos y escenarios de los deltas de `contratos-canales` y `contratos-consultas`; `main` sigue compilando y en verde.
- Validaciones requeridas: 1.1 en rojo y control final 3.1, incluido `pnpm test:integracion` con Docker.
- Detener la parte afectada si:
  - el frente A cambia D2 o D4;
  - el cambio de documentación del frente A (botón «adelantar reloj») se integra antes y choca en `docs/contratos.md` o `AGENTS.md`: rebase y resolver sin cambiar el alcance.
- Autorización de cierre: PENDIENTE (ambos frentes).
