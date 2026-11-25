# Tasks

Requisitos: MN = `continuidad-canales` «Mismo número retoma una cita en proceso en cualquier canal»; LC = `canal-whatsapp` «Continuación tras llamada cortada». Decisiones D1–D4 (revisión 2).

- [x] 0.1 H-01 de `web-sesion`: corregir solo la prueba `tests/unit/nucleo/casosTramite.test.ts:655` (campos admitidos por `DatosDeclarados`).
- [x] 1.1 En rojo: escenarios de MN para WhatsApp (sin botón, con prefijo, confirmada no, sin vínculo y sin datos del paciente) en memoria (`tests/unit/`) y uno en integración Postgres (`tests/integracion/`). Evidencia en `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar D1, D2 y D4 (dominio, `CasosTramite`, `ConversacionWa`, contactos memoria/Postgres, `docs/eventos.md`, excepción en `PLAN.md §8` y `AGENTS.md §8`). Verificación: 1.1 en verde; pruebas existentes de llamada entrante, llamada cortada y continuidad en verde.
- [x] 2.1 En rojo y luego en verde: «Web tras llamada cortada» (D3: contrato `sesionWebDemo`, lecturas memoria/Postgres, ruta, `Web.tsx`, cliente simulado).
- [x] 3.1 Controles en serie: `vitest run --project unitarios --project web`, integración de los archivos tocados con `node --import tsx tests/integracion/ejecutar.ts` (base de prueba en 55432), `eslint` y `tsc` de los paquetes tocados (incluido `tests/tsconfig.json`), `lint:deps`. Si el sandbox lo bloquea (`EPERM`), anotarlo: el revisor los corre.

Revisión 3 (D3 asistente en /web, D5 call center):

- [x] 4.1 En rojo y luego en verde: escenarios «Web tras llamada cortada» y «Web con horario apartado» (MN) con el asistente dentro de `/web` (`Web.tsx`: «Continúa donde lo dejaste» ya no envía `SolicitarContinuacion`; muestra `ChatWa` con el teléfono de la sesión y envía «Hola» una vez; «Volver»).
- [x] 4.2 En rojo y luego en verde: escenarios de `consolas-internas` «Completar la cita desde el call center» (`CallCenter.tsx`).
- [ ] 4.3 Controles en serie: `vitest run --project web`, `eslint`, `tsc --noEmit` de `apps/web`. No tocar `ChatWa.tsx`.

Evidencia de 4.1 y 4.2 en [rojo](evidencias/18-r3-rojo.txt) y [verde](evidencias/19-r3-verde.txt).

La tarea 4.3 queda pendiente. ESLint y TypeScript pasan. Vitest web tiene un fallo al reabrir un formulario en `/wa`, reproducido con las vistas de `HEAD` y el `ChatWa.tsx` del trabajo paralelo. [Suite web](evidencias/20-r3-vitest.txt) · [ESLint](evidencias/21-r3-eslint.txt) · [TypeScript](evidencias/22-r3-tsc.txt) · [Reproducción](evidencias/23-r3-flow-base.txt).
