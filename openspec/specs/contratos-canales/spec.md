# contratos-canales Specification

## Purpose

Fija la forma compartida de lo que intercambian los canales con el cerebro (comandos, respuestas, siguiente pregunta, mensajes del bot, simulador de WhatsApp, tiempo real y errores) y el vocabulario de dominio que la sustenta, validable en ejecución y coherente entre backend y frontend.

## Requirements

### Requirement: Estados del trámite según el llenado de casillas
El dominio SHALL definir exactamente los estados `BORRADOR`, `COTIZADO`, `LISTO_PARA_RESERVAR`, `HORARIO_RESERVADO`, `CONFIRMADA`, `EN_CLINICA`, `ATENDIDA`, `CANCELADA`, `NO_ASISTIO` y `EXPIRADO` de `PLAN.md` §6. MUST NOT existir estados de versiones anteriores ni un estado de suspensión.

#### Scenario: Lista exacta de estados
- **WHEN** una prueba compara la lista de estados del dominio con la de `PLAN.md` §6
- **THEN** ambas contienen los mismos diez valores

#### Scenario: Estados obsoletos ausentes
- **WHEN** se busca `SUSPENDIDO`, `SERVICIO_SELECCIONADO`, `REQUISITOS_PENDIENTES` o `UBICACION_SELECCIONADA` entre los estados
- **THEN** no aparece ninguno

### Requirement: Casillas y tipo de trámite
El dominio SHALL definir las casillas `servicio`, `sede`, `paciente`, `requisitos`, `elegibilidad` y `horario`, y los tipos de trámite `AGENDAR`, `ADELANTO` y `FACTURA`. Todo trámite MUST llevar su tipo, para que un tipo nuevo se registre sin cambiar el núcleo.

#### Scenario: Casillas definidas
- **WHEN** una prueba lista las casillas del dominio
- **THEN** son exactamente las seis indicadas

#### Scenario: Trámite sin tipo
- **WHEN** se escribe una vista o un registro de trámite sin `tipo`
- **THEN** la verificación de tipos falla, y en la base la columna `tipo` es obligatoria

### Requirement: Envoltura común de eventos
Todo evento de dominio SHALL compartir los campos comunes de `PLAN.md` §7 (`tipo`, `tramiteId`, `hiloId`, `canal`, `actor`, `nivelAuth`, `version`, `correlationId`, `idempotencyKey`, `ts`) más un `payload` cuyo tipo depende del `tipo`. Los payloads MUST referenciar personas por ID y MUST NOT declarar datos sensibles.

#### Scenario: Payload ligado al tipo
- **WHEN** se construye un evento `CitaConfirmada` con el payload de otro tipo de evento
- **THEN** la verificación de tipos falla

#### Scenario: Exhaustividad
- **WHEN** una función recorre la unión de eventos con un `switch` sobre `tipo` y omite uno
- **THEN** la verificación de tipos falla

#### Scenario: Sin datos sensibles en payloads
- **WHEN** se inspeccionan los tipos de payload de todos los eventos definidos
- **THEN** ninguno declara `fechaNac`, `email`, `telefono`, `rfc`, `pin` ni `curp`

### Requirement: Contratos de API validables en ejecución
Los contratos de la API para canales SHALL publicarse como esquemas en un paquete independiente del dominio, del que se derivan los tipos. Una entrada que no cumple el esquema MUST ser rechazada al validarse, con un error que indica el campo.

#### Scenario: JSON mal formado rechazado
- **WHEN** se valida con el esquema de comando un objeto con `canal: "fax"`
- **THEN** la validación falla e indica el campo `canal`

#### Scenario: Tipos derivados del esquema
- **WHEN** se usa el tipo de comando en el frontend
- **THEN** proviene del mismo esquema que usa la validación, sin una declaración paralela

### Requirement: Comando y respuesta comunes a todos los canales
El esquema de `POST /api/comandos` SHALL aceptar `{ canal, actor, tipo, tramiteId?, hiloId?, payload }`, con `canal` en `web | whatsapp | app | callcenter | clinica` y `payload` determinado por `tipo`. La respuesta SHALL ser `{ tramite, siguientePregunta, eventos }` según `AGENTS.md` §7, y la vista del trámite MUST incluir su `tipo` y MUST NOT incluir datos sensibles.

#### Scenario: Payload ligado al comando
- **WHEN** se valida un comando `SeleccionarSede` con el payload de `SeleccionarServicio`
- **THEN** la validación falla

