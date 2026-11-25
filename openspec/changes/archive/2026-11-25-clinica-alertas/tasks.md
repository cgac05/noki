# Tasks

Requisitos: AC = `atencion-clinica`, TR = `tiempo-real`, CQ = `consultas-api`. Decisiones: D1–D6 de `design.md`.

## 1. Dominio y aplicación

- [x] 1.1 Agregar `Tramite.actualizarTurno(posicion, contexto)` (D3). Requisito: AC «Cerrar la atención y avanzar la fila». Verificación: pruebas de dominio de `actualizarTurno`: exige `EN_CLINICA` y no registra nada si la posición no cambia.
- [x] 1.2 Agregar `CasosTramite.cerrarAtencion` con la regla `SOLO_RECEPCION` (D1) y el avance de la fila (D3), y `filaSede` en el repositorio de trámites, en memoria y en Postgres. Requisitos: AC «Cerrar la atención y avanzar la fila» y «Fila de la sede». Verificación: pruebas de aplicación de estos escenarios:
  - «Cerrar al primero»;
  - «Cerrar a quien terminó antes»;
  - fuera de recepción: regla `SOLO_RECEPCION` y el trámite no cambia;
  - un fallo simulado al guardar un `TurnoActualizado` registra `TURNO_NO_ACTUALIZADO` y no cambia la respuesta.

## 2. Lecturas, API y tiempo real

- [x] 2.1 Agregar `posicion` a `llegadasSede` y `alertasSeguridad` a `LecturasPort` en memoria y Postgres (D3, D5). Requisitos: AC «Fila de la sede» y «Alertas de seguridad»; CQ «Contenido de cada consulta». Verificación: batería compartida del puerto de lectura con «Posiciones por orden de llegada», «Límite de 50» y «Sin intentos», contra memoria y Postgres.
- [x] 2.2 En `rutasComandos.ts`, traducir `CerrarAtencion` y dejar `ComprobarIdentidad` con su respuesta 404 actual (D2). En `rutasConsultas.ts`, registrar `alertasSeguridad`. Verificación:
  - adaptar la prueba de `tests/unit/contratos.test.ts` que esperaba 404 para `CerrarAtencion`; la de `ComprobarIdentidad` sigue igual;
  - pruebas HTTP en memoria de «Cita sin llegada» y de «Bloqueo tras tres fechas equivocadas», con la respuesta validada con el contrato y sin teléfono ni fecha.
- [x] 2.3 Emitir `sede:fila` según D4 en `apps/api/src/tiempoReal.ts`. Requisito: TR «Emisión en tiempo real desde los eventos publicados». Verificación: pruebas de tiempo real con «Llegada a la sede» (posición 1) y «Fila después de cerrar una atención».

## 3. Controles

- [x] 3.1 Punto de control: `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test` y `corepack pnpm test:integracion` en verde, con Postgres de prueba en 55432 y Redis. Guardar resultados en `evidencias/`, sin rutas locales, junto con un manifiesto de archivos que confirme que no se tocó ningún archivo compartido (D6).
- [x] 3.2 Recorrido con la API real y `DEMO_MODE=true`, por HTTP (las pantallas de B todavía no existen):
  1. confirmar dos citas en Tepic y registrar las dos llegadas;
  2. `CerrarAtencion` en la primera;
  3. comprobar `llegadasSede` (la segunda en posición 1);
  4. provocar tres fechas equivocadas en `/wa` y comprobar `GET /api/admin/alertas`.

  Guardar la transcripción sin datos personales en `evidencias/`.
