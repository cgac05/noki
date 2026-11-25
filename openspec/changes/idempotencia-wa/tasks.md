# Tasks

Requisitos: WA = `canal-whatsapp`, PT = `persistencia-tramites`. Decisiones: D1–D2 de `design.md`.

## 1. Paridad en memoria

- [x] 1.1 Agregar el modo estricto `{ claveUnica: true }`, con un conjunto de claves compartido, a `TramiteRepoMemoria` y `EventosSinTramiteMemoria`, y activarlo en `crearApiPruebas` (D2). Requisito: PT «Clave de idempotencia única también en memoria». Verificación:
  - prueba del escenario «Clave repetida en memoria», en rojo antes y en verde después;
  - `corepack pnpm test` en verde, corrigiendo solo las pruebas que repitan claves por su cuenta.

## 2. WhatsApp

- [x] 2.1 Escribir en rojo la prueba HTTP en memoria del escenario «Paciente asignado desde el call center». Con 1.1 debe fallar con 500 antes de 2.2. Guardar la salida en `evidencias/01-rojo.txt`.
- [x] 2.2 Implementar `contextoOperacion()` en `ConversacionWa` y usarlo en todas las llamadas a `casos` del mensaje (D1). Requisito: WA «Varias operaciones en un mismo mensaje». Verificación: la prueba de 2.1 en verde, con claves distintas en `PreparacionAceptada` y `HorarioReservado`, y el escenario «Reintento del mismo mensaje».
- [x] 2.3 Agregar la misma prueba en `tests/integracion`, contra Postgres y `sd-mock`. Verificación: pasa con el Postgres de prueba en 55432.

## 3. Controles

- [x] 3.1 Punto de control: `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test` y `corepack pnpm test:integracion` en verde. Guardar los resultados en `evidencias/`, sin rutas locales.