#### Scenario: Comando válido
- **WHEN** se valida un comando `SeleccionarServicio` con canal, actor y payload correctos
- **THEN** la validación tiene éxito y el resultado está tipado como ese comando

### Requirement: Siguiente pregunta con pista de interfaz
`SiguientePregunta` SHALL indicar la casilla a llenar y una pista de interfaz con el tipo de entrada (texto, botones, lista, modal tipo Flow o ninguna), las opciones cuando apliquen y qué campos se capturan como `sensitive` o `passcode`. La ausencia de casillas pendientes MUST representarse con una variante explícita de completo.

#### Scenario: Pregunta de captura sensible
- **WHEN** se valida una pregunta de datos del paciente con entrada modal tipo Flow y la fecha de nacimiento marcada `sensitive`
- **THEN** la validación tiene éxito

#### Scenario: Trámite completo
- **WHEN** no queda casilla pendiente
- **THEN** el valor es la variante de completo, distinguible por su discriminante

### Requirement: Modelo de mensaje del bot
El mensaje del bot SHALL ser una unión discriminada de texto, botones, lista y modal tipo Flow. Los botones MUST limitarse a 3 y las filas de lista a 10. Los campos del modal MUST declarar su tipo de captura, incluidos `passcode` y `sensitive`, y un campo `passcode` MUST NOT llevar valor inicial.

#### Scenario: Cuarto botón rechazado
- **WHEN** se valida un mensaje de botones con 4 botones
- **THEN** la validación falla

#### Scenario: Lista de once filas rechazada
- **WHEN** se valida un mensaje de lista con 11 filas en total
- **THEN** la validación falla

#### Scenario: PIN sin valor inicial
- **WHEN** se valida un campo `passcode` con valor inicial
- **THEN** la validación falla

### Requirement: Contrato del simulador de WhatsApp
El esquema de `POST /api/canales/wa/mensajes` SHALL aceptar `{ waId, texto?, payloadBoton?, flowResponse? }` con al menos uno de los tres opcionales, y la respuesta SHALL ser una lista de mensajes del bot. Es el mismo contrato que tendría el webhook real.

#### Scenario: Entrada vacía rechazada
- **WHEN** se valida una solicitud solo con `waId`
- **THEN** la validación falla

#### Scenario: Respuesta con mensajes del bot
- **WHEN** se valida una respuesta con un mensaje de texto y uno de botones
- **THEN** la validación tiene éxito

### Requirement: Tiempo real con nombres compartidos
Los nombres de eventos de Socket.IO, el esquema del dato de cada evento y las salas `tramite:<id>`, `hilo:<id>`, `paciente:<id>`, `sede:<id>` y `admin` SHALL definirse una sola vez en el paquete de contratos.

#### Scenario: Sala mal formada
- **WHEN** se valida una sala con un prefijo distinto de los cinco definidos
- **THEN** la validación falla

#### Scenario: Evento desconocido
- **WHEN** un cliente se suscribe con un nombre de evento que no está en las constantes
- **THEN** la verificación de tipos falla

### Requirement: Errores de dominio traducidos a HTTP
Cada error de dominio SHALL tener exactamente un código HTTP según `AGENTS.md` §6 (`ReglaViolada` 422, `StepUpRequerido` 403, `ConflictoVersion` 409, `NoEncontrado` 404, `TransicionInvalida` 409, validación 400). El cuerpo de error SHALL tener código y mensaje y MUST NOT incluir `stack` ni detalles internos.

#### Scenario: Mapeo completo
- **WHEN** se agrega un error de dominio nuevo sin entrada en el mapeo
- **THEN** la verificación de tipos falla

#### Scenario: Códigos esperados
- **WHEN** una prueba recorre el mapeo
- **THEN** cada error devuelve el código HTTP de `AGENTS.md` §6

#### Scenario: Sin detalles internos
- **WHEN** se valida con el esquema del cuerpo de error un objeto que incluye `stack`
- **THEN** el resultado validado no contiene `stack`

### Requirement: Vocabulario coherente entre dominio y contratos
Los enumerados que el paquete de contratos repite del dominio (canales, estados, casillas, tipos de trámite, códigos de error) MUST coincidir exactamente con los del dominio.

#### Scenario: Divergencia detectada
- **WHEN** se agrega un estado al dominio sin agregarlo al esquema de contratos
- **THEN** la prueba de coherencia o la verificación de tipos falla
