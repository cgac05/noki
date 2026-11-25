# relleno-huecos Specification

## Purpose
Define el relleno de huecos del núcleo (`PLAN.md` §10.1): la aprobación por WhatsApp de la cancelación de una cita, la detección del horario liberado, la búsqueda justa de candidatos, las ofertas secuenciales o en oleada, la saga de adelanto con compensación, el efecto dominó, y el panel y los KPI de huecos, con los botones de WhatsApp limitados al modo demo.

## Requirements

### Requirement: Aprobación de la cancelación por WhatsApp
Cuando un paciente pide `CancelarCita` sin OTP ni botón de aprobación, el núcleo SHALL enviar al contacto de WhatsApp con vínculo vigente del paciente dueño de la cita un mensaje con los botones "Sí, cancelar" y "No, conservarla", cuyos `payload` son tokens firmados de un solo uso ligados al trámite y a ese contacto, con vigencia de 10 minutos, y SHALL responder `STEP_UP_REQUERIDO` con el factor `BOTON_APROBACION`. El mensaje MUST NOT enviarse a otro número, y la respuesta MUST ser la misma exista o no un contacto vinculado.

#### Scenario: Ana pide cancelar desde la app
- **WHEN** Ana envía `CancelarCita` desde `/app` para su cita confirmada
- **THEN** la respuesta es `STEP_UP_REQUERIDO` con `BOTON_APROBACION`, la cita sigue `CONFIRMADA` y la sala `wa:5210000000001` recibe un `wa:mensajes` con los dos botones

#### Scenario: Ana aprueba
- **WHEN** Ana pulsa "Sí, cancelar" en `/wa`
- **THEN** la cita pasa a `CANCELADA` con el factor `BOTON_APROBACION` y se emite `CitaCancelada`

#### Scenario: Botón reutilizado o de otro número
- **WHEN** se envía otra vez el mismo `payloadBoton`, o lo envía un `waId` distinto del contacto del token
- **THEN** la cita no cambia y la respuesta es "Esa opción ya no está disponible."

#### Scenario: Conservar la cita
- **WHEN** Ana pulsa "No, conservarla"
- **THEN** la cita sigue `CONFIRMADA` y el botón "Sí, cancelar" del mismo mensaje deja de funcionar

#### Scenario: Reintento con la misma clave
- **WHEN** `/app` repite `CancelarCita` con la misma `Idempotency-Key`
- **THEN** recibe la misma respuesta y no se envía un segundo mensaje

### Requirement: Botones de WhatsApp solo en modo demo
Mientras el canal de WhatsApp sea el simulador, que acepta el número declarado por el cliente, el núcleo SHALL enviar mensajes iniciados por la empresa y aceptar botones de aprobación y de oferta solo con `DEMO_MODE=true`. Fuera del modo demo MUST NOT enviar `wa:mensajes` ni cambiar una cita por un botón de WhatsApp.

#### Scenario: Fuera del modo demo
- **WHEN** la API corre con `DEMO_MODE` distinto de `true`, Ana pide `CancelarCita` desde `/app` y se libera un hueco con Beto como candidato
- **THEN** la respuesta es `STEP_UP_REQUERIDO`, no se emite ningún `wa:mensajes`, la cita no cambia y el hueco queda `DESIERTO`

### Requirement: Detección de huecos
El consumidor del grupo `huecos` SHALL crear un hueco `DETECTADO` y emitir `HuecoLiberado` cuando se cancela una cita confirmada con inicio futuro (`CitaCancelada`) y cuando una cita se adelanta, por su horario anterior (`CitaAdelantada`). Cada reserva de origen MUST generar como máximo un hueco, aunque el evento llegue repetido.

#### Scenario: Cancelación libera un hueco
- **WHEN** se procesa `CitaCancelada` de la cita de Ana
- **THEN** existe un hueco con la sede, el recurso y el inicio de esa cita y se emite `HuecoLiberado` en el hilo de Ana

#### Scenario: Evento duplicado
- **WHEN** el mismo `CitaCancelada` se entrega dos veces
- **THEN** existe un solo hueco y un solo `HuecoLiberado`

### Requirement: Candidatos compatibles
El dominio SHALL decidir con una función pura si un interés es candidato para un hueco: interés `ACTIVO`, mismo servicio y recurso compatible, sede aceptada, inicio dentro de la ventana y anterior a la cita actual del paciente, horas hasta el inicio mayores o iguales que la anticipación mínima del servicio, requisitos cubiertos, menos de 3 ofertas al paciente en los últimos 7 días y fuera del horario de silencio de 22:00 a 07:00 en la zona de la sede. Los candidatos SHALL ordenarse por fecha de registro del interés, del más antiguo al más reciente.

#### Scenario: Filtro de ayuno
- **WHEN** un hueco de Química sanguínea (anticipación mínima 8 h) empieza en 5 h y hay un interés compatible en todo lo demás
- **THEN** el interés no es candidato

#### Scenario: Adelanto real
- **WHEN** el hueco empieza después de la cita actual del paciente
- **THEN** el interés no es candidato

#### Scenario: Silencio y límite semanal
- **WHEN** son las 23:00 en `America/Mazatlan`, o el paciente ya recibió 3 ofertas en 7 días
- **THEN** el interés no es candidato

