# Revisión: simulador-wa

- Dictamen: PASS
- Revisión inspeccionada: rama `feat/simulador-wa`, HEAD `36b6cf8`, con el diff pendiente sin commit entregado por Codex en `implementacion.md` (manifiesto `evidencias/04-archivos-entregados.json`). Revisado el 2026-11-24.
- Cobertura: requisitos y escenarios de `specs/simulador-whatsapp`, deltas de `navegacion-canales` (Contenido mínimo por vista y sus cinco escenarios) y `cliente-api-canales` (Modo simulado visible, Idempotencia de los mensajes de WhatsApp, Guion simulado del Flujo A, Tipos de demo aislados); design D1–D8; tareas 1.1–4.4. Archivos: `cliente/{historialWa.ts,useConversacionWa.ts,ClienteApi.ts,ProveedorCliente.tsx,demo.ts,consultas.ts,useAccion.ts}`, `cliente/mock/{ClienteMock.ts,guionFlujoA.ts}`, `cliente/real/ClienteReal.ts`, `componentes/{ChatWa,HojaOpciones,ModalFlow,MensajeBot,QrCita,Layout,BarraDemo}.tsx`, `vistas/{Wa,CallCenter}.tsx`, `vite.config.ts`, `index.html`, `styles.css` (por encima), `README.md` y las pruebas nuevas o modificadas.
- Autorización y alcance:
  - Hashes actuales de `proposal.md`, `design.md` y los tres specs coinciden con la revisión 2 autorizada.
  - `tasks.md` difiere (`2a04ccda31f0`) solo por el reparto de 1.2/2.4/3.1/3.3 registrado en `handoff.md` con la conformidad de `LuisMaster119`, y por las casillas marcadas. No cambia requisitos, criterios ni decisiones.
  - `git status` fuera de `apps/web/**` y de la carpeta del cambio: vacío. No se modificó `packages/contracts` ni ningún archivo compartido. No hay commits nuevos.
- Evidencia comprobada independientemente (Claude, 2026-11-24, en este checkout):
  - `pnpm lint` → código 0.
  - `pnpm lint:deps` → código 0; 155 módulos / 403 dependencias, sin violaciones.
  - `pnpm test` → código 0; 34 archivos, 177/177 pruebas.
  - `VITE_API=mock pnpm --filter @noki/web build` → código 0; 246 módulos, JS 444.45 kB / gzip 138.97 kB. Persisten los avisos de `"use client"` de React Query, que no bloquean.
  - `pnpm --filter @noki/web build` sin `VITE_API` → código 1 con "Define VITE_API=mock o VITE_API=real antes de compilar producción." (fallo intencional del escenario "Producción sin modo explícito").
  - `openspec validate simulador-wa --type change --strict --no-interactive` → válido.
  - Búsqueda en `apps/web/src` (sin pruebas): ningún `console.*`, `localStorage` ni `indexedDB`. Búsqueda de rutas locales en `evidencias/`: ninguna.
  - Lectura del código frente a cada requisito:
    - Almacén redactado con proyección explícita (`historialWa.ts:110-116`) y bloqueo síncrono antes del primer `await` (`historialWa.ts:58-68`).
    - Clave UUID por mensaje reutilizada en el reintento; `ClienteReal` valida la clave como UUID.
    - Los valores del Flow solo viven en el estado del modal y en el pendiente en memoria; nunca pasan por `useAccion` ni por TanStack Query. Se descartan al cerrar o desmontar el modal.
    - El enlace `?continuar=` se envía una vez (`Set` en memoria) y se retira con `navigate(..., { replace: true })`.
    - `<meta name="referrer" content="no-referrer">`; insignia textual en modo `mock`.
    - Call Center muestra enlace y QR sin enviar nada.
    - El mock avanza por `CONTINUAR <código>` y por un `flowResponse` con los requeridos no vacíos, sin repetir valores.
    - Sin rastro de `conversacion` en el módulo de demo ni en el mock.
  - Pruebas leídas: escenarios nombrados en `historialWa.test.tsx`, `idempotenciaWa.test.ts`, `wa.test.tsx`, `flow.test.tsx`, `guionWa.test.ts`, `conversacion.test.tsx`, `configuracion.test.ts`, `cliente.test.ts` ("Continuidad simulada", "Fuera del guion") y el recorrido de `vistas.test.tsx`. El recorrido conserva sus comprobaciones previas y ahora pasa por el enlace, la hoja de opciones y el Flow, con la fecha ausente del DOM. La prueba de privacidad espía las cinco funciones de `console`, `sessionStorage`, `localStorage` y la `MutationCache`.
  - Evidencia de Codex (no repetida): fallos previos por grupo (`0x-rojo.txt`), recorridos en navegador 4.1 y 4.2 (JSON y capturas). Se inspeccionaron `04-flow-375.jpg` y `04-chat-375.jpg`: modal centrado con campo enmascarado y botón "Mostrar"; en el chat, solo "Fecha de nacimiento ••••"; sin desplazamiento horizontal de la página.
