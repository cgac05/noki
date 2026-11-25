# Spec Delta

## MODIFIED Requirements

### Requirement: Contexto de consulta en modo real
En modo real, el hilo, el paciente y la sede que usan las vistas SHALL salir de la última respuesta de comando de la pestaña o, si no la hay, de la consulta `contextoDemo`. Un valor nulo MUST tratarse como "sin contexto": la vista muestra un estado que lo explica, no un error.

`contextoDemo` SHALL volver a consultarse cada vez que se abre una vista que lo necesita, y las lecturas de la pestaña SHALL refrescarse después de cada respuesta exitosa de WhatsApp, igual que después de un comando. Ese refresco MUST NOT llevar contenido de los mensajes ni datos capturados.

En modo simulado el contexto sigue saliendo del guion.

#### Scenario: App en modo real
- **WHEN** se abre `/app` en modo real en una pestaña nueva y `contextoDemo` trae un `pacienteId`
- **THEN** la vista consulta las citas de ese paciente

#### Scenario: Contexto vacío
- **WHEN** `contextoDemo` responde con los tres valores nulos
- **THEN** las vistas que lo necesitan muestran el estado "sin contexto" con la opción de actualizar

#### Scenario: Respuesta de comando primero
- **WHEN** la pestaña ya recibió una respuesta de comando con un `hiloId`
- **THEN** las vistas usan ese hilo aunque `contextoDemo` indique otro

#### Scenario: Cita confirmada en la misma pestaña
- **WHEN** en una pestaña se abrió `/app` sin contexto, luego se confirma la cita en `/wa` y se vuelve a `/app` con la navegación de la aplicación
- **THEN** `/app` muestra la cita confirmada sin pulsar «Actualizar»

#### Scenario: Refresco tras un mensaje de WhatsApp
- **WHEN** `/wa` recibe una respuesta exitosa a un mensaje
- **THEN** las lecturas activas de la pestaña se vuelven a consultar, y un mensaje que falla no provoca refresco
