# Proposal

## Why

`PLAN.md` §14 regla 13 pide que los temporizadores del demo se puedan acelerar con un endpoint o botón «adelantar reloj», solo en modo demo, y §10.2 lo usa para mostrar los recordatorios en vivo.

El frente A ya integró la API y el contrato en `main` (`44c57f4`, specs `reloj-demo` y `temporizadores-tramite`):

- `POST /api/demo/reloj` con `{ adelantarMinutos }` (1 a 10 080), que responde `{ ahora }` y ejecuta los temporizadores vencidos;
- esos temporizadores son el vencimiento del hold, la inasistencia y la expiración por inactividad.

La web todavía no lo usa, así que en la demo no hay forma de mostrar esos efectos sin esperar minutos u horas.

## What Changes

- **Cliente**: una operación «adelantar reloj» que valida la entrada y la respuesta con `AdelantarRelojSchema` y `RespuestaRelojSchema`, y llama a la ruta de `RUTA_RELOJ_DEMO`. Solo existe en el cliente real con `VITE_DEMO=true`; el simulado no la ofrece.
- **`/admin`, sección «Reloj de demo»**:
  - botones rápidos (+15 min, +1 h, +1 día, +1 semana) y un campo de minutos exactos;
  - muestra la hora del sistema que devuelve la API;
  - envía una sola vez aunque se pulse dos veces y refresca el tablero al terminar;
  - solo aparece cuando el cliente ofrece la operación.

### Fuera de alcance

- Cambios en contrato, API o temporizadores: ya existen.
- Reiniciar la demo desde la web (`/api/demo/reset`) y consultar la hora sin adelantarla: no hay contrato para eso.
- Recordatorios (`PLAN.md` §10.2): cuando existan, usarán este mismo botón sin cambios aquí.
- Reloj en el guion simulado: no tiene temporizadores.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `cliente-api-canales`: requisito nuevo «Reloj de demo en el cliente».
- `consolas-internas`: requisito nuevo «Reloj de demo en el tablero».

## Impact

- Archivos del frente B: `apps/web/src/cliente/{ClienteApi.ts,real/ClienteReal.ts}`, `apps/web/src/vistas/Admin.tsx`, un componente nuevo en `apps/web/src/componentes/`, pruebas y `apps/web/README.md`.
- Sin dependencias nuevas ni cambios en contratos o archivos compartidos.
- Verificación real: con la API de `main` (`DEMO_MODE=true`). La semilla usa un hold de 10 min, así que apartar un horario en WhatsApp y adelantar 15 min debe mostrar `ReservaExpirada` en `/admin` sin recargar.
- Riesgo: adelantar el reloj es irreversible en la base de demo. Se mitiga con el candado contra doble envío y avisando en la sección que afecta a toda la demo; para volver atrás está `pnpm demo:reset`.
- Responsable: frente B, `LuisMaster119`.
