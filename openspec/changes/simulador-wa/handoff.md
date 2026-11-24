# Transferencia: simulador-wa

- Responsable: frente B (canales), `LuisMaster119`. No toca archivos compartidos ni contratos: basta su autorización.
- Objetivo: convertir `/wa` en un simulador de WhatsApp usable en modo simulado y real, con historial en el cliente, entrada por enlace de continuación y modal tipo Flow con captura protegida; ver `proposal.md` (Why).
- Alcance: `proposal.md` (What Changes), sin lo listado como "Fuera de alcance"; design D1–D8.
- Autorización de implementación: PENDIENTE de `LuisMaster119`.
- Revisión presentada: revisión 2 en la rama `feat/simulador-wa` sobre `main` `d8a8584`; SHA-256 (12 primeros caracteres): `proposal.md` 7b8ce76a7a64 · `design.md` 01328fda17b8 · `tasks.md` 0a59aa8a526b · `specs/cliente-api-canales/spec.md` 9147f0d2caa6 · `specs/navegacion-canales/spec.md` 3eab4b2f1d27 · `specs/simulador-whatsapp/spec.md` f410704da7f4. `openspec validate simulador-wa --type change --strict --no-interactive` → válido.
- Artefactos a leer: `proposal.md`, los tres specs, `design.md`, `tasks.md`; `PLAN.md` §8, §9 y §12; `AGENTS.md` §5–§9; `docs/contratos.md` (`whatsapp.ts`, `mensajesBot.ts`); `openspec/specs/simulador-whatsapp` no existe todavía; `openspec/specs/navegacion-canales/spec.md` y `cliente-api-canales/spec.md`.
- Tareas pendientes: 1.1–4.4 de `tasks.md`.
- Contratos: confirmado que este cambio no modifica `packages/contracts`. El delta de `cliente-api-canales` solo describe cómo la web usa el guion, el módulo de demo, el modo simulado y la idempotencia de sus envíos con los contratos existentes.
- Ajustes de la revisión 2 (pedidos por el usuario el 2026-11-24 tras evaluar una revisión externa): historial en `sessionStorage` redactado y "Nueva conversación"; sin envíos dobles, "escribiendo…" e `Idempotency-Key` por mensaje; `replaceState` y `Referrer-Policy: no-referrer`; el modo simulado sigue por defecto en desarrollo, con insignia visible y build de producción que exige `VITE_API`. El usuario eligió esta alternativa en lugar de apagar el simulado por defecto: "adelante dejemos que es simulacion".
- Restricciones: solo `apps/web/**`; sin cambios a `@noki/contracts` ni a archivos compartidos (si hacen falta, detener y proponer un cambio compartido); los valores del Flow y el código de continuación nunca en historial guardado, consola, almacenamiento del navegador ni estado de mutación persistente; sin lógica de negocio en la web; evidencia en la carpeta del cambio y sin rutas locales; completar cada punto de control antes del siguiente; no crear commits.
- Criterios de aceptación: todos los requisitos y escenarios de `simulador-whatsapp` y de los deltas de `navegacion-canales` y `cliente-api-canales`; el Flujo A simulado completo sigue funcionando por el camino nuevo.
- Validaciones requeridas: puntos de control 1.3, 2.5, 3.4 y 4.4; comprobaciones manuales 4.1 y 4.2.
- Detener la parte afectada si: hace falta un campo o evento nuevo en el contrato (por ejemplo, mensajes iniciados por la empresa); la web tendría que decidir reglas de negocio; un dato capturado tendría que mostrarse o guardarse.
- Autorización de cierre: PENDIENTE
