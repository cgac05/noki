# cliente-api-canales Specification

## Purpose

Define el único punto por el que las vistas de los canales hablan con el cerebro: una interfaz con modo simulado y modo real, validada contra los contratos compartidos, para que el frontend avance sin la API y se conecte a ella sin cambiar las vistas.

## Requirements

### Requirement: Interfaz única con dos modos
Las vistas SHALL acceder a comandos, mensajes de WhatsApp, consultas y eventos de tiempo real solo a través de una interfaz de cliente. El modo SHALL elegirse con `VITE_API` (`mock` o `real`, por defecto `mock`), y cambiarlo MUST NOT requerir cambios en ninguna vista. Un valor distinto MUST impedir el arranque con un mensaje claro.

#### Scenario: Cambio de modo sin tocar vistas
- **WHEN** se compila la web con `VITE_API=real` después de haberla usado con `mock`
- **THEN** la compilación termina sin modificar ningún archivo de vistas, y las vistas usan el cliente real

#### Scenario: Valor inválido
- **WHEN** se arranca con `VITE_API=prueba`
- **THEN** la aplicación muestra un error de configuración que indica los valores válidos

#### Scenario: Vistas sin acceso directo a la red
- **WHEN** se buscan llamadas a `fetch` o a Socket.IO en los archivos de vistas
- **THEN** no hay ninguna; solo el cliente las contiene

### Requirement: Respuestas validadas contra los contratos
En ambos modos el cliente SHALL validar con `@noki/contracts` toda respuesta de comando (`RespuestaComando`), de mensaje de WhatsApp (`RespuestaMensajeWa`), de error (`CuerpoError`) y todo dato de evento de tiempo real (`ESQUEMAS_EVENTOS_SOCKET`) antes de entregarlo a una vista. Una respuesta que no cumpla el esquema MUST convertirse en un error de contrato.

#### Scenario: Datos simulados válidos
- **WHEN** una prueba recorre todas las respuestas y eventos del guion simulado
- **THEN** cada uno cumple su esquema de `@noki/contracts`

#### Scenario: Respuesta real mal formada
- **WHEN** en modo real el servidor responde a un comando con un trámite sin `tipo`
- **THEN** la vista recibe un error de contrato y no un trámite parcial

#### Scenario: Comandos validados antes de enviarse
- **WHEN** una vista intenta enviar un comando con un canal fuera del contrato
- **THEN** el cliente lo rechaza sin hacer la petición

### Requirement: Modo real preparado para la API de comandos
El cliente real SHALL enviar comandos a `POST /api/comandos` y mensajes a `POST /api/canales/wa/mensajes`, con un `Idempotency-Key` UUID nuevo por intento lógico (reutilizado si ese intento se reenvía) y la URL base configurable. Los errores HTTP con cuerpo de contrato MUST llegar a la vista con su `codigo` y `mensaje`.

#### Scenario: Encabezado de idempotencia
- **WHEN** el cliente real envía un comando
- **THEN** la petición lleva un `Idempotency-Key` con formato UUID y el cuerpo del comando validado

#### Scenario: Reintento conserva la clave
- **WHEN** un comando falla por red y la vista lo reintenta
- **THEN** el reintento usa el mismo `Idempotency-Key`

#### Scenario: Conflicto de versión
- **WHEN** la API responde 409 con un cuerpo de error `CONFLICTO_VERSION`
- **THEN** la vista recibe ese código y su mensaje, sin `stack` ni detalles internos

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

### Requirement: Lecturas validadas con el contrato compartido
En ambos modos, el cliente SHALL validar toda respuesta de consulta con el esquema de la tabla de rutas de `@noki/contracts` antes de entregarla a una vista. Una respuesta que no cumpla el esquema MUST convertirse en un error de contrato.

#### Scenario: Datos simulados con el contrato compartido
- **WHEN** una prueba recorre todas las lecturas del guion simulado
- **THEN** cada una cumple el esquema de respuesta de su consulta en `@noki/contracts`

