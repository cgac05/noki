# Proposal

## Why

Christian (2026-11-25, hilo del proyecto): «no solo se requiere enlazar la comunicación con el botón sino si se corta y se inicia en cualquier medio se debe de poder rescatar sin saber cuál será su próximo destino desde nos contactará el usuario». Ante la regla vigente (un número que coincide solo deja ver el resumen y exige folio + fecha de nacimiento), decidió: «si solo es sacar una cita redireccionamiento directo».

Prueba en la demo (main `f5260a8`): llamada del 3119990002, cotizado, colgada sin pulsar botón → «Hola» por WhatsApp desde el mismo número empieza de cero. Con el botón sí retoma; una nueva llamada también retoma («Llamada entrante retoma el trámite en proceso del número»). La web (`web-sesion`, sin commit) solo encuentra trámites de pacientes vinculados.

## What Changes

- **WhatsApp:** un mensaje sin código desde un número cuyos últimos 10 dígitos coinciden con un contacto (`whatsapp`, `callcenter` o `web`) de un hilo con un trámite `AGENDAR` en proceso (`BORRADOR`, `COTIZADO`, `LISTO_PARA_RESERVAR`, `HORARIO_RESERVADO`) lo retoma directo, con la misma selección que la llamada entrante. Avisa «Retomamos tu trámite…», registra `CanalCambiado{…, a: 'whatsapp', metodo: 'MISMO_NUMERO'}` y sigue con la siguiente pregunta. Sin vínculo de identidad.
- **Web (`/web`, sesión de demo):** al identificarse con el teléfono, también se listan esos trámites `AGENDAR` en proceso del número aunque no haya paciente vinculado, con «Continúa donde lo dejaste».
- Se conserva lo existente: botón/enlace de continuación, llamada entrante, folio + fecha para otros tipos de trámite o estados.

### Fuera de alcance
- Trámites que no son `AGENDAR` o en `CONFIRMADA` o posterior: siguen con la política de verificación.
- `/app` y clínica.

## Capabilities

### Modified Capabilities
- `continuidad-canales`: requisito nuevo «Mismo número retoma una cita en proceso en cualquier canal»; la prioridad 3 queda para lo demás.
- `canal-whatsapp`: «Continuación tras llamada cortada» ya no exige continuación vigente para trámites `AGENDAR` en proceso.

## Impact
Dominio (`MetodoVinculo` + `MISMO_NUMERO`), `CasosTramite` (retomar por número reutilizando la búsqueda de la llamada entrante), `ConversacionWa`, contactos memoria/Postgres, consulta `sesionWebDemo` y `Web.tsx`, `docs/eventos.md`, pruebas. Riesgo aceptado por Christian: un teléfono compartido o reasignado ve servicio, sede, fecha y canal de una cita en proceso (solo N1; excepción registrada en `PLAN.md §8`).
