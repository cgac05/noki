# Spec Delta

## MODIFIED Requirements

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
