## ADDED Requirements

### Requirement: Completar la cita desde el call center
Con una llamada activa en `/callcenter` y un trámite `AGENDAR` en proceso en la ficha, la vista SHALL ofrecer «Completar la cita aquí», que muestra dentro de la ficha el asistente conversacional con el número de la llamada (ANI) como número de conversación y envía automáticamente una sola vez «Hola», para que el asesor complete con el paciente el horario, la preparación, los datos y la confirmación sin salir del call center. Sin ANI de la pestaña la opción MUST NOT mostrarse.

#### Scenario: Completar tras identificar
- **WHEN** el asesor atiende la llamada del 3119990003, cotiza un servicio y pulsa «Completar la cita aquí»
- **THEN** el asistente aparece en la ficha con el número 3119990003, retoma ese trámite y muestra el paso pendiente (el día), y el asesor puede llegar a «Confirmar cita» desde `/callcenter`

#### Scenario: Sin llamada en la pestaña
- **WHEN** la ficha no viene de una llamada iniciada en esa pestaña
- **THEN** no se muestra «Completar la cita aquí»
