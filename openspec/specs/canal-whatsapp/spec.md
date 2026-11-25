# canal-whatsapp Specification

## Purpose
Define el endpoint del simulador de WhatsApp y el motor de conversación que traduce mensajes, botones y respuestas del modal tipo Flow en casos de uso del núcleo, guiado por `siguientePregunta`.

## Requirements

### Requirement: Endpoint del simulador de WhatsApp
`POST /api/canales/wa/mensajes` SHALL validar la solicitud con `SolicitudMensajeWaSchema`, exigir `Idempotency-Key` con las mismas reglas que los comandos y responder 200 con un cuerpo válido según `RespuestaMensajeWaSchema`. Una solicitud inválida MUST responder 400. Los errores de dominio dentro de la conversación SHALL convertirse en mensajes del bot, no en errores HTTP. El `waId` y las respuestas del Flow MUST NOT aparecer en los logs.

#### Scenario: Solicitud vacía
- **WHEN** se envía solo `waId`
- **THEN** responde 400 `VALIDACION`

#### Scenario: Logs sin datos del Flow
- **WHEN** se envía una respuesta del Flow con fecha de nacimiento
- **THEN** ninguna línea del log contiene el `waId` ni la fecha

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
Cada pregunta del bot SHALL armarse desde `siguientePregunta` del trámite en el canal `whatsapp`: servicio y sede como listas, horario en dos preguntas (día y después hora) en la zona de la sede, requisitos y elegibilidad como botones, y paciente según su paso de identificación. Cada lista SHALL llevar una pregunta propia de su casilla («¿Qué servicio necesitas?», «¿En qué clínica te atendemos?», «¿Qué día prefieres?», «¿A qué hora?») y cada botón de requisito la etiqueta de su tipo («Tengo mi orden médica», «Acepto la preparación», «Confirmo mis datos», «Acepto el consentimiento»). Cada mensaje del bot SHALL hacer una sola pregunta. La pregunta del día SHALL listar, desde hoy en la zona de la sede, hasta 7 días que tengan al menos un horario libre y futuro, buscando como máximo 14 fechas. La pregunta de la hora SHALL listar los horarios libres del día elegido y, cuando no quepan en una lista, SHALL ofrecer «Ver más horarios»; siempre SHALL ofrecer «Elegir otro día». Las opciones SHALL llevar payloads opacos válidos solo para el último mensaje de ese contacto, que MUST NOT contener folio, ids de paciente ni datos personales. Si el horario elegido no puede reservarse todavía porque faltan requisitos o paciente, SHALL guardarse como preferido y reservarse en cuanto el trámite esté `LISTO_PARA_RESERVAR`.

#### Scenario: Horario antes que los datos del paciente
- **WHEN** en un trámite cotizado sin paciente se elige un día y luego una hora
- **THEN** el trámite no cambia de estado, el bot pregunta lo que falta y, tras completarlo, el trámite queda `HORARIO_RESERVADO` en ese horario y el bot ofrece "Confirmar cita"

#### Scenario: Horario ocupado mientras tanto
- **WHEN** el horario preferido se ocupa antes de completar los datos
- **THEN** al completarlos el bot avisa que ya no está disponible y vuelve a preguntar el día, sin doble reserva

#### Scenario: Opción vieja
- **WHEN** se envía un payload de un mensaje anterior o de otro contacto
- **THEN** el bot responde que la opción ya no está disponible y repite la pregunta actual sin cambiar el trámite

#### Scenario: Varios días para elegir
- **WHEN** con la agenda de `sd-mock` o en memoria, a las 10:00 locales de Tepic, se llega a la casilla `horario`
- **THEN** el bot envía la lista «¿Qué día prefieres?» con 7 filas de días distintos, la primera de hoy y la segunda de mañana, sin horas en los títulos

#### Scenario: Día sin horarios restantes
- **WHEN** se llega a la casilla `horario` después del último horario del día en Tepic
- **THEN** la primera fila de la lista de días es mañana

#### Scenario: Elegir otro día
- **WHEN** se elige el tercer día de la lista
- **THEN** el bot envía «¿A qué hora?» solo con horarios de ese día, «Ver más horarios» y «Elegir otro día», sin más de 10 filas

#### Scenario: Más horarios y regreso a los días
- **WHEN** en la lista de horas se pulsa «Ver más horarios» y después «Elegir otro día»
- **THEN** primero llegan los horarios restantes del mismo día y después vuelve la lista «¿Qué día prefieres?»

#### Scenario: Horario en la zona de la sede
- **WHEN** se listan las horas de Tepic del 26 de noviembre con inicio `2026-11-26T16:15:00Z`
- **THEN** la fila del día dice «jue 26 nov» y la fila de la hora dice «09:15» (`America/Mazatlan`)

