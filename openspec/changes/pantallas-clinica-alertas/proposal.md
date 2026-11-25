# Proposal

## Why

`contratos-clinica-alertas` (cambio compartido, autorizado por ambos frentes el 2026-11-24) agregó al contrato `CerrarAtencion`, la posición en `LlegadaVista` y la consulta `alertasSeguridad`. `clinica-alertas` (frente A, en `main` `71f01f5`) los implementa en el núcleo y la API:

- cerrar la atención avanza la fila;
- la posición se actualiza en vivo con `sede:fila`;
- `GET /api/admin/alertas` devuelve los últimos 50 intentos fallidos, con `bloqueado: true` en el tercero.

Falta la parte del frente B: que recepción vea la fila y cierre la atención en `/clinica`, y que el tablero de `/admin` muestre las alertas de seguridad (`PLAN.md` §9). Es el alcance «clínica y alertas» elegido por `LuisMaster119` para el primer extra de `PLAN.md` §11.

**Revisión 2 (2026-11-25)**: los frentes acordaron que en clínica basta el QR firmado. `ComprobarIdentidad` no se implementa y el cambio compartido `documentacion-compartida` lo quita del contrato. Por eso esta revisión elimina «INE verificada» y su paso del guion.

## What Changes

- **Clínica, fila de atención**: cada llegada registrada muestra su turno («Turno 1», «Turno 2»…) a partir de `posicion`, en el orden en que llega de la lectura. La fila se actualiza en vivo con la sala de la sede, que ya existe.
- **Clínica, «Cerrar atención»**: cada llegada registrada ofrece «Cerrar atención», que envía `CerrarAtencion`. La cita sale de la lista y la fila se recorre según la lectura nueva.
- **Administración, alertas de seguridad**:
  - El tablero agrega «Alertas de seguridad» con la lista de `alertasSeguridad`, en el orden recibido: canal, hora, intentos y la marca «Bloqueado» cuando corresponde.
  - Tiene estado vacío y se refresca en vivo con la sala `admin`, que ya existe.
  - No muestra datos personales.
- **Guion simulado**: un paso nuevo al final del Flujo A, «Atención cerrada», con `AtencionCerrada` en clínica. La lectura de alertas sigue vacía en simulado.

### Fuera de alcance

- «INE verificada» y cualquier uso de `ComprobarIdentidad` (revisión 2).
- Los cambios de contrato, núcleo y API: son de `contratos-clinica-alertas`, `clinica-alertas` y `documentacion-compartida`.
- Selector de hilos, cola de fallidos, embudo, panel de huecos, demás KPIs y el botón «adelantar reloj» (cambio de documentación del frente A).
- Escanear el QR con cámara.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `consolas-internas`: requisitos nuevos «Fila de atención en clínica», «Cierre de atención en clínica» y «Alertas de seguridad en el tablero».
- `cliente-api-canales`: «Guion simulado del Flujo A» agrega el paso final de atención cerrada en clínica.

## Impact

- Archivos del frente B: `apps/web/src/vistas/{Clinica,Admin}.tsx`, componentes en `apps/web/src/componentes/`, `apps/web/src/cliente/mock/guionFlujoA.ts`, pruebas y `apps/web/README.md`.
- Sin dependencias nuevas ni cambios en contratos o archivos compartidos.
- La revisión 1 ya está implementada (sin commit). La revisión 2 retira lo de «INE verificada»: botón, diálogo `ConfirmarIne`, paso `INE_VERIFICADA` del guion y sus pruebas. Así la web no usa `ComprobarIdentidad` cuando `documentacion-compartida` lo quite del contrato.
- La verificación en modo real usa `main` `71f01f5`, que ya trae `clinica-alertas`.
- Responsable: frente B, `LuisMaster119`.