#### Scenario: Orden justo
- **WHEN** dos intereses compatibles se registraron en momentos distintos
- **THEN** se ofrece primero al más antiguo

### Requirement: Ofertas por estrategia
Un hueco que empieza en 24 h o más SHALL ofrecerse de forma `SECUENCIAL`: un candidato a la vez, con vigencia de 15 minutos y temporizador `OFERTA`. Un hueco que empieza en menos de 24 h SHALL ofrecerse en `OLEADA` de 3 a 5 candidatos. Cada oferta SHALL emitir `OfertaEnviada` y enviar al WhatsApp vinculado del candidato un mensaje con servicio, sede, fecha y hora locales y los botones "Sí, adelantar" y "No, gracias", con tokens de un solo uso ligados a la oferta y al contacto. El mensaje MUST NOT incluir ningún dato del paciente que liberó el horario. Sin candidatos, el hueco SHALL pasar a `DESIERTO` con `HuecoDesierto`.

#### Scenario: Oferta a Beto en menos de 5 s
- **WHEN** se libera el hueco de Ana, a más de 24 h, y Beto es el único candidato
- **THEN** en menos de 5 s la sala `wa:5210000000002` recibe la oferta, se emite `OfertaEnviada` y el hueco queda `OFRECIDO`

#### Scenario: Sin datos del otro paciente
- **WHEN** se inspeccionan el mensaje de la oferta y los payloads de sus eventos
- **THEN** no contienen el nombre, el ID, el teléfono ni el folio de Ana

#### Scenario: Rechazo o vencimiento
- **WHEN** Beto pulsa "No, gracias", o pasan 15 minutos (también al adelantar el reloj de demo)
- **THEN** su oferta queda `RECHAZADA` o `EXPIRADA` y se ofrece al siguiente candidato, o el hueco queda `DESIERTO`

#### Scenario: Reenvío al abrir el chat
- **WHEN** Beto se une a `wa:5210000000002` mientras su oferta sigue vigente
- **THEN** recibe la oferta otra vez, y aceptarla una vez funciona

### Requirement: Saga de aceptación
Al aceptar una oferta, el núcleo SHALL exigir `aceptarOfertaHueco` (contacto vinculado al paciente del interés y token vigente no usado), apartar el horario del hueco para el trámite del candidato, registrarlo en la agenda externa, confirmarlo, emitir `CitaAdelantada`, `OfertaAceptada` y `HuecoAsignado`, y solo después liberar el horario anterior del candidato. Si un paso anterior a `CitaAdelantada` falla, SHALL compensar y el candidato MUST conservar su cita original.

#### Scenario: Beto adelanta su cita
- **WHEN** Beto pulsa "Sí, adelantar"
- **THEN** su trámite sigue `CONFIRMADA` con el horario del hueco, el hueco queda `ASIGNADO`, su horario anterior queda libre y genera otro hueco

#### Scenario: Compensación de la saga
- **WHEN** la agenda externa falla al registrar el horario nuevo
- **THEN** la reserva nueva se libera, Beto conserva su horario y su folio, su oferta queda `EXPIRADA` y el hueco pasa al siguiente candidato

#### Scenario: Un solo ganador en oleada
- **WHEN** tres candidatos aceptan a la vez la misma oleada (contra Postgres)
- **THEN** exactamente uno obtiene el horario, los otros dos quedan `PERDIDA` y reciben "Ese espacio ya fue tomado. Te avisaremos si se libera otro."

### Requirement: Efecto dominó
El horario anterior del paciente que adelantó SHALL ofrecerse a los siguientes candidatos con las mismas reglas.

#### Scenario: Se ofrece a Carla
- **WHEN** Beto adelanta su cita y Carla tiene un interés compatible con el horario anterior de Beto
- **THEN** la sala `wa:5210000000003` recibe la oferta de ese horario

### Requirement: Panel y KPI de huecos
La API SHALL responder `panelHuecos` en `/api/admin/huecos` con los 50 huecos más recientes, sus ofertas en orden de envío y sin datos de pacientes, y SHALL incluir en las métricas `huecosLiberados`, `huecosRecuperados`, `horasRecursoRecuperadas` y `diasAdelantadosPromedio`. Cada evento de huecos SHALL actualizar `admin:metricas`.

#### Scenario: Panel tras el Flujo C
- **WHEN** Ana cancela y Beto acepta
- **THEN** el panel muestra el hueco de Ana `ASIGNADO` con una oferta `ACEPTADA`, y `huecosRecuperados` es 1 y `horasRecursoRecuperadas` es 0.5

#### Scenario: Límite del panel
- **WHEN** existen 60 huecos
- **THEN** el panel devuelve los 50 más recientes, del más reciente al más antiguo

### Requirement: Datos de demo del Flujo C
La semilla y el reinicio de demo SHALL crear, relativas al reloj, la cita confirmada de Ana, la cita posterior de Beto con interés activo y la de Carla con interés que cubra el horario de Beto, con vínculos de WhatsApp vigentes.

#### Scenario: Flujo C desde una base recién sembrada
- **WHEN** se siembra la base y se recorre el Flujo C de `PLAN.md` §12
- **THEN** Ana cancela con aprobación, Beto recibe y acepta la oferta, y Carla recibe la del horario anterior de Beto