#### Scenario: Horarios del Flujo A en horario de atención
- **WHEN** con la agenda de `sd-mock` o en memoria se elige mañana en Tepic
- **THEN** la primera hora es «09:00», ninguna es anterior a las 09:00 locales y al reservar la primera, el inicio guardado es las 09:00 locales y no la medianoche

### Requirement: Identificación del paciente por pasos en WhatsApp
Cuando la pregunta es `paciente`, el bot SHALL presentar el paso de identificación que indica la pista (`DESTINATARIO`, `CONFIRMAR`, `FECHA_NAC`, `CURP` o `DATOS`) y SHALL traducir cada botón o `flowResponse` al comando `IdentificarPaciente` del paso actual. En el paso `CONFIRMAR` la lista SHALL preguntar «¿Eres alguna de estas personas?». En el paso `DATOS` el bot SHALL preguntar un campo de la pista por mensaje, en el orden de la pista: los campos de texto en un Flow de un solo campo `sensitive` (el apellido materno con el botón «No tengo»), `sexo` con los botones «Mujer», «Hombre» y «No binario» (`F`, `M`, `X`) y `entidadNacimiento` con una lista de nombres de estados en orden alfabético, 9 por página con «Más estados», que incluye «Nací en el extranjero» (`NE`). Solo cuando tenga todos los campos SHALL enviar un único `IdentificarPaciente` `DATOS`; las respuestas parciales SHALL borrarse del estado de la conversación al enviarlo, al cambiar de trámite o al dejar el paso. Una respuesta que no cumple `IdentificarPacienteSchema` MUST repetir la misma pregunta sin contar intento. Los errores de identificación MUST convertirse en mensajes que no revelan si la persona existe. El bot MUST NOT repetir en ningún mensaje los valores capturados.

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
- **WHEN** desde un número nuevo se elige "Para mí", se envía la fecha de nacimiento y en el paso `CURP` se pulsa "No la tengo"
- **THEN** el siguiente mensaje es un Flow con un solo campo, «Nombre», y ningún mensaje del bot es un Flow con más de un campo

#### Scenario: Registro completo sin CURP
- **WHEN** después de "No la tengo" se contestan nombre, apellido paterno, «No tengo» en apellido materno, «Mujer» y «Nayarit» (en la página que lo contiene)
- **THEN** se ejecuta un solo `IdentificarPaciente` `DATOS` con `sexo: 'F'` y `entidadNacimiento: 'NT'`, el trámite tiene `PacienteRegistrado` y `PacienteAsignado`, y el estado de la conversación ya no guarda esos datos

#### Scenario: Sexo y entidad como opciones
- **WHEN** el bot pregunta el sexo y después la entidad de nacimiento
- **THEN** el sexo llega como botones «Mujer», «Hombre» y «No binario», y la entidad como lista de 10 filas como máximo con nombres de estados y «Más estados», sin claves como `NT` ni `DF` en los títulos

#### Scenario: Respuesta inválida en un campo
- **WHEN** en la pregunta del nombre se envía el Flow vacío
- **THEN** el bot repite la pregunta del nombre, no se cuenta intento y se conservan las respuestas anteriores

#### Scenario: Flow incompleto
- **WHEN** se envía el Flow de `FECHA_NAC` con una fecha mal formada
- **THEN** el bot repite la pregunta y no se cuenta ningún intento

### Requirement: Confirmación por WhatsApp
Con el trámite `HORARIO_RESERVADO`, el bot SHALL indicar el vencimiento de la reserva con la fecha larga en la zona de la sede y ofrecer el botón "Confirmar cita". Ese botón SHALL ejecutar la confirmación y el bot SHALL responder con la fecha larga en la zona de la sede, sin folio ni datos personales, e indicar que el QR está en la App. Si la agenda externa no responde (`AGENDA_NO_DISPONIBLE`), el bot SHALL responder «La agenda no respondió. Intenta de nuevo en un momento.» y MUST NOT decir que no pudo verificar la información.

#### Scenario: Flujo A en WhatsApp
- **WHEN** tras retomar con token se elige día y hora, se cumplen los requisitos, Ana se identifica por pasos y se pulsa "Confirmar cita"
- **THEN** el trámite queda `CONFIRMADA` con `CitaConfirmada` y la respuesta del bot no contiene el folio

#### Scenario: Confirmación con día
- **WHEN** se confirma una cita de Tepic con inicio `2026-11-26T16:15:00Z`
- **THEN** la respuesta dice «jueves 26 de noviembre, 09:15» y no contiene `2026-11-26` ni `26/11/2026`

#### Scenario: Agenda externa caída al confirmar
- **WHEN** con `sd-mock` configurado para fallar se pulsa "Confirmar cita"
- **THEN** el bot responde «La agenda no respondió. Intenta de nuevo en un momento.» y vuelve a ofrecer "Confirmar cita"