#### Scenario: Lectura real mal formada
- **WHEN** en modo real `GET /api/pacientes/:id/citas` devuelve una cita sin zona horaria
- **THEN** la vista recibe un error de contrato y no una cita parcial

### Requirement: Consultas reales según la tabla de rutas
El cliente real SHALL resolver cada consulta con la plantilla y los parámetros de la tabla de rutas del contrato, sin rutas escritas a mano en el cliente. Una consulta marcada como solo demo MUST devolver un error de no disponible cuando el cliente no está en modo demo.

#### Scenario: Ruta de la tabla
- **WHEN** el cliente real consulta `llegadasSede` con un `sedeId`
- **THEN** hace `GET` a la ruta que produce la tabla para ese `sedeId`

#### Scenario: Bandeja fuera de demo
- **WHEN** el cliente real consulta `bandeja` sin modo demo
- **THEN** devuelve un error de no disponible sin hacer la petición

### Requirement: Comandos armados por la vista
Las vistas que necesitan ejecutar una acción sobre una lectura SHALL armar el comando con el esquema de comandos a partir del dato elegido (por ejemplo, `RegistrarLlegada` con el token de la cita) y enviarlo por el cliente. El cliente MUST validar el comando antes de enviarlo.

#### Scenario: Registrar llegada desde la cita
- **WHEN** la recepción pulsa "Registrar llegada" en una llegada esperada
- **THEN** el cliente recibe `RegistrarLlegada` con el token de esa cita y el canal `clinica`

#### Scenario: Selección de catálogo en call center
- **WHEN** el asesor elige una oferta del catálogo
- **THEN** se envían los comandos de servicio y sede con los IDs de esa oferta, sin interpretar reglas de negocio

### Requirement: Tipos de demo aislados
Los tipos que solo existen para la demo (paso del guion y cotización de `/web`) SHALL vivir en un único módulo de demo del cliente, sin duplicar ningún esquema del contrato y sin datos sensibles.

#### Scenario: Sin duplicados del contrato
- **WHEN** se buscan en `apps/web` esquemas de catálogo, cita, ficha, llegada, bandeja o métricas
- **THEN** solo se importan de `@noki/contracts`

#### Scenario: Sin conversación de demo
- **WHEN** se buscan en el módulo de demo tipos o consultas de conversación de WhatsApp
- **THEN** no hay ninguno; la conversación sale de los mensajes enviados y sus respuestas

### Requirement: Modo simulado visible
Cuando el cliente está en modo simulado, todas las vistas SHALL mostrar una insignia visible "Modo simulado" que indique que las respuestas no vienen del cerebro real. El modo simulado sigue siendo el valor por defecto en desarrollo, pero la compilación de producción MUST fallar si `VITE_API` no está definido explícitamente.

#### Scenario: Insignia en modo simulado
- **WHEN** se abre cualquier vista con `VITE_API=mock` o sin definir en desarrollo
- **THEN** se ve la insignia "Modo simulado"

#### Scenario: Sin insignia en modo real
- **WHEN** se abre cualquier vista con `VITE_API=real`
- **THEN** la insignia no aparece

#### Scenario: Producción sin modo explícito
- **WHEN** se ejecuta la compilación de producción sin definir `VITE_API`
- **THEN** la compilación falla con un mensaje que pide elegir `mock` o `real`

### Requirement: Idempotencia de los mensajes de WhatsApp
El cliente SHALL enviar cada mensaje de WhatsApp con un `Idempotency-Key` UUID propio de ese mensaje, y SHALL reutilizarlo cuando ese mismo mensaje se reintenta, tanto en el reintento automático de red como en el que pide el usuario.

#### Scenario: Clave por mensaje
- **WHEN** el cliente real envía dos mensajes distintos
- **THEN** cada petición lleva un `Idempotency-Key` distinto

#### Scenario: Clave en el reintento
- **WHEN** el usuario reintenta un mensaje que falló
- **THEN** la petición lleva el mismo `Idempotency-Key` que el primer intento

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
