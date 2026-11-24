# Spec Delta

## Purpose

Define el simulador de WhatsApp de la web: cómo se conversa con el cerebro mediante el contrato de mensajes de WhatsApp, cómo se retoma una atención con un código de continuación y cómo se capturan datos protegidos sin exponerlos en el chat.

## ADDED Requirements

### Requirement: Historial de la conversación
El simulador SHALL mostrar en orden los mensajes enviados por el usuario y los mensajes del bot recibidos por `POST /api/canales/wa/mensajes`, por número de WhatsApp. El historial SHALL conservarse al cambiar de vista y al recargar la pestaña, guardado solo en `sessionStorage` con llave por número.

#### Scenario: Historial acumulado
- **WHEN** el usuario envía dos mensajes y el bot responde a cada uno
- **THEN** se ven los cuatro mensajes en orden, distinguiendo los del usuario y los del bot

#### Scenario: Cambio de vista y recarga
- **WHEN** el usuario sale de `/wa` a otra vista y regresa, o recarga la pestaña
- **THEN** el historial sigue igual

#### Scenario: Solo almacenamiento de sesión
- **WHEN** se inspecciona el almacenamiento del navegador después de conversar
- **THEN** el historial está solo en `sessionStorage`, y nada de la conversación aparece en `localStorage` ni en IndexedDB

### Requirement: Historial redactado
Lo que se guarda del historial SHALL contener solo burbujas ya redactadas: el resumen enmascarado del Flow y `CONTINUAR ••••` en lugar del código de continuación. Los valores capturados en el Flow y el código MUST NOT guardarse en ningún almacenamiento.

#### Scenario: Código de continuación redactado
- **WHEN** se envía `CONTINUAR <código>` y se inspecciona `sessionStorage`
- **THEN** la burbuja guardada dice `CONTINUAR ••••` y el código no aparece

### Requirement: Nueva conversación
El simulador SHALL ofrecer "Nueva conversación", que borra el historial del número activo de la pantalla y de `sessionStorage`. Reiniciar el guion simulado SHALL tener el mismo efecto.

#### Scenario: Borrar el historial
- **WHEN** el usuario pulsa "Nueva conversación"
- **THEN** la conversación queda vacía y `sessionStorage` ya no contiene el historial de ese número

### Requirement: Funciona igual en modo simulado y real
El simulador SHALL usar solo el envío de mensajes del contrato de WhatsApp y MUST NOT depender de consultas exclusivas de la demo.

#### Scenario: Modo real
- **WHEN** con el cliente real el usuario envía "Hola" y la API responde con mensajes válidos
- **THEN** la conversación los muestra sin necesitar ninguna otra consulta

### Requirement: Sin envíos dobles
Al tocar un botón, una fila de lista o "Enviar", los controles del mensaje SHALL deshabilitarse de inmediato hasta recibir la respuesta, y mientras tanto se SHALL mostrar un indicador "escribiendo…". Cada mensaje SHALL enviarse con su propio `Idempotency-Key`, que se reutiliza al reintentar ese mismo mensaje.

#### Scenario: Doble toque
- **WHEN** el usuario toca dos veces seguidas la misma opción
- **THEN** se envía un solo mensaje

#### Scenario: Reintento con la misma clave
- **WHEN** un mensaje falla por red y el usuario pulsa "Reintentar"
- **THEN** el reintento lleva el mismo `Idempotency-Key` que el intento original, y un mensaje nuevo lleva otro distinto

#### Scenario: Indicador de espera
- **WHEN** se envió un mensaje y la respuesta aún no llega
- **THEN** se muestra "escribiendo…" y desaparece al llegar la respuesta o el error

### Requirement: Continuación por enlace
Al abrir `/wa?continuar=<código>`, el simulador SHALL enviar una sola vez el texto `CONTINUAR <código>` desde el número elegido, mostrar la respuesta y retirar el parámetro con `history.replaceState`. La aplicación SHALL declarar `Referrer-Policy: no-referrer`. Un código vacío MUST NOT enviarse.

#### Scenario: Enlace del call center
- **WHEN** se abre `/wa?continuar=<código>` con un código válido
- **THEN** se envía `CONTINUAR <código>` una sola vez, el bot retoma el trámite y la URL queda como `/wa`

#### Scenario: Sin reenvío
- **WHEN** la vista se vuelve a renderizar o se recarga después del envío
- **THEN** el mensaje no se envía de nuevo

#### Scenario: Código inválido
- **WHEN** se abre `/wa?continuar=` sin código
- **THEN** no se envía nada y se muestra la conversación con la caja de texto

#### Scenario: Sin referer
- **WHEN** se inspecciona el documento de la aplicación
- **THEN** declara la política de referer `no-referrer`

### Requirement: Número de WhatsApp de demo
El simulador SHALL permitir elegir el número de WhatsApp con el que se conversa, validado con el patrón del contrato, con el número de la paciente de demo como valor inicial. Cambiar el número MUST mostrar el historial de ese número.

#### Scenario: Número inválido
- **WHEN** se escribe un número de 5 dígitos
- **THEN** el simulador no permite enviar y explica el formato

### Requirement: Botones y listas
Los mensajes de botones SHALL mostrar sus opciones (hasta 3) bajo el mensaje, y los mensajes de lista SHALL mostrarse con un botón que abre una hoja con sus secciones y filas. Elegir una opción MUST enviar su `payload` como `payloadBoton` y dejar en el historial el título elegido.

#### Scenario: Elegir una fila de lista
- **WHEN** el usuario abre la lista y elige una fila
- **THEN** se envía su `payload`, la hoja se cierra y el historial muestra el título de la fila como mensaje del usuario

#### Scenario: Opciones de mensajes anteriores
- **WHEN** el usuario intenta usar los botones de un mensaje que ya no es el último del bot
- **THEN** esos botones están deshabilitados

### Requirement: Modal tipo Flow
Un mensaje `flow` SHALL mostrar un botón que abre un modal con sus campos según su captura: `texto`, `fecha`, `sensitive` (entrada enmascarada) y `passcode` (entrada de PIN, sin valor inicial). El modal SHALL validar los campos requeridos, enviar `flowResponse` con el `id` de cada campo y poder cancelarse.

#### Scenario: Envío del Flow
- **WHEN** el usuario completa los campos requeridos y envía
- **THEN** se envía un `flowResponse` con un valor por `id` de campo y el modal se cierra

#### Scenario: Campo requerido vacío
- **WHEN** el usuario envía con un campo requerido vacío
- **THEN** no se envía nada y el campo indica el error

#### Scenario: Accesibilidad del modal
- **WHEN** el modal está abierto y el usuario pulsa Escape o Tab
- **THEN** Escape lo cierra sin enviar y Tab no sale del modal

### Requirement: Datos del Flow protegidos
Los valores capturados en el Flow MUST NOT aparecer en el historial, la consola, el almacenamiento del navegador ni los mensajes del bot. En el historial SHALL quedar solo un resumen con la etiqueta de cada campo y su valor enmascarado. Los valores SHALL descartarse al terminar el envío con éxito o al cerrar el modal.

#### Scenario: Resumen enmascarado
- **WHEN** el usuario envía un Flow con su fecha de nacimiento y su PIN
- **THEN** el historial muestra "Fecha de nacimiento ••••" y "PIN ••••", y ningún valor capturado aparece en el texto de la página ni en `sessionStorage`

#### Scenario: Valores descartados
- **WHEN** el usuario cancela el modal y lo vuelve a abrir
- **THEN** los campos están vacíos
