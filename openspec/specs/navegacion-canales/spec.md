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

### Requirement: Pago simulado en la web
Con el cliente real, `/web` SHALL abrir con «Paga tu cita»: pide el teléfono del paciente (10 a 15 dígitos, mostrado enmascarado salvo los últimos 4) y, con `VITE_DEMO=true`, usa `contextoDemo` para consultar `citasPaciente` como sesión ya validada (simulación). Por cada cita `CONFIRMADA` SHALL mostrar servicio, sede, fecha en la sede y el precio del catálogo, con «Pagar con CoDi», que muestra un QR genérico sin datos personales; activar el QR (clic, Enter o Espacio) SHALL marcar la cita como pagada en el navegador y mostrar un recibo simulado con la leyenda de que no se realiza ningún cobro. Cada paso SHALL ofrecer «Volver». El pago MUST NOT enviar comandos ni cambiar el estado del trámite. La cotización con teléfono SHALL seguir disponible como opción secundaria.

#### Scenario: Pagar con CoDi
- **WHEN** el paciente escribe su teléfono, ve su cita confirmada y activa el QR de «Pagar con CoDi»
- **THEN** la cita aparece como pagada con un recibo simulado y no se envía ningún comando

#### Scenario: Volver sin pagar
- **WHEN** el paciente abre el QR y pulsa «Volver»
- **THEN** regresa a sus citas sin marcar pago

#### Scenario: Sin contexto
- **WHEN** no hay paciente en `contextoDemo` o el modo demo está apagado
- **THEN** la vista indica que no hay citas pendientes y enlaza a WhatsApp y Call Center

### Requirement: Sesión de paciente en la web (demo)
Con `VITE_DEMO=true` y la API en `DEMO_MODE`, `/web` SHALL abrir con «Identifícate» (teléfono y contraseña de demostración `prueba123`). Con datos válidos SHALL buscar al paciente por teléfono y mostrar sus trámites abiertos con «Continúa donde lo dejaste», sus citas confirmadas con «Pagar con CoDi» e «Iniciar un trámite nuevo», que crea el trámite ligado al paciente sin pedir otra vez su identidad. Cada paso SHALL ofrecer «Volver». La contraseña MUST NOT enviarse a la API. Fuera de demo la consulta de sesión MUST NOT estar disponible.

#### Scenario: Entrar y continuar
- **WHEN** el paciente con un trámite abierto entra con su teléfono y `prueba123` y pulsa «Continúa donde lo dejaste»
- **THEN** se obtiene el código de continuación y se ofrece abrir `/wa?continuar=<código>`

#### Scenario: Contraseña incorrecta
- **WHEN** la contraseña no es `prueba123`
- **THEN** no se consulta la API y se indica el error

#### Scenario: Trámite nuevo identificado
- **WHEN** el paciente pulsa «Iniciar un trámite nuevo»
- **THEN** el trámite queda con su `pacienteId` sin pasos de identificación

#### Scenario: Teléfono desconocido
- **WHEN** no hay paciente para ese teléfono
- **THEN** se indica que no encontramos su registro y se enlaza a WhatsApp y Call Center

### Requirement: Identificación en la app de demo
En modo demo, `/app` SHALL pedir teléfono (10 a 15 dígitos) y la contraseña de demostración antes de mostrar citas, con el mismo formulario y validación que `/web`, y SHALL obtener el paciente con la consulta `sesionWebDemo`. Con paciente, SHALL mostrar sus citas (`citasPaciente`) con estado, QR y «Cancelar cita» según los requisitos vigentes; sin paciente vinculado o con 404, SHALL indicar que no hay citas para ese número con enlaces a `/web` y `/wa`. «Salir» SHALL volver a la identificación para consultar otro número. Una contraseña distinta MUST rechazarse sin consultar la API.

#### Scenario: Entrar con un número
- **WHEN** en `/app` se escribe `5210000000001` y `prueba123`
- **THEN** se muestran las citas de Ana con su QR

#### Scenario: Cambiar de número
- **WHEN** después se pulsa «Salir» y se entra con `5210000000002`
- **THEN** se muestran las citas de Beto y ya no las de Ana

#### Scenario: Contraseña incorrecta
- **WHEN** se escribe otra contraseña
- **THEN** se muestra «Contraseña incorrecta.» y no se consulta la API

#### Scenario: Número sin registro
- **WHEN** el número no tiene paciente vinculado
- **THEN** se indica que no hay citas para ese número, con enlaces a `/web` y `/wa`

### Requirement: Terminar en la app una cita en proceso
Después de identificarse en `/app`, la vista SHALL mostrar «Citas por terminar» con los trámites `AGENDAR` en proceso (`BORRADOR`, `COTIZADO`, `LISTO_PARA_RESERVAR`, `HORARIO_RESERVADO`) del número (`sesionWebDemo.tramitesEnProceso`) y del paciente (`tramitesAbiertos`), sin duplicados, con servicio y sede cuando existan. Cada uno SHALL ofrecer «Termina tu cita», que muestra dentro de `/app` el asistente conversacional con el teléfono de la sesión, como en `/web`, con «Volver» a la lista. Si no hay trámites en proceso, la sección MUST NOT mostrarse. Aunque el número no tenga paciente vinculado, la vista SHALL mostrar sus trámites en proceso en lugar del mensaje de que no hay citas.

#### Scenario: Cita a medias
- **WHEN** el 3112111830 tiene un trámite `COTIZADO` y entra a `/app` con `prueba123`
- **THEN** ve «Citas por terminar» con ese estudio y, al pulsar «Termina tu cita», el asistente aparece dentro de `/app` y muestra el paso pendiente

#### Scenario: Sin paciente vinculado
- **WHEN** el número solo tiene un trámite en proceso sin paciente
- **THEN** se muestra ese trámite en «Citas por terminar» en lugar de «No encontramos citas para este número»

#### Scenario: Sin trámites en proceso
- **WHEN** el paciente solo tiene citas confirmadas o atendidas
- **THEN** no aparece «Citas por terminar» y las citas se muestran como antes
