# Propuesta: llamada-cortada

## Why

Christian (2026-11-25, 12:39 UTC): «en call center poner el boton de cerrar la atencion y que cuando se tecle el numero en whatsapp diga que se corto la llamada y si hay algo guardado que lo muestre y ya podamos continuar desde ahi». Es el centro del Flujo A (PLAN.md §397–§400): la llamada se corta y el paciente sigue en WhatsApp sin repetir datos. Hoy el asesor debe marcar el consentimiento y pulsar «Continuar por WhatsApp», y en `/wa` el paciente tiene que escribir `CONTINUAR <código>`.

## What Changes

- `/callcenter`: botón «Cerrar atención (llamada cortada)» en la ficha del trámite abierto. Envía `SolicitarContinuacion` (destino `whatsapp`) con el asesor, sin exigir antes la casilla de consentimiento. Tras el envío la ficha queda como hoy tras la continuación (código, enlace y QR) y la vista indica «Llamada cerrada».
- `/wa`: cuando un número escribe sin trámite en su conversación y ese mismo número es el ANI de un hilo del Call Center con una continuación vigente y sin usar, el bot avisa que la llamada se cortó, muestra lo ya guardado (servicio, sede, horario y paciente enmascarado, si existen) y retoma el trámite con ese token, por el mismo camino que `CONTINUAR <código>` (un solo uso, hereda el nivel del Call Center). Después sigue con la siguiente pregunta pendiente.
- Sin coincidencia de número o sin continuación vigente, `/wa` se comporta como hoy.

## Fuera de alcance

- Cambios en `packages/contracts` (detener y avisar si son imprescindibles).
- Retomar sin la acción del asesor: la continuación la emite siempre el Call Center.

## Impact

- `apps/web/src/vistas/CallCenter.tsx` y sus pruebas.
- `packages/adapters/in-http/src/ConversacionWa.ts`, `textosWa.ts` y, si hace falta, una lectura en `LecturasPort` con sus adaptadores de Postgres y memoria para hallar la continuación vigente por número; pruebas unitarias.
