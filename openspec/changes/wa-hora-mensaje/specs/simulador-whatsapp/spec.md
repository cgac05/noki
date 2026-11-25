## ADDED Requirements

### Requirement: Hora de envío en cada mensaje
Cada burbuja del chat (en `/wa` y en el asistente de `/web`, `/app` y `/callcenter`) SHALL mostrar en su esquina inferior derecha la hora en que se envió o recibió, en formato `HH:MM` de 24 horas y hora local del navegador. La hora SHALL guardarse con la entrada del historial (`enviadoEn`) en el momento de crearla, de modo que no cambie al volver a pintar ni al recargar la pestaña. Las entradas guardadas sin `enviadoEn` MUST seguir cargándose y mostrarse sin hora. Un reintento MUST conservar la hora original de la burbuja.

#### Scenario: Mensaje del usuario
- **WHEN** el usuario envía «Hola» a las 09:05 del navegador
- **THEN** su burbuja muestra «09:05» en la esquina inferior derecha

#### Scenario: Respuesta del bot
- **WHEN** la respuesta del bot llega a las 09:06
- **THEN** cada burbuja del bot de esa respuesta muestra «09:06»

#### Scenario: Recarga
- **WHEN** se recarga la pestaña
- **THEN** las burbujas conservan sus horas originales

#### Scenario: Historial anterior
- **WHEN** el historial guardado tiene entradas sin `enviadoEn`
- **THEN** se cargan sin error y se muestran sin hora
