# Proposal

## Why

El 2026-11-25 Christian recorrió `/wa` con la API real (`main` `0b59599`, `DEMO_MODE=true`, Postgres y `sd-mock`) y reportó cuatro fallas. Claude las reprodujo contra esa misma API con un guion HTTP:

1. **Solo se ofrecen horarios de mañana.** `ConversacionWa.mensajes` calcula una sola fecha (`ts + 24 h`) y lista sus primeros 10 inicios. No hay forma de pedir otro día.
2. **Sin CURP llega un formulario.** Tras «No la tengo», la pista `DATOS` trae varios campos (nombre, apellidos, fecha de nacimiento si falta, sexo y entidad) y `mensajesIdentificacion` los manda en un solo Flow. En WhatsApp debe ser una pregunta y una respuesta.
3. **Sexo y entidad de nacimiento son texto libre.** Ese mismo Flow los pide como campos de texto. El contrato solo acepta `F|M|X` y las claves de `ENTIDADES_NACIMIENTO` (`NT`, `JC`…), así que «Mujer» o «Nayarit» no validan y el bot solo repite «Revisa los campos requeridos», sin salida.
4. **El registro no concluye.** Aun con valores válidos, «Confirmar cita» respondió «El horario ya no está disponible» y después «No pudimos verificar la información» en cada intento, con la reserva todavía vigente. Causa: `sd-mock` guarda la secuencia de folios en memoria y la reinicia en `10000000` cada vez que arranca, pero Postgres conserva las citas de corridas anteriores (`10000000` confirmada a las 03:29). La primera confirmación después de reiniciar `sd-mock` choca con el índice `reserva_folio_unico`, `AgendaPostgres.confirmar` lo traduce a `HORARIO_NO_DISPONIBLE`, el núcleo cancela la cita externa y los reintentos reciben 409 `CITA_CANCELADA` (mostrado como «No pudimos verificar la información») hasta que vence la reserva. En una segunda corrida, con el folio `10000001` libre, el mismo guion terminó en «Cita confirmada». La falla 3 también basta para impedir el registro.

Todas las causas están en archivos del frente A (`packages/adapters/in-http`, `apps/sd-mock`). El contrato ya admite listas, botones y Flows de un campo, y el simulador web ya los muestra.

## What Changes

- **Horario en dos preguntas:** primero «¿Qué día prefieres?» con los días que tienen horarios libres (hoy si aún quedan, y los siguientes hasta completar 7 días con horario), y después «¿A qué hora?» con los horarios libres de ese día, paginados, con «Ver más horarios» y «Elegir otro día».
- **Datos básicos uno por uno:** el adaptador de WhatsApp pregunta cada campo de la pista `DATOS` en su propio mensaje, en el orden de la pista, y envía un solo `IdentificarPaciente` `DATOS` cuando tiene todos. Los campos de texto van en un Flow de un solo campo `sensitive`; el apellido materno permite «No tengo».
- **Sexo con botones** («Mujer», «Hombre», «No binario» → `F`, `M`, `X`) y **entidad de nacimiento con lista paginada** de nombres de estados en orden alfabético, más «Nací en el extranjero» (`NE`).
- **Folios de `sd-mock` sin repetirse entre arranques:** la secuencia arranca de un valor de 9 dígitos derivado del reloj de arranque.
- **Mensaje honesto si la agenda externa no responde:** `AGENDA_NO_DISPONIBLE` se muestra como «La agenda no respondió. Intenta de nuevo en un momento.» en lugar de «No pudimos verificar la información».

### Fuera de alcance

- Contratos, `apps/web` y demás archivos compartidos.
- El dominio: la pista `DATOS` sigue siendo canal-neutral (la App y la web pueden seguir usando un formulario).
- Liberar antes de tiempo una reserva cuya confirmación falló (cambiaría la máquina de agendado, PLAN §10). Queda como riesgo residual.
- La captura por texto libre en el chat: los datos siguen yendo en Flows `sensitive` (AGENTS §9).

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `canal-whatsapp`: «Preguntas guiadas por siguientePregunta» (día y hora), «Identificación del paciente por pasos en WhatsApp» (datos uno por uno, sexo y entidad como opciones), «Confirmación por WhatsApp» (agenda que no responde).
- `agenda-simulada`: «Agenda simulada en sd-mock» (folios que no se repiten entre arranques).

## Impact

- Frente A: `packages/adapters/in-http/src/ConversacionWa.ts`, `identificacionWa.ts`, `textosWa.ts`; `apps/sd-mock/src/crearSdMock.ts` (y `main.ts` si hace falta inyectar el reloj); pruebas en `tests/unit/api/` y `tests/integracion/`.
- Sin migraciones, dependencias nuevas ni cambios de contrato.
- `conversacion_wa.estado` guarda temporalmente las respuestas parciales de `DATOS` (ver design D3).
