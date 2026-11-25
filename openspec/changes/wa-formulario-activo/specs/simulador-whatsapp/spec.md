## ADDED Requirements

### Requirement: Formulario y alternativa activos en la misma respuesta
Los mensajes interactivos (Flow, botones y listas) que forman la última respuesta del bot, es decir, los recibidos después del último mensaje del usuario, SHALL estar habilitados a la vez, salvo mientras se envía un mensaje. Los mensajes interactivos de respuestas anteriores MUST seguir deshabilitados.

#### Scenario: CURP con alternativa
- **WHEN** el bot responde con el Flow «CURP» y después con el botón «No la tengo»
- **THEN** «Abrir formulario» abre el formulario de CURP y enviarlo manda `flowResponse` con la CURP capturada; «No la tengo» también está habilitado

#### Scenario: Apellido materno con alternativa
- **WHEN** el bot responde con el Flow «Apellido materno» y el botón «No tengo», y el usuario abre el formulario y escribe «Camberos»
- **THEN** se envía `flowResponse` con `apellidoMaterno: 'Camberos'`

#### Scenario: Respuestas anteriores
- **WHEN** el usuario ya respondió y el bot envió una respuesta nueva
- **THEN** el formulario y los botones de la respuesta anterior están deshabilitados
