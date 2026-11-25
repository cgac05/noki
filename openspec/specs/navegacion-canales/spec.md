# navegacion-canales Specification

## Purpose

Define las vistas de los canales y roles del demo en la aplicación web, cómo se navega entre ellas desde un celular y qué contenido mínimo muestra cada una, siempre a partir de los datos que entrega el cliente de API.

## Requirements

### Requirement: Rutas de canales y roles
La aplicación web SHALL ofrecer las rutas `/web`, `/wa`, `/app`, `/callcenter`, `/clinica`, `/admin` y `/bandeja`, más una portada en `/`. Una ruta desconocida MUST mostrar una vista de "no encontrado" con enlace a la portada, sin error en consola.

#### Scenario: Cada ruta renderiza
- **WHEN** se abre cada una de las siete rutas en modo simulado
- **THEN** cada una muestra su título de canal o rol y su contenido mínimo, sin errores en consola

#### Scenario: Ruta desconocida
- **WHEN** se abre `/inexistente`
- **THEN** se muestra la vista de no encontrado con un enlace a `/`

#### Scenario: Enlace directo
- **WHEN** se recarga el navegador estando en `/wa`
- **THEN** la vista de `/wa` se muestra directamente, sin pasar por la portada

### Requirement: Diseño móvil primero
Todas las vistas SHALL poder usarse con un ancho de 375 px sin desplazamiento horizontal. Los controles interactivos MUST tener un área táctil mínima de 44 × 44 px y ser operables con teclado.

#### Scenario: Celular del jurado
- **WHEN** se abre cualquier ruta con una ventana de 375 × 812 px
- **THEN** no hay desplazamiento horizontal y todos los botones principales son visibles y pulsables

#### Scenario: Escritorio
- **WHEN** se abre cualquier ruta con una ventana de 1280 px de ancho
- **THEN** el contenido se presenta legible y sin estirarse a todo el ancho

#### Scenario: Navegación con teclado
- **WHEN** se recorre una vista con la tecla Tab
- **THEN** cada control recibe foco visible en orden de lectura

### Requirement: Navegación de demo entre canales
Toda vista SHALL incluir una navegación compacta hacia los demás canales y una indicación del paso actual del Flujo A según el cliente. La navegación MUST conservar el estado del guion al cambiar de vista.

#### Scenario: Cambio de canal conserva el estado
- **WHEN** en `/callcenter` se avanza el guion hasta "Continuar por WhatsApp" y luego se navega a `/wa` con la barra de demo
- **THEN** `/wa` muestra la conversación en el paso del horario, sin reiniciar el guion

#### Scenario: Paso actual visible
- **WHEN** el guion está en el paso de la clínica
- **THEN** la barra de demo marca ese paso en cualquier vista abierta

### Requirement: Vistas sin lógica de negocio
Las vistas SHALL obtener todo estado de trámite, mensajes, eventos y métricas del cliente de API, y MUST NOT calcular estados, siguientes preguntas, políticas de identidad ni disponibilidad. Las vistas solo formatean y envían comandos.

#### Scenario: Estado desde el cliente
- **WHEN** el cliente devuelve un trámite en estado `CONFIRMADA`
- **THEN** la vista muestra ese estado tal como llega, sin derivarlo de otros datos

#### Scenario: Interfaz guiada por la siguiente pregunta
- **WHEN** el cliente devuelve una `SiguientePregunta` con entrada `BOTONES` y tres opciones
- **THEN** la vista presenta exactamente esas tres opciones, y al elegir una envía su `payload` sin interpretarlo

### Requirement: Datos sensibles no expuestos en las vistas
Ninguna vista SHALL mostrar fecha de nacimiento, correo, teléfono completo, RFC, PIN ni CURP. En `/bandeja` el contenido de un OTP simulado SHALL mostrarse solo en esa vista de demo.

#### Scenario: Ficha del call center
- **WHEN** `/callcenter` muestra la ficha del hilo
- **THEN** el teléfono aparece enmascarado salvo los últimos 4 dígitos y no aparece ninguna fecha de nacimiento

#### Scenario: Estados de carga y error
- **WHEN** el cliente tarda o falla
- **THEN** la vista muestra un estado de carga o un mensaje de error comprensible, sin detalles internos

### Requirement: Contenido mínimo por vista
Cada ruta SHALL mostrar como mínimo:

- `/web`: cotización por servicio y sede con un botón "Continuar en WhatsApp" que muestra el código de continuación.
- `/wa`: el simulador de WhatsApp de la capacidad `simulador-whatsapp`.
- `/app`: las citas del paciente con su estado y el QR de su token.
- `/callcenter`, `/clinica` y `/admin`: lo que define la capacidad `consolas-internas`.
- `/bandeja`: los mensajes SMS y correo simulados.

#### Scenario: QR con token, no con folio
- **WHEN** `/app` muestra una cita confirmada
- **THEN** el QR codifica el token recibido del cliente, y el folio no aparece en el QR

#### Scenario: Línea de tiempo con canales
- **WHEN** `/admin` muestra el hilo del Flujo A tras el paso de WhatsApp
- **THEN** la línea de tiempo lista los eventos en orden con el canal de cada uno, incluido `CanalCambiado`

#### Scenario: Mensaje de lista
- **WHEN** `/wa` recibe un mensaje de lista con dos secciones
- **THEN** se muestran las secciones con sus filas, y elegir una fila envía su `payload`

#### Scenario: Flow con modal
- **WHEN** `/wa` recibe un mensaje de tipo `flow`
- **THEN** se ofrece abrir un modal con sus campos, nunca se piden esos datos como texto libre en el chat

