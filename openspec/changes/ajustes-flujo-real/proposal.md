# Proposal

## Why

El primer recorrido real del Flujo A (`PLAN.md` §12, 2026-11-24, `main` `f0d8e70`, web con `VITE_API=real` y API con `DEMO_MODE=true`) terminó de punta a punta, pero dejó dos fallas del frente B que el modo simulado no mostraba:

- **B1 (paso 1, call center)**: el catálogo real tiene 4 servicios × 3 sedes, y los botones solo dicen «Cotizar paquete en <sede>». Aparecen 12 botones con 3 textos repetidos, y el asesor no puede saber qué servicio cotiza.
- **B2 (paso 3, app)**: en la misma pestaña, después de confirmar en `/wa`, `/app` dice «sin contexto» hasta pulsar «Actualizar». La web guardó el `contextoDemo` vacío de antes, sin caducidad, y las respuestas de WhatsApp no refrescan las lecturas.

## What Changes

- **Cotización desde el catálogo**: cada botón de cotizar del call center nombra el servicio, la sede y el precio de su oferta, tal como vienen del catálogo, sin agrupar, filtrar ni ordenar.
- **Contexto al día en modo real**:
  - Al abrir una vista que necesita contexto, `contextoDemo` se vuelve a consultar.
  - Cada respuesta exitosa de WhatsApp refresca las lecturas de la pestaña, igual que ya hacen los comandos.
  - Así, `/app`, `/clinica` y `/admin` muestran la cita recién confirmada sin pulsar «Actualizar».

### Fuera de alcance

- Las fallas del frente A del mismo recorrido, que se le entregaron aparte:
  - A1: horarios a medianoche y sin día.
  - A2: textos crudos del bot («· callcenter», «CONSENTIMIENTO», «Elige una opción.»).
  - A3: una llamada nueva del mismo número reutiliza un hilo en solo lectura.
- Las observaciones sin falla: la ficha muestra los trámites abandonados del hilo, y recargar `/callcenter` pierde la llamada (por diseño de `consolas-internas`).
- Cambios en contratos, API o archivos compartidos.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `consolas-internas`: requisito nuevo «Cotización desde el catálogo».
- `cliente-api-canales`: «Contexto de consulta en modo real» exige refrescar el contexto al abrir una vista y tras las respuestas de WhatsApp.

## Impact

- Archivos del frente B: `apps/web/src/vistas/CallCenter.tsx`, `apps/web/src/cliente/{ProveedorCliente.tsx,historialWa.ts}` (o el punto donde se reciben las respuestas de WhatsApp) y sus pruebas.
- Sin dependencias nuevas ni cambios en contratos o archivos compartidos.
- Verificación: pruebas con `ClienteReal` y `fetch` falso, y repetir los pasos 1 y 3 del recorrido real con la API de `main` en local.
- Riesgo: refrescar las lecturas tras cada mensaje de WhatsApp genera más peticiones. Es aceptable para la demo, igual que la invalidación por eventos que ya existe.
- Responsable: frente B, `LuisMaster119`.
