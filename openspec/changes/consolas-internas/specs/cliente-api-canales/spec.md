# Spec Delta

## ADDED Requirements

### Requirement: Tiempo real con salas
El cliente SHALL permitir a las vistas unirse a una sala y dejarla, sin exponer el socket. En modo real SHALL conectarse por Socket.IO a la URL base configurada, enviar `sala:unirse` y `sala:salir` solo con salas válidas según `SalaSchema`, y volver a unirse a las salas activas tras una reconexión. Cada evento recibido SHALL validarse con su esquema antes de llegar a la vista; uno inválido MUST descartarse sin romper la vista. En modo simulado, unirse y dejar una sala no tienen efecto y los eventos siguen saliendo del guion.

#### Scenario: Sala inválida
- **WHEN** una vista pide unirse a `hilo:123`
- **THEN** el cliente lo rechaza sin emitir nada al servidor

#### Scenario: Reconexión
- **WHEN** la conexión se pierde y se recupera con dos salas activas
- **THEN** el cliente vuelve a unirse a las dos

#### Scenario: Dejar la sala
- **WHEN** la última vista que usaba una sala se desmonta
- **THEN** el cliente emite `sala:salir` para esa sala una sola vez

#### Scenario: Evento mal formado
- **WHEN** en modo real llega `tramite:actualizado` con un trámite sin `estado`
- **THEN** el evento se descarta y la vista conserva su último estado válido

### Requirement: Contexto de consulta en modo real
En modo real, el hilo, el paciente y la sede que usan las vistas SHALL salir de la última respuesta de comando de la pestaña o, si no la hay, de la consulta `contextoDemo`. Un valor nulo MUST tratarse como "sin contexto": la vista muestra un estado que lo explica, no un error. En modo simulado el contexto sigue saliendo del guion.

#### Scenario: App en modo real
- **WHEN** se abre `/app` en modo real en una pestaña nueva y `contextoDemo` trae un `pacienteId`
- **THEN** la vista consulta las citas de ese paciente

#### Scenario: Contexto vacío
- **WHEN** `contextoDemo` responde con los tres valores nulos
- **THEN** las vistas que lo necesitan muestran el estado "sin contexto" con la opción de actualizar

#### Scenario: Respuesta de comando primero
- **WHEN** la pestaña ya recibió una respuesta de comando con un `hiloId`
- **THEN** las vistas usan ese hilo aunque `contextoDemo` indique otro

## MODIFIED Requirements

### Requirement: Guion simulado del Flujo A
El modo simulado SHALL reproducir el Flujo A de `PLAN.md` §12 como un guion fijo y compartido entre todas las vistas. El guion incluye:

- en el call center, la llamada con el ANI de demo, la cotización del paquete en Tepic y la solicitud de continuación por WhatsApp, que es la que genera el código;
- en WhatsApp, la continuación con el mensaje `CONTINUAR <código>` en el paso del horario y la verificación con un Flow;
- la cita confirmada con QR en la app y la llegada registrada en la clínica;
- la línea de tiempo y los eventos de tiempo real de cada paso.

El guion MUST poder reiniciarse y MUST usar solo datos ficticios.

#### Scenario: Continuidad simulada
- **WHEN** tras cotizar y solicitar la continuación en `/callcenter` se envía desde `/wa` el mensaje `CONTINUAR <código>` del guion
- **THEN** el primer mensaje del bot retoma en el horario y no vuelve a pedir servicio ni sede

#### Scenario: Código solo tras la solicitud
- **WHEN** el guion está en el paso de cotización y aún no recibe `SolicitarContinuacion`
- **THEN** la ficha no trae código de continuación

#### Scenario: Llamada con ANI
- **WHEN** el call center envía `IniciarTramite` sin `contacto` o con otro número distinto del de demo
- **THEN** el guion responde con el error `NO_DISPONIBLE` y la ayuda del paso, y no avanza

#### Scenario: Verificación con Flow
- **WHEN** el guion pide la verificación y recibe un `flowResponse` con todos los campos requeridos
- **THEN** avanza al paso de confirmación sin repetir ningún valor recibido en sus mensajes

#### Scenario: Flow incompleto
- **WHEN** el guion recibe un `flowResponse` sin un campo requerido
- **THEN** responde con un mensaje de ayuda válido y no avanza

#### Scenario: Eventos de tiempo real
- **WHEN** el guion confirma la cita
- **THEN** el cliente emite `tramite:actualizado` con el trámite en `CONFIRMADA` y `hilo:linea-tiempo` con el evento `CitaConfirmada`

#### Scenario: Reinicio del guion
- **WHEN** se reinicia el guion desde la navegación de demo
- **THEN** todas las vistas vuelven al primer paso y el historial de `/wa` se vacía, incluido el guardado en `sessionStorage`

#### Scenario: Fuera del guion
- **WHEN** en `/wa` se envía un texto que el guion no espera
- **THEN** el cliente responde con un mensaje de texto válido según el contrato que explica qué opciones hay, sin error
