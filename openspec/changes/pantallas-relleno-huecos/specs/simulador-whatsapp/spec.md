# Spec Delta

## ADDED Requirements

### Requirement: Mensajes que inicia la empresa
El simulador SHALL agregar al historial de cada número los mensajes recibidos por `wa:mensajes` para ese `waId`, como mensajes del bot y en el orden en que llegan, con las mismas reglas de botones, listas y redacción que los mensajes de respuesta. La aplicación SHALL escuchar la sala `wa:<waId>` de los números de la sesión (los números de demo `5210000000001` y `5210000000002`, más cualquier otro con el que se haya conversado en la pestaña), mientras la pestaña esté abierta y aunque la vista activa no sea `/wa`. Un mensaje para un número fuera de la sesión MUST NOT aparecer en ningún historial. Cuando un número de la sesión distinto del que se muestra recibe mensajes, `/wa` SHALL avisar qué número tiene mensajes nuevos y permitir cambiar a él.

#### Scenario: Oferta recibida en el número activo
- **WHEN** `/wa` muestra el número `5210000000002` y llega `wa:mensajes` para ese número con un mensaje de botones
- **THEN** el mensaje aparece al final del historial como mensaje del bot, sus botones están habilitados y elegir uno envía su `payload` como `payloadBoton`

#### Scenario: Mensaje recibido fuera de `/wa`
- **WHEN** la pestaña está en `/app` y llega `wa:mensajes` para el número de demo
- **THEN** al abrir `/wa` con ese número el mensaje está en el historial

#### Scenario: Mensaje para otro número de la sesión
- **WHEN** `/wa` muestra el número de demo y llega `wa:mensajes` para `5210000000002`
- **THEN** el historial visible no cambia, `/wa` avisa que `5210000000002` tiene mensajes nuevos y, al elegir el aviso, muestra ese historial con el mensaje

#### Scenario: Número ajeno a la sesión
- **WHEN** llega `wa:mensajes` para `5210000000009`, que no es de demo y con el que no se conversó en la pestaña
- **THEN** ningún historial cambia y no hay aviso

#### Scenario: Botones de un mensaje anterior
- **WHEN** después de un mensaje recibido por `wa:mensajes` llega otro mensaje del bot
- **THEN** los botones del primero quedan deshabilitados
