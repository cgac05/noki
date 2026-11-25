# Proposal

## Why

El 2026-11-25 Christian inició en `/callcenter` una llamada desde el 3112111821, el paciente se identificó por CURP y el asesor pulsó «Cerrar atención (llamada cortada)». Al abrir «Abrir WhatsApp» (o su QR), el simulador `/wa` conversa desde el número de la paciente de demo (5210000000001), no desde el de la llamada: «ahí no conoce el número».

Causa: el enlace del call center es `/wa?continuar=<código>`, sin número, y `/wa` arranca siempre con `CONTACTO_DEMO` (`apps/web/src/vistas/Wa.tsx`). El trámite se retoma por el código, pero la conversación queda en otro número.

## What Changes

- El enlace y el QR de continuación del call center llevan el número de la llamada (ANI): `/wa?continuar=<código>&numero=<ANI>`.
- `/wa` usa ese `numero` (si cumple el patrón de 10 a 15 dígitos) antes de enviar `CONTINUAR <código>` y retira ambos parámetros de la URL. Sin `numero` válido se conserva el comportamiento actual.

### Fuera de alcance
- API, núcleo y contratos: no cambian.
- Enlaces de `/web` y `/app` (no conocen un ANI).

## Capabilities

### Modified Capabilities
- `consolas-internas`: «Continuar por WhatsApp con consentimiento» incluye el número de la llamada en el enlace.
- `simulador-whatsapp`: «Continuación por enlace» acepta el número.

## Impact
`apps/web/src/vistas/CallCenter.tsx`, `apps/web/src/vistas/Wa.tsx` y sus pruebas (`consolas.test.tsx`, `wa.test.tsx`). Esos archivos de call center tienen cambios sin commit de `web-sesion`: se trabaja encima sin revertirlos.
