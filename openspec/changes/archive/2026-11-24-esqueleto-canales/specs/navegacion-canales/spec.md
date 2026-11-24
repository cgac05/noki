# Spec Delta

## Purpose

Define las vistas de los canales y roles del demo en la aplicación web, cómo se navega entre ellas desde un celular y qué contenido mínimo muestra cada una, siempre a partir de los datos que entrega el cliente de API.

## ADDED Requirements

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

### Requirement: Contenido mínimo de cada vista
Cada ruta SHALL mostrar como mínimo: `/web` cotización por servicio y sede con un botón "Continuar en WhatsApp" que muestra el código de continuación; `/wa` una conversación que presenta mensajes de texto, botones y lista y permite enviar texto o elegir una opción; `/app` las citas del paciente con su estado y el QR de su token; `/callcenter` un botón "Llamada entrante", la ficha del hilo con su línea de tiempo y "Continuar por WhatsApp"; `/clinica` las llegadas esperadas y una acción para registrar una llegada; `/admin` el conteo de trámites por estado, la línea de tiempo de un hilo con el canal de cada evento y los KPIs disponibles; `/bandeja` los mensajes SMS y correo simulados.

#### Scenario: QR con token, no con folio
- **WHEN** `/app` muestra una cita confirmada
- **THEN** el QR codifica el token recibido del cliente, y el folio no aparece en el QR

#### Scenario: Línea de tiempo con canales
- **WHEN** `/admin` muestra el hilo del Flujo A tras el paso de WhatsApp
- **THEN** la línea de tiempo lista los eventos en orden con el canal de cada uno, incluido `CanalCambiado`

#### Scenario: Mensaje de lista
- **WHEN** `/wa` recibe un mensaje de lista con dos secciones
- **THEN** se muestran las secciones con sus filas, y elegir una fila envía su `payload`

#### Scenario: Flow fuera de alcance
- **WHEN** `/wa` recibe un mensaje de tipo `flow`
- **THEN** se muestra un aviso no interactivo de que esa captura llega con el simulador de WhatsApp, sin pedir los campos como texto libre

### Requirement: Datos sensibles no expuestos en las vistas
Ninguna vista SHALL mostrar fecha de nacimiento, correo, teléfono completo, RFC, PIN ni CURP. En `/bandeja` el contenido de un OTP simulado SHALL mostrarse solo en esa vista de demo.

#### Scenario: Ficha del call center
- **WHEN** `/callcenter` muestra la ficha del hilo
- **THEN** el teléfono aparece enmascarado salvo los últimos 4 dígitos y no aparece ninguna fecha de nacimiento

#### Scenario: Estados de carga y error
- **WHEN** el cliente tarda o falla
- **THEN** la vista muestra un estado de carga o un mensaje de error comprensible, sin detalles internos
