# Spec Delta

## MODIFIED Requirements

### Requirement: Guion simulado del Flujo A
El modo simulado SHALL reproducir el Flujo A de `PLAN.md` §12 como un guion fijo y compartido entre todas las vistas. El guion incluye:

- en el call center, la llamada con el ANI de demo, la cotización del paquete en Tepic y la solicitud de continuación por WhatsApp, que es la que genera el código;
- en WhatsApp, la continuación con el mensaje `CONTINUAR <código>` en el paso del horario y la identificación de la paciente por pasos: para quién es la cita, «¿eres Ana P.?» y la fecha de nacimiento en un Flow;
- la cita confirmada con QR en la app;
- en la clínica, la llegada registrada con su turno en la fila y la atención cerrada;
- la línea de tiempo y los eventos de tiempo real de cada paso.

En el guion, el call center no pide la casilla `paciente` y la lectura de alertas de seguridad es una lista vacía. El guion MUST poder reiniciarse y MUST usar solo datos ficticios.

#### Scenario: Continuidad simulada
- **WHEN** tras cotizar y solicitar la continuación en `/callcenter` se envía desde `/wa` el mensaje `CONTINUAR <código>` del guion
- **THEN** el primer mensaje del bot retoma en el horario y no vuelve a pedir servicio ni sede

#### Scenario: Código solo tras la solicitud
- **WHEN** el guion está en el paso de cotización y aún no recibe `SolicitarContinuacion`
- **THEN** la ficha no trae código de continuación

#### Scenario: Llamada con ANI
- **WHEN** el call center envía `IniciarTramite` sin `contacto` o con otro número distinto del de demo
- **THEN** el guion responde con el error `NO_DISPONIBLE` y la ayuda del paso, y no avanza

#### Scenario: Identificación por pasos en WhatsApp
- **WHEN** tras reservar el horario y pulsar «Revisar cita» se elige «Para mí» y luego «Soy Ana P.»
- **THEN** el bot pide la fecha de nacimiento con un Flow de captura protegida; la respuesta de cada paso lleva la casilla `paciente` con su `paso`, y la línea de tiempo registra `DestinatarioDeclarado`

#### Scenario: Opciones fuera del guion
- **WHEN** en la identificación se elige «Para otra persona» o «No soy ninguno»
- **THEN** el guion responde con un mensaje de ayuda válido y no avanza

#### Scenario: Verificación con Flow
- **WHEN** el guion pide la fecha de nacimiento y recibe un `flowResponse` con todos los campos requeridos
- **THEN** registra `IdentidadComprobada` y avanza al paso de confirmación, sin repetir ningún valor recibido en sus mensajes

#### Scenario: Flow incompleto
- **WHEN** el guion recibe un `flowResponse` sin un campo requerido
- **THEN** responde con un mensaje de ayuda válido y no avanza

#### Scenario: Eventos de tiempo real
- **WHEN** el guion confirma la cita
- **THEN** el cliente emite `tramite:actualizado` con el trámite en `CONFIRMADA` y `hilo:linea-tiempo` con el evento `CitaConfirmada`

#### Scenario: Turno en la clínica
- **WHEN** el guion registra la llegada
- **THEN** la lectura `llegadasSede` trae la llegada registrada con `posicion: 1` y el cliente emite `sede:fila` con esa posición

#### Scenario: Cierre en la clínica
- **WHEN** tras la llegada recepción envía `CerrarAtencion`
- **THEN** el guion registra en la línea de tiempo `AtencionCerrada` con canal `clinica`, la cita queda en `ATENDIDA` y sale de las llegadas esperadas, y ningún paso espera `ComprobarIdentidad`

#### Scenario: Reinicio del guion
- **WHEN** se reinicia el guion desde la navegación de demo
- **THEN** todas las vistas vuelven al primer paso y el historial de `/wa` se vacía, incluido el guardado en `sessionStorage`

#### Scenario: Fuera del guion
- **WHEN** en `/wa` se envía un texto que el guion no espera
- **THEN** el cliente responde con un mensaje de texto válido según el contrato que explica qué opciones hay, sin error
