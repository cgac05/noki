# Design

Revisión 3 (2026-11-25 ~14:45 UTC): D3 cambia a asistente dentro de /web y se agrega D5 (call center). Revisión 2 (2026-11-25): resuelve las dos pausas de Codex (excepción explícita a `PLAN.md §8` y acción web que registra el cambio de canal).

## Decisions

### D1. Un solo buscador por número
Se reutiliza la búsqueda de «Llamada entrante retoma…» (hilos de contactos cuyo valor coincide en los últimos 10 dígitos; trámites `AGENDAR` en proceso; el más reciente que no esté en `BORRADOR`, o el más reciente). Se amplía a contactos `web` y se expone como caso de uso para WhatsApp y como lectura para web, sin duplicar la consulta.

### D2. WhatsApp sin código
En `ConversacionWa`, cuando no hay trámite en la conversación, ni código explícito, ni opción elegida, y llega texto: si hay continuación vigente del asesor se usa como hoy (aviso de llamada cortada); si no, se retoma por número (D1). Si no hay trámite por número, todo sigue como hoy. Al retomar: `CanalCambiado{de, a: 'whatsapp', metodo: 'MISMO_NUMERO'}` si el último canal era otro, y el texto «Retomamos tu trámite: <servicio> en <sede>[, <fecha>]. Lo iniciaste <canal>.» (solo datos N1 de `AGENTS.md §8`, sin indicador de paciente); después la siguiente pregunta.

### D3. Web: continuar en la propia web con el asistente (revisión 3)
Decisión de Christian (2026-11-25 ~14:40 UTC): «se trata de continuar en la web no de que me envíe de donde vengo»; eligió «Asistente en la web». En `/web`, «Continúa donde lo dejaste» ya NO envía `SolicitarContinuacion` ni enlaza a `/wa` (además fallaba con `TransicionInvalida` en `HORARIO_RESERVADO`, porque `consentirContactoWa` exige trámite editable). En su lugar muestra dentro de `/web`, bajo el título «Continúa tu cita», el componente de conversación existente (`ChatWa` + `useConversacionWa` con el teléfono de la sesión como `waId`) y envía automáticamente una vez «Hola»: el bot retoma por número (D1/D2) o por la conversación ya abierta y presenta el paso pendiente; el paciente termina ahí (horario, preparación, datos, confirmar). Incluye caja de texto y «Volver». `sesionWebDemo` sigue devolviendo `tramitesEnProceso` para listar (lectura sin eventos). Limitación aceptada: los pasos quedan registrados con canal `whatsapp`.

### D4. Vocabulario y política
`MetodoVinculo` añade `MISMO_NUMERO`; `docs/eventos.md` lo documenta junto a `LLAMADA_CC`. `PLAN.md §8` y `AGENTS.md §8` registran la excepción: el mismo número retoma una cita `AGENDAR` en proceso mostrando solo N1. No se crea vínculo ni `IdentidadVinculada`.

### D5. Call center: completar con el asistente (revisión 3)
Christian: «tenemos la misma situación en el call center … no puede completar la operación». En la ficha de `CallCenter.tsx`, con ANI de la pestaña (el mismo que usa `wa-numero-continuacion`) y trámite `AGENDAR` en proceso, «Completar la cita aquí» muestra `ChatWa` + `useConversacionWa(ANI)` y envía «Hola» una vez; el bot retoma por número (D2) y el asesor termina la cita. Limitación aceptada: pasos registrados con canal `whatsapp`. No se toca `ChatWa.tsx` (lo corrige `wa-formulario-activo`).

## Risks
Teléfono compartido o reasignado ve servicio, sede, fecha y canal de una cita en proceso (aceptado por Christian para agendar). No aplica a citas confirmadas ni a otros tipos de trámite.
