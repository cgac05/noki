## ADDED Requirements

### Requirement: Textos del bot en español
Todo texto de mensaje, título de lista y título de opción del bot SHALL estar redactado en español para el paciente. Los mensajes MUST NOT mostrar identificadores internos: valores del vocabulario de canal (`callcenter`, `whatsapp`, `web`, `app`, `clinica`), nombres de casilla, tipos de requisito (`ORDEN_MEDICA`, `ACEPTAR_PREPARACION`, `DATOS_PACIENTE`, `CONSENTIMIENTO`), pasos de identificación ni instantes ISO 8601. Las fechas SHALL mostrarse en la zona de la sede con el formato corto `EEE d MMM · HH:mm` en las opciones de horario («jue 26 nov · 09:15») y con el formato largo `EEEE d 'de' MMMM, HH:mm` en los textos («jueves 26 de noviembre, 09:15»), ambos con la configuración regional `es`. El canal de origen SHALL nombrarse como «por teléfono» (`callcenter`), «por WhatsApp», «en la web», «en la App» o «en la clínica».

#### Scenario: Requisitos con etiqueta
- **WHEN** el servicio cotizado exige `CONSENTIMIENTO` y `ORDEN_MEDICA`
- **THEN** los botones de requisitos dicen «Acepto el consentimiento» y «Tengo mi orden médica», y ningún texto del mensaje contiene `CONSENTIMIENTO` ni `ORDEN_MEDICA`

#### Scenario: Recorrido sin identificadores internos
- **WHEN** se recorre en WhatsApp el Flujo A desde `CONTINUAR <token>` hasta «Confirmar cita»
- **THEN** ningún mensaje del bot contiene un valor del vocabulario de canal, un nombre de casilla, un tipo de requisito ni un instante ISO 8601

## MODIFIED Requirements

### Requirement: Retomar en WhatsApp
Un texto `CONTINUAR <token>` SHALL retomar el trámite del token en el canal `whatsapp` y cualquier otro texto SHALL intentar retomar por vínculo o teléfono capturado, según el resolvedor de continuidad. Al retomar, el bot SHALL mostrar solo servicio, sede, fecha larga si existe y canal de origen nombrado según «Textos del bot en español», y después la pregunta siguiente. Con varios trámites SHALL ofrecer una lista con servicio, sede y canal de origen nombrado; si la identidad es ambigua MUST NOT revelar nada; sin resultado SHALL iniciar un trámite `AGENDAR` y preguntar el servicio.

#### Scenario: Continuación desde el call center
- **WHEN** un trámite cotizado en el call center se continúa en WhatsApp con su token de continuidad
- **THEN** el bot muestra el servicio y la sede ya elegidos con «por teléfono» como origen y sin la palabra `callcenter`, el evento `CanalCambiado` queda guardado y el siguiente mensaje pregunta el horario con una lista, sin volver a pedir servicio ni sede

#### Scenario: Token usado dos veces
- **WHEN** se envía otra vez el mismo `CONTINUAR <token>`
- **THEN** el bot responde con un mensaje genérico y no revela el trámite

#### Scenario: Sin trámites
- **WHEN** un número sin vínculo ni trámites escribe "Hola"
- **THEN** el bot responde con la lista de servicios del catálogo, de 10 filas como máximo

### Requirement: Preguntas guiadas por siguientePregunta
Cada pregunta del bot SHALL armarse desde `siguientePregunta` del trámite en el canal `whatsapp`: servicio y sede como listas, horario como lista de horarios disponibles con día y hora en la zona de la sede, requisitos y elegibilidad como botones, y paciente como modal tipo Flow con campos `sensitive`. Cada lista SHALL llevar una pregunta propia de su casilla («¿Qué servicio necesitas?», «¿En qué clínica te atendemos?», «¿Qué horario prefieres?») y cada botón de requisito la etiqueta de su tipo («Tengo mi orden médica», «Acepto la preparación», «Confirmo mis datos», «Acepto el consentimiento»). Las opciones SHALL llevar payloads opacos válidos solo para el último mensaje de ese contacto, que MUST NOT contener folio, ids de paciente ni datos personales. Si el horario elegido no puede reservarse todavía porque faltan requisitos o paciente, SHALL guardarse como preferido y reservarse en cuanto el trámite esté `LISTO_PARA_RESERVAR`.

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
- **WHEN** se listan horarios de Tepic con inicio `2026-11-26T16:15:00Z`
- **THEN** la fila muestra «jue 26 nov · 09:15» (`America/Mazatlan`)

#### Scenario: Horarios del Flujo A en horario de atención
- **WHEN** con la agenda de `sd-mock` o en memoria se listan los horarios de Tepic para mañana
- **THEN** la primera fila es de las 09:00 locales con el día de mañana, ninguna fila es anterior a las 09:00 y al reservar la primera, el inicio guardado es las 09:00 locales y no la medianoche

### Requirement: Identificación del paciente por pasos en WhatsApp
Cuando la pregunta es `paciente`, el bot SHALL presentar el paso de identificación que indica la pista (`DESTINATARIO`, `CONFIRMAR`, `FECHA_NAC`, `CURP` o `DATOS`) con el tipo de mensaje de esa pista, y SHALL traducir cada botón o `flowResponse` al comando `IdentificarPaciente` del paso actual. En el paso `CONFIRMAR` la lista SHALL preguntar «¿Eres alguna de estas personas?». Una respuesta que no cumple `IdentificarPacienteSchema` MUST repetir la pregunta sin contar intento. Los errores de identificación MUST convertirse en mensajes que no revelan si la persona existe. El bot MUST NOT repetir en ningún mensaje los valores capturados en el Flow.

#### Scenario: Ana se identifica por su teléfono
- **WHEN** desde el número sembrado de Ana se elige "Para mí", después "Soy Ana P." y se envía su fecha de nacimiento en el Flow
- **THEN** el trámite tiene `PacienteAsignado`, no se pidió la CURP y ningún mensaje del bot contiene su fecha de nacimiento ni sus apellidos

#### Scenario: Pregunta del paso CONFIRMAR
- **WHEN** desde el número sembrado de Ana se elige "Para mí"
- **THEN** el bot envía una lista con el texto «¿Eres alguna de estas personas?», con «Soy Ana P.» y «No soy ninguno»

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
Con el trámite `HORARIO_RESERVADO`, el bot SHALL indicar el vencimiento de la reserva con la fecha larga en la zona de la sede y ofrecer el botón "Confirmar cita". Ese botón SHALL ejecutar la confirmación y el bot SHALL responder con la fecha larga en la zona de la sede, sin folio ni datos personales, e indicar que el QR está en la App.

#### Scenario: Flujo A en WhatsApp
- **WHEN** tras retomar con token se elige horario, se cumplen los requisitos, Ana se identifica por pasos y se pulsa "Confirmar cita"
- **THEN** el trámite queda `CONFIRMADA` con `CitaConfirmada` y la respuesta del bot no contiene el folio

#### Scenario: Confirmación con día
- **WHEN** se confirma una cita de Tepic con inicio `2026-11-26T16:15:00Z`
- **THEN** la respuesta dice «jueves 26 de noviembre, 09:15» y no contiene `2026-11-26` ni `26/11/2026`
