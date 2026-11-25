# Propuesta: web-modo-real

## Why

Con `VITE_API=real`, `/web` solo muestra «Esta consulta aún no está disponible en la API»: pide la consulta `web` y el trámite `demo.ids.tramiteWebId`, que existen únicamente en el cliente simulado. El reto se presenta con tres canales (WhatsApp, web y clínica) y la web es la entrada del Flujo B (PLAN.md §278, §403). Además, `/clinica` firma todos sus comandos como `recepcion:tepic` aunque la cita sea de otra sede, y la línea de tiempo registra una recepción equivocada.

## What Changes

- `/web` en modo real usa solo consultas y comandos ya publicados en `@noki/contracts`: `catalogo` para elegir servicio y sede, `IniciarTramite` (`AGENDAR`, canal `web`, actor `paciente`), `SeleccionarServicio`, `SeleccionarSede` y `SolicitarContinuacion` (`destino: whatsapp`). Muestra el precio del catálogo y el código de continuación con el enlace `/wa?continuar=<código>` y su QR, igual que `/callcenter`.
- El modo simulado de `/web` sigue funcionando como hoy.
- Núcleo (revisión 2): `CasosTramite.solicitarContinuacion` admite también canal `web` con actor `paciente`; sigue rechazando cualquier otra combinación con `CONTINUACION_SOLO_ASESOR`. `LecturasComandosPostgres.datosContinuacion` devuelve el `canalOrigen` real del trámite y el método `TOKEN_WEB` cuando el origen es `web` (`TOKEN_CC` si es `callcenter`).
- `/clinica` usa como actor `recepcion:<sedeId>` de la cita que atiende, en lugar del texto fijo `recepcion:tepic`.
- `docs/trabajo-paralelo.md` registra la decisión de Christian (2026-11-25) de trabajar como frente único hasta la entrega.

## Fuera de alcance

- Agendar hasta confirmar en `/web` (sigue siendo cotizar y continuar por WhatsApp).
- Cambios en `packages/contracts` o `apps/api`, y en el núcleo más allá de los dos puntos de la revisión 2. Si hacen falta, detener y avisar.
- `/app`, `/wa` y el cambio en curso `wa-una-pregunta`.

## Impact

- `apps/web/src/vistas/Web.tsx`, `apps/web/src/componentes/LlegadaClinica.tsx`, sus pruebas y, si hace falta, `apps/web/src/cliente/demo.ts` o el cliente simulado.
- `packages/application/src/CasosTramite.ts`, `packages/adapters/out-postgres/src/LecturasComandosPostgres.ts` y sus pruebas.
- `docs/trabajo-paralelo.md` (una nota).
