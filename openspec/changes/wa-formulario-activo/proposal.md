# Proposal

## Why

Christian (2026-11-25, `/wa` con el 3112111830): «ya di mi curp, porque puso eso, no lee el apellido materno». Claude lo reprodujo en el navegador. Cuando el bot manda un formulario (CURP o apellido materno) seguido de su alternativa en botones («No la tengo» / «No tengo»), «Abrir formulario» queda deshabilitado y no responde. Así, la única salida es la alternativa: el paciente quedó registrado sin CURP y sin apellido materno.

Causa: `apps/web/src/componentes/ChatWa.tsx` habilita un Flow solo si es el último mensaje interactivo del bot, y los botones de alternativa llegan después en la misma respuesta. La API guarda bien ambos datos (comprobado con tres simulaciones directas).

## What Changes

- En `/wa`, todos los mensajes interactivos de la última respuesta del bot (los que llegaron después del último mensaje del usuario) quedan habilitados: el formulario y su alternativa.
- Los de respuestas anteriores siguen deshabilitados.

### Fuera de alcance
API, núcleo, contratos, validación de CURP (en demo ya acepta 18 caracteres `[A-Z0-9]`).

## Capabilities

### Modified Capabilities
- `simulador-whatsapp`: requisito nuevo «Formulario y alternativa activos en la misma respuesta».

## Impact
`apps/web/src/componentes/ChatWa.tsx` y su prueba. Ninguna dependencia nueva.