#### Scenario: Registro nuevo concluye después de reiniciar sd-mock
- **WHEN** contra Postgres que ya tiene una cita confirmada con un folio de una corrida anterior de `sd-mock`, se arranca un `sd-mock` nuevo y un número nuevo recorre el Flujo A sin CURP hasta "Confirmar cita"
- **THEN** el bot responde «Cita confirmada…» al primer intento

### Requirement: Textos del bot en español
Todo texto de mensaje, título de lista y título de opción del bot SHALL estar redactado en español para el paciente. Los mensajes MUST NOT mostrar identificadores internos: valores del vocabulario de canal (`callcenter`, `whatsapp`, `web`, `app`, `clinica`), nombres de casilla, tipos de requisito (`ORDEN_MEDICA`, `ACEPTAR_PREPARACION`, `DATOS_PACIENTE`, `CONSENTIMIENTO`), pasos de identificación ni instantes ISO 8601. Las fechas SHALL mostrarse en la zona de la sede con el formato corto `EEE d MMM · HH:mm` en las opciones de horario («jue 26 nov · 09:15») y con el formato largo `EEEE d 'de' MMMM, HH:mm` en los textos («jueves 26 de noviembre, 09:15»), ambos con la configuración regional `es`. El canal de origen SHALL nombrarse como «por teléfono» (`callcenter`), «por WhatsApp», «en la web», «en la App» o «en la clínica».

#### Scenario: Requisitos con etiqueta
- **WHEN** el servicio cotizado exige `CONSENTIMIENTO` y `ORDEN_MEDICA`
- **THEN** los botones de requisitos dicen «Acepto el consentimiento» y «Tengo mi orden médica», y ningún texto del mensaje contiene `CONSENTIMIENTO` ni `ORDEN_MEDICA`

#### Scenario: Recorrido sin identificadores internos
- **WHEN** se recorre en WhatsApp el Flujo A desde `CONTINUAR <token>` hasta «Confirmar cita»
- **THEN** ningún mensaje del bot contiene un valor del vocabulario de canal, un nombre de casilla, un tipo de requisito ni un instante ISO 8601

### Requirement: Varias operaciones en un mismo mensaje
Cuando un solo mensaje de WhatsApp ejecuta más de una operación del núcleo (por ejemplo, cumplir un requisito y después reservar el horario preferido, o retomar y después confirmar un hold vencido), la primera operación SHALL usar la `Idempotency-Key` del mensaje y cada operación siguiente SHALL usar una clave nueva (UUID v7) con el mismo `correlation_id`. Ningún evento del mensaje MUST compartir `idempotency_key` con otro, y el mensaje MUST NOT responder 500 por una clave repetida.

#### Scenario: Paciente asignado desde el call center
- **WHEN** el asesor asigna a Ana, cotiza Química sanguínea en Tepic y solicita la continuación, y en WhatsApp se envía `CONTINUAR <token>`, se elige un horario y se pulsa «Acepto la preparación»
- **THEN** la respuesta es 200, el trámite queda `HORARIO_RESERVADO` en ese horario, el bot ofrece «Confirmar cita» y los eventos `PreparacionAceptada` y `HorarioReservado` tienen claves distintas, tanto en memoria como en Postgres

#### Scenario: Reintento del mismo mensaje
- **WHEN** se reenvía ese mensaje con la misma `Idempotency-Key`
- **THEN** la respuesta es igual a la primera y no se registra ningún evento nuevo

### Requirement: Continuación tras llamada cortada
`/callcenter` SHALL ofrecer «Cerrar atención (llamada cortada)» en la ficha de un trámite abierto, que envía `SolicitarContinuacion` con el asesor. Cuando después escribe en WhatsApp el mismo número que el ANI de ese hilo y hay una continuación vigente sin usar, el bot SHALL avisar que la llamada se cortó, mostrar lo ya guardado (servicio, sede, horario y paciente enmascarado, si existen) y retomar el trámite con esa continuación de un solo uso, siguiendo con la siguiente pregunta pendiente. Sin continuación vigente, un trámite `AGENDAR` en proceso del mismo número SHALL retomarse según «Mismo número retoma una cita en proceso en cualquier canal» de `continuidad-canales`. En los demás casos WhatsApp MUST comportarse como antes.

#### Scenario: Llamada cortada y continuación
- **WHEN** el asesor cotiza un servicio en una sede para el ANI `5210000000001`, pulsa «Cerrar atención (llamada cortada)» y luego `5210000000001` escribe «Hola» en `/wa`
- **THEN** el bot dice que la llamada se cortó, muestra el servicio y la sede guardados y continúa con la siguiente pregunta, sin pedir `CONTINUAR`

#### Scenario: Otro número
- **WHEN** escribe en `/wa` un número distinto del ANI
- **THEN** no se retoma el trámite del Call Center

#### Scenario: Un solo uso
- **WHEN** la continuación ya se usó
- **THEN** un nuevo «Hola» del mismo número no la vuelve a consumir
