# Proposal

## Why

El contrato del relleno de huecos (`contratos-relleno-huecos`, archivado el 2026-11-25) ya define `wa:mensajes`, la sala `wa:<waId>`, `HuecoVista` y `panelHuecos`, pero ninguna pantalla los usa. El Flujo C de `PLAN.md` §12 necesita que Ana cancele en `/app`, que Beto reciba la oferta en `/wa` y que `/admin` muestre el panel de huecos y sus KPI (§10.1 y §10.8). El frente B lo prepara ahora, en paralelo con el núcleo del frente A, sobre el cliente simulado, para que la integración con `VITE_API=real` solo cambie el modo.

## What Changes

- `/app`: botón «Cancelar cita» en cada cita `CONFIRMADA`, con confirmación en la propia vista. Envía `CancelarCita` (canal `app`, actor `paciente`) con el trámite de la cita. La API lo rechaza con `STEP_UP_REQUERIDO` mientras espera la aprobación por WhatsApp; la vista lo muestra como «pendiente de aprobar en WhatsApp», no como error.
- `/wa`: muestra en el historial los mensajes que inicia la empresa (`wa:mensajes`) para los números de la sesión, aunque lleguen mientras se ve otra vista u otro número, y avisa cuando otro número de la sesión recibió mensajes nuevos. Los botones de esos mensajes se responden con `payloadBoton`, igual que los demás.
- `/admin`: sección «Panel de huecos» con `panelHuecos` (servicio, sede, fecha en la zona de la sede, estado y sus ofertas en el orden recibido) y etiquetas en español para las cuatro claves de KPI del relleno de huecos documentadas en `docs/contratos.md`.
- Cliente simulado: un segundo guion, el Flujo C, elegible desde la barra de demo junto al Flujo A, con Ana (`5210000000001`) que cancela y aprueba, Beto (`5210000000002`) que recibe y acepta la oferta, y el efecto dominó en el panel. Carla (`5210000000003`) es el tercer número de demo que escucha `/wa`, por la oleada del frente A.
- Sin cambios en `packages/contracts` ni en archivos del frente A.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `simulador-whatsapp`: nuevo requisito para los mensajes que inicia la empresa y el aviso de mensajes en otro número de la sesión.
- `consolas-internas`: nuevo requisito para el panel de huecos en `/admin`.
- `navegacion-canales`: nuevo requisito para cancelar una cita desde `/app`.
- `cliente-api-canales`: nuevo requisito para el guion simulado del Flujo C y su selección desde la barra de demo.

## Impact

- Archivos del frente B, todos en `apps/web/src`: `vistas/{App,Wa,Admin}.tsx`, `componentes/BarraDemo.tsx`, `cliente/{historialWa.ts,ProveedorCliente.tsx,demo.ts}`, `cliente/mock/{ClienteMock.ts,guionFlujoA.ts}`, un guion nuevo `cliente/mock/guionFlujoC.ts`, componentes nuevos si hacen falta y sus pruebas.
- Sin archivos compartidos ni del frente A. Sin dependencias nuevas.
- Dependencias del frente A, que no bloquean el modo simulado:
  - su cambio del núcleo (`relleno-huecos`) para probar en modo real: la ruta `GET /api/admin/huecos`, la emisión de `wa:mensajes` y el cálculo de los KPI;
  - su diseño `relleno-huecos` revisión 3 (`c7650ad`), del que salen los textos del guion (D6), la respuesta 403 a `CancelarCita` y el requisito de `DEMO_MODE=true` para los botones (D13).
- Base: la rama sale de `feat/contratos-relleno-huecos` (`d37b8c2`) porque esos contratos aún no están en `main`. Se hace rebase sobre `main` en cuanto se integre.
- Responsable: frente B (`LuisMaster119`). Implementa Codex del frente B.
