# Proposal

## Why

Christian (2026-11-25, hilo del proyecto), al pasar de la app a WhatsApp y ver historiales distintos: «pongamos entonces como en WhatsApp en el mensaje la hora de envío en la esquina». Hoy las burbujas del chat (`/wa` y el asistente de web, app y call center) no muestran cuándo se envió cada mensaje, así que no se distingue lo viejo de lo nuevo.

## What Changes

- Cada entrada del historial del chat guarda `enviadoEn` (fecha y hora ISO del navegador) al crearse: la burbuja del usuario al enviar y cada mensaje del bot al recibirse.
- Cada burbuja muestra la hora (HH:MM, 24 h, hora local del navegador) en la esquina inferior derecha, en texto pequeño y atenuado, como en WhatsApp.
- Las entradas guardadas antes del cambio (sin `enviadoEn`) se siguen leyendo y se muestran sin hora.

### Fuera de alcance
API, contratos y reloj de demo (se usa la hora del navegador). Sincronizar el historial entre pestañas o enviar «Hola» al abrir `/wa`.

## Capabilities

### Modified Capabilities
- `simulador-whatsapp`: requisito nuevo «Hora de envío en cada mensaje».

## Impact
`apps/web/src/cliente/historialWa.ts` (esquema y creación de entradas), `apps/web/src/componentes/ChatWa.tsx`, `apps/web/src/styles.css` y pruebas. Ninguna dependencia nueva.
