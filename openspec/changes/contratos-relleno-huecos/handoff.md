# Transferencia: contratos-relleno-huecos

- Responsables: cambio compartido (toca `packages/contracts`, `docs/contratos.md` y `AGENTS.md`). Frente A: `J3sus-esb` o `cgac05` (basta uno). Frente B: `LuisMaster119`. Propuesta de implementación: frente A.
- Objetivo: agregar al contrato lo mínimo para el relleno de huecos secuencial con aprobación por WhatsApp (`wa:mensajes`, sala `wa:<waId>`, `HuecoVista`, consulta `panelHuecos` y claves de KPI documentadas); ver `proposal.md` (Why).
- Alcance: `proposal.md` (What Changes), sin lo listado en «Fuera de alcance»; design D1–D5. Decisiones de `LuisMaster119` en la exploración del 2026-11-25: empezar por el relleno de huecos, y que Ana cancele en `/app` con botón de aprobación.
- Decisiones pendientes del frente A, que se resuelven en su visto bueno antes de implementar:
  - D2: el prefijo de la sala (`wa:` propuesto).
  - D3: el límite de 50 huecos y si se expone el canal de cada oferta.

  Si alguna cambia, Claude actualiza los artefactos y se vuelve a pedir la autorización a ambos frentes.
- Autorización de implementación del frente B: otorgada por `LuisMaster119` en el chat de Claude Code el 2026-11-25, en respuesta a "¿Autorizas, por el frente B, contratos-relleno-huecos con la revisión 1?". Cita: "Autorizo por B". Cubre la revisión 1 (hashes de abajo, comprobados sin cambios al registrarla), incluida la lectura vacía en `apps/web/src/cliente/mock/guionFlujoA.ts` (D5), y que lo implemente el frente A. No autoriza commits. No basta para implementar: falta la autorización del frente A.
- Autorización de implementación del frente A: PENDIENTE. Debe confirmar D2 y D3 y quién implementa.
- Revisión presentada: revisión 1 en la rama `feat/contratos-relleno-huecos`, sobre `main` `6c015ab`. SHA-256 (12 primeros caracteres): `proposal.md` 0a150b1ce8ab · `design.md` 365dab576149 · `tasks.md` 3b15a49e7254 · `specs/contratos-canales/spec.md` 2313d2c19bfa · `specs/contratos-consultas/spec.md` 47cbb7a31ec3. `openspec validate contratos-relleno-huecos --type change --strict --no-interactive` → válido.
- Artefactos a leer:
  - `proposal.md`, los dos specs, `design.md` y `tasks.md`.
  - `PLAN.md` §8, §10.1, §10.8 y §12 (Flujo C).
  - `openspec/specs/{contratos-canales,contratos-consultas,tiempo-real,politica-identidad,simulador-whatsapp}/spec.md`.
  - `docs/contratos.md`, `AGENTS.md` §7 y `docs/trabajo-paralelo.md`.
- Tareas pendientes: 1.1–3.1 de `tasks.md`.
- Restricciones:
  - Solo los archivos de `proposal.md` (Impact). Sin lógica de núcleo, API ni pantallas.
  - Sin datos de pacientes en `HuecoVista` ni en el dato de `wa:mensajes` más allá del `waId` de la sala.
  - Evidencia en la carpeta del cambio. No crear commits sin autorización.
- Criterios de aceptación: requisitos y escenarios de los deltas de `contratos-canales` y `contratos-consultas`; `main` sigue compilando y en verde.
- Validaciones requeridas: 1.1 en rojo y control final 3.1, incluido `pnpm test:integracion` con Docker.
- Detener la parte afectada si:
  - el frente A cambia D2 o D3;
  - el cambio de predicción del frente A se integra antes y choca en archivos compartidos: rebase y resolver sin cambiar el alcance.
- Siguientes cambios previstos (no autorizados aquí):
  - frente A: núcleo y API del relleno de huecos;
  - frente B: pantallas (`/app` cancelar con aprobación, `/wa` mensajes salientes, `/admin` panel de huecos).
- Autorización de cierre: PENDIENTE (ambos frentes).