- Controles no ejecutados:
  - Recorrido manual en navegador (4.1, 4.2): no repetido por Claude. Se acepta la evidencia de Codex, la inspección de capturas y el recorrido automatizado equivalente. El foco atrapado se cubre además con la prueba de Tab/Shift+Tab.
  - `pnpm install --frozen-lockfile`: no repetido; no hay cambios en `package.json` ni en el lockfile.
  - `pnpm test:integracion`: NO APLICA (solo cambia `apps/web`, sin API ni infraestructura).

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | SUGGESTION | Datos del Flow protegidos / D1 | `cliente/historialWa.ts:25` y `:125`: cada valor del `flowResponse` se sustituye con `replaceAll` en el texto de las respuestas del bot. Un valor corto (p. ej. un PIN `12`) alteraría texto legítimo como `12:15`. | Opcional: limitar la sustitución a coincidencias de palabra completa o a valores con longitud mínima. Hoy protege de más, no de menos; no afecta la aceptación. |
| H-02 | SUGGESTION | Historial redactado | `cliente/historialWa.ts:24`: `/\bCONTINUAR\s+\S+/` en mensajes del bot redacta cualquier palabra que siga a "CONTINUAR" (p. ej. "escribe CONTINUAR seguido de…"). | Opcional: restringir el patrón al formato del token cuando el núcleo lo fije. Cosmético. |
| H-03 | SUGGESTION | Continuación por enlace | `cliente/historialWa.ts:73` y `vistas/Wa.tsx:17`: si hay un envío en curso al abrir el enlace, `continuar` no envía y la URL igual se limpia, así que el código se pierde sin aviso. En el uso real (pestaña nueva) no ocurre. | Opcional: avisar o reintentar al terminar el envío en curso. |

- Riesgos residuales (no bloquean):
  - En modo mock, recargar la pestaña reinicia el guion, pero el historial redactado persiste por diseño. Las opciones antiguas siguen activas y responden con ayuda. El README lo documenta ("antes de repetir el ensayo, reinícialo").
  - "Reiniciar guion" vacía solo el historial del número activo, lo mismo que "Nueva conversación", como exige el spec. Otros números quedan en la sesión de la pestaña.
  - Sigue pendiente el orden de integración acordado: `contratos-flujo-a` primero, luego rebase y ajustes en `apps/web` (ficha nullable, `contextoDemo`). En la integración, el frente A debe aceptar `CONTINUAR <código>`, `flowResponse` e `Idempotency-Key` en `POST /api/canales/wa/mensajes`.
  - Mensajes iniciados por la empresa: fuera de alcance, previstos en `mensajes-salientes`.
- Condiciones para recomendar el cierre: cumplidas. No hay hallazgos CRITICAL ni WARNING. Las sugerencias H-01 a H-03 son opcionales y no condicionan el cierre.
- Próximo responsable: `LuisMaster119` (frente B). Decide si autoriza cerrar `simulador-wa` con esta revisión (sincronizar specs y archivar) o si pide a Codex atender alguna sugerencia antes. La autorización de cierre sigue PENDIENTE en `handoff.md`.