#### Scenario: Enlace de continuación en el call center
- **WHEN** `/callcenter` recibe el código de continuación después de enviar `SolicitarContinuacion`
- **THEN** "Continuar por WhatsApp" muestra el enlace `/wa?continuar=<código>` y su QR, y la vista no cambia el estado del trámite por su cuenta

### Requirement: Cancelar una cita desde la app
`/app` SHALL ofrecer «Cancelar cita» en cada cita en estado `CONFIRMADA` y en ninguna otra. Al pulsarlo SHALL pedir confirmación en la propia vista; solo al confirmar SHALL enviar por el cliente `CancelarCita` con canal `app`, actor `paciente` y el trámite de esa cita, una sola vez aunque se pulse varias veces. Si el cliente rechaza el comando con el código `STEP_UP_REQUERIDO`, la vista SHALL indicar que la cancelación espera aprobación en WhatsApp, con un enlace a `/wa`, sin mostrarlo como error, y la cita SHALL seguir ofreciendo «Cancelar cita» para pedir otra aprobación con un comando nuevo. Si el cliente responde con el trámite `CANCELADA`, SHALL indicar que la cita se canceló. Cualquier otro fallo SHALL mostrarse como error con la opción de reintentar el mismo comando. La vista MUST NOT cambiar por sí misma el estado de la cita.

#### Scenario: Cancelación pendiente de aprobación
- **WHEN** en una cita `CONFIRMADA` se pulsa «Cancelar cita», se confirma y el cliente rechaza el comando con `STEP_UP_REQUERIDO`
- **THEN** el cliente recibió un solo `CancelarCita` con canal `app`, actor `paciente` y el trámite de la cita, la vista indica sin error que la cancelación espera aprobación en WhatsApp con un enlace a `/wa`, y la cita se muestra igual

#### Scenario: Pedir otra aprobación
- **WHEN** tras quedar pendiente de aprobación se vuelve a pulsar «Cancelar cita» y se confirma
- **THEN** el cliente recibe otro `CancelarCita` con una clave de idempotencia distinta de la primera

#### Scenario: Desistir de cancelar
- **WHEN** se pulsa «Cancelar cita» y después se elige no cancelar
- **THEN** no se envía ningún comando y la cita se muestra igual

#### Scenario: Cita no confirmada
- **WHEN** `/app` muestra una cita en estado `ATENDIDA`
- **THEN** la cita no ofrece «Cancelar cita»

#### Scenario: Error al cancelar
- **WHEN** el envío de `CancelarCita` falla por red
- **THEN** la vista muestra el error y reintentar envía el mismo comando con la misma clave de idempotencia

### Requirement: Cotización web en modo real
Con el cliente real, `/web` SHALL ofrecer elegir servicio y sede a partir de la consulta `catalogo` y mostrar su precio. Al cotizar SHALL enviar `IniciarTramite` (tipo `AGENDAR`, canal `web`, actor `paciente`) si la vista aún no tiene trámite, y después `SeleccionarServicio` y `SeleccionarSede` sobre ese trámite, una sola vez aunque se pulse varias veces. «Continuar en WhatsApp» SHALL enviar `SolicitarContinuacion` con destino `whatsapp` y mostrar el código de continuación, el enlace `/wa?continuar=<código>` y su QR. La vista MUST NOT usar datos del cliente simulado en modo real ni cambiar por sí misma el estado del trámite. En modo simulado la vista SHALL seguir funcionando como antes.

#### Scenario: Cotizar y continuar con la API real
- **WHEN** con `VITE_API=real` el paciente abre `/web`, elige un servicio y una sede del catálogo, pulsa «Cotizar» y luego «Continuar en WhatsApp»
- **THEN** se envían `IniciarTramite`, `SeleccionarServicio`, `SeleccionarSede` y `SolicitarContinuacion` en ese orden, se muestra el precio y aparece el enlace `/wa?continuar=<código>` con su QR

#### Scenario: Sin mensaje de consulta no disponible
- **WHEN** `/web` se abre con el cliente real
- **THEN** no aparece «Esta consulta aún no está disponible en la API»

#### Scenario: Continuación en WhatsApp
- **WHEN** se abre el enlace de continuación de `/web` en `/wa` con la API real
- **THEN** WhatsApp retoma la cotización de la web, como con el código de `/callcenter`

### Requirement: Actor de recepción por sede
`/clinica` SHALL enviar `RegistrarLlegada` y `CerrarAtencion` con actor `recepcion:<sedeId>` de la sede de la cita, y MUST NOT usar un actor fijo de otra sede.

#### Scenario: Llegada en Bahía de Banderas
- **WHEN** recepción registra la llegada de una cita de la sede Bahía de Banderas
- **THEN** el comando lleva el actor `recepcion:` seguido del `sedeId` de esa sede

### Requirement: Continuación solicitada por el paciente desde web
El núcleo SHALL aceptar `SolicitarContinuacion` con canal `web` y actor `paciente`, además de canal `callcenter` con actor `asesor:*`, y SHALL rechazar cualquier otra combinación con `CONTINUACION_SOLO_ASESOR`. El código de continuación de un trámite iniciado en web SHALL emitirse con canal de origen `web` y método `TOKEN_WEB`.

#### Scenario: Paciente web solicita continuar
- **WHEN** un paciente envía `SolicitarContinuacion` con canal `web` sobre su trámite web
- **THEN** se registra `ConsentimientoContactoWA` y la ficha del hilo devuelve un `codigoContinuacion` con origen `web`

#### Scenario: Otro canal sin asesor
- **WHEN** se envía `SolicitarContinuacion` con canal `wa` y actor `paciente`
- **THEN** se rechaza con `CONTINUACION_SOLO_ASESOR`

#### Scenario: Call Center sin cambios
- **WHEN** un asesor del Call Center solicita la continuación
- **THEN** el código se emite con origen `callcenter` y método `TOKEN_CC`, como antes
