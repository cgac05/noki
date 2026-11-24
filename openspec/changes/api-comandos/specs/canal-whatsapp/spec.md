# Spec Delta

## Purpose

Define el endpoint del simulador de WhatsApp y el motor de conversación que traduce mensajes, botones y respuestas del modal tipo Flow en casos de uso del núcleo, guiado por `siguientePregunta`.

## ADDED Requirements

### Requirement: Endpoint del simulador de WhatsApp
`POST /api/canales/wa/mensajes` SHALL validar la solicitud con `SolicitudMensajeWaSchema`, exigir `Idempotency-Key` con las mismas reglas que los comandos y responder 200 con un cuerpo válido según `RespuestaMensajeWaSchema`. Una solicitud inválida MUST responder 400. Los errores de dominio dentro de la conversación SHALL convertirse en mensajes del bot, no en errores HTTP. El `waId` y las respuestas del Flow MUST NOT aparecer en los logs.

#### Scenario: Solicitud vacía
- **WHEN** se envía solo `waId`
- **THEN** responde 400 `VALIDACION`

#### Scenario: Logs sin datos del Flow
- **WHEN** se envía una respuesta del Flow con fecha de nacimiento
- **THEN** ninguna línea del log contiene el `waId` ni la fecha

### Requirement: Retomar en WhatsApp
Un texto `CONTINUAR <token>` SHALL retomar el trámite del token en el canal `whatsapp` y cualquier otro texto SHALL intentar retomar por vínculo o teléfono capturado, según el resolvedor de continuidad. Al retomar, el bot SHALL mostrar solo servicio, sede, fecha si existe y canal de origen, y después la pregunta siguiente. Con varios trámites SHALL ofrecer una lista con el mismo resumen; si la identidad es ambigua MUST NOT revelar nada; sin resultado SHALL iniciar un trámite `AGENDAR` y preguntar el servicio.

#### Scenario: Continuación desde el call center
- **WHEN** un trámite cotizado en el call center se continúa en WhatsApp con su token de continuidad
- **THEN** el bot muestra el servicio y la sede ya elegidos, el evento `CanalCambiado` queda guardado y el siguiente mensaje pregunta el horario con una lista, sin volver a pedir servicio ni sede

#### Scenario: Token usado dos veces
- **WHEN** se envía otra vez el mismo `CONTINUAR <token>`
- **THEN** el bot responde con un mensaje genérico y no revela el trámite

#### Scenario: Sin trámites
- **WHEN** un número sin vínculo ni trámites escribe "Hola"
- **THEN** el bot responde con la lista de servicios del catálogo, de 10 filas como máximo

### Requirement: Preguntas guiadas por siguientePregunta
Cada pregunta del bot SHALL armarse desde `siguientePregunta` del trámite en el canal `whatsapp`: servicio y sede como listas, horario como lista de horarios disponibles en la zona de la sede, requisitos y elegibilidad como botones, y paciente como modal tipo Flow con campos `sensitive`. Las opciones SHALL llevar payloads opacos válidos solo para el último mensaje de ese contacto, que MUST NOT contener folio, ids de paciente ni datos personales. Si el horario elegido no puede reservarse todavía porque faltan requisitos o paciente, SHALL guardarse como preferido y reservarse en cuanto el trámite esté `LISTO_PARA_RESERVAR`.

#### Scenario: Horario antes que los datos del paciente
- **WHEN** en un trámite cotizado sin paciente se elige un horario de la lista
- **THEN** el trámite no cambia de estado, el bot pregunta lo que falta y, tras completarlo, el trámite queda `HORARIO_RESERVADO` en ese horario y el bot ofrece "Confirmar cita"

#### Scenario: Horario ocupado mientras tanto
- **WHEN** el horario preferido se ocupa antes de completar los datos
- **THEN** al completarlos el bot avisa que ya no está disponible y vuelve a listar horarios, sin doble reserva

#### Scenario: Opción vieja
- **WHEN** se envía un payload de un mensaje anterior o de otro contacto
- **THEN** el bot responde que la opción ya no está disponible y repite la pregunta actual sin cambiar el trámite

#### Scenario: Horario en la zona de la sede
- **WHEN** se listan horarios de Tepic con inicio 16:15 UTC
- **THEN** la fila muestra 09:15 (`America/Mazatlan`)

### Requirement: Identificación del paciente por pasos en WhatsApp
Cuando la pregunta es `paciente`, el bot SHALL presentar el paso de identificación que indica la pista (`DESTINATARIO`, `CONFIRMAR`, `FECHA_NAC`, `CURP` o `DATOS`) con el tipo de mensaje de esa pista, y SHALL traducir cada botón o `flowResponse` al comando `IdentificarPaciente` del paso actual. Una respuesta que no cumple `IdentificarPacienteSchema` MUST repetir la pregunta sin contar intento. Los errores de identificación MUST convertirse en mensajes que no revelan si la persona existe. El bot MUST NOT repetir en ningún mensaje los valores capturados en el Flow.

#### Scenario: Ana se identifica por su teléfono
- **WHEN** desde el número sembrado de Ana se elige "Para mí", después "Soy Ana P." y se envía su fecha de nacimiento en el Flow
- **THEN** el trámite tiene `PacienteAsignado`, no se pidió la CURP y ningún mensaje del bot contiene su fecha de nacimiento ni sus apellidos

#### Scenario: Fecha equivocada
- **WHEN** tras elegir "Soy Ana P." se envía tres veces una fecha de nacimiento que no es la suya
- **THEN** cada respuesta es genérica, se guarda `IntentoVerificacionFallido` por cada intento y, tras el tercero, el bot pide esperar sin revelar nada

#### Scenario: Sin CURP
- **WHEN** en el paso `CURP` se pulsa "No la tengo"
- **THEN** el siguiente mensaje es el Flow de datos básicos con los campos de la pista

#### Scenario: Flow incompleto
- **WHEN** se envía el Flow de `FECHA_NAC` con una fecha mal formada
- **THEN** el bot repite la pregunta y no se cuenta ningún intento

### Requirement: Confirmación por WhatsApp
Con el trámite `HORARIO_RESERVADO`, el botón "Confirmar cita" SHALL ejecutar la confirmación y el bot SHALL responder con la fecha y hora en la zona de la sede, sin folio ni datos personales, e indicar que el QR está en la App.

#### Scenario: Flujo A en WhatsApp
- **WHEN** tras retomar con token se elige horario, se cumplen los requisitos, Ana se identifica por pasos y se pulsa "Confirmar cita"
- **THEN** el trámite queda `CONFIRMADA` con `CitaConfirmada` y la respuesta del bot no contiene el folio
