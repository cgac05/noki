# Tasks

Requisitos: WA = `canal-whatsapp`, AS = `agenda-simulada`. Decisiones: D1–D6 de `design.md`. Para validar OpenSpec en esta PC: `npx --offline @fission-ai/openspec@1.14.0 validate wa-una-pregunta --type change --strict --no-interactive` (el comando `openspec` no está en PATH).

## 1. Folios de sd-mock

- [x] 1.1 Escribir en rojo la prueba del escenario AS «Folios distintos entre arranques» y «Arranques separados por un segundo» (reloj inyectado en `crearSdMock`) y después implementar D5. Verificación: la prueba pasa; las pruebas existentes de `sd-mock` siguen en verde.

## 2. Día y hora

- [x] 2.1 Escribir en rojo, en memoria (`tests/unit/api/`), los escenarios WA «Varios días para elegir», «Día sin horarios restantes», «Elegir otro día», «Más horarios y regreso a los días» y «Horario en la zona de la sede», con el reloj fijo. Guardar la salida en `evidencias/01-rojo.txt`.
- [x] 2.2 Implementar D1 en `ConversacionWa` (acciones `dia`, `paginaHora`, `otroDia`; `estado.dia` y `estado.paginaHora`; textos nuevos en `textosWa.ts`). Verificación: 2.1 en verde y las pruebas existentes de WhatsApp adaptadas solo en el paso de horario (elegir día antes de la hora).

## 3. Datos uno por uno

- [x] 3.1 Escribir en rojo los escenarios WA «Sin CURP», «Registro completo sin CURP», «Sexo y entidad como opciones» y «Respuesta inválida en un campo».
- [x] 3.2 Implementar D2–D4 en `identificacionWa.ts`, `ConversacionWa.ts` y `textosWa.ts` (`nombreEntidad` para las 33 claves de `ENTIDADES_NACIMIENTO`). Verificación: 3.1 en verde; una prueba comprueba que `nombreEntidad` cubre todas las claves y que ningún título de fila contiene una clave de dos letras.

## 4. Confirmación

- [x] 4.1 Implementar D6 con la prueba del escenario WA «Agenda externa caída al confirmar» (memoria con fallo forzado o `sd-mock` con `fallarSiguientes`).
- [x] 4.2 Agregar en `tests/integracion` el escenario WA «Registro nuevo concluye después de reiniciar sd-mock» (Postgres con una cita confirmada de un `sd-mock` anterior, `sd-mock` nuevo, número nuevo sin CURP). Verificación: pasa con el Postgres de prueba en 55432 y falla si se revierte 1.1.

## 5. Controles

- [x] 5.1 `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test` y `corepack pnpm test:integracion` en verde, en serie. Guardar los resultados en `evidencias/`, sin rutas locales ni datos personales.
- [x] 5.2 Recorrido manual contra la API real (`DEMO_MODE=true`): número nuevo, sin CURP, día distinto de mañana, hasta «Cita confirmada». Guardar la secuencia de mensajes del bot (sin valores capturados) en `evidencias/05-recorrido.json`.
