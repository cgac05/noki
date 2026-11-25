# Spec Delta

## ADDED Requirements

### Requirement: Guion simulado del Flujo C
El modo simulado SHALL incluir, además del Flujo A, un guion fijo del Flujo C de `PLAN.md` §12, elegible desde la barra de demo; elegir un guion SHALL reiniciarlo desde su primer paso, y la barra SHALL indicar qué guion está activo. El guion del Flujo C incluye:

- en `/app`, la cita `CONFIRMADA` de Ana y su cancelación con `CancelarCita`, que el cliente rechaza con `STEP_UP_REQUERIDO` mientras espera la aprobación, igual que la API;
- en `/wa`, la solicitud de aprobación al número `5210000000001` por `wa:mensajes`, la aprobación con su botón, la oferta al número `5210000000002` por `wa:mensajes`, su aceptación con su botón y la oferta del horario anterior de Beto al número `5210000000003` (Carla);
- en `/admin`, el panel de huecos con el hueco liberado y su oferta, el hueco asignado y el horario anterior de Beto como hueco nuevo (efecto dominó), y los KPI del relleno de huecos.

Los mensajes del guion SHALL usar los textos y botones de D6 de `relleno-huecos` del frente A. Los mensajes de oferta MUST incluir solo servicio, sede, fecha y hora, sin datos de quien canceló, y el `payload` de sus botones MUST ser una referencia opaca. El guion MUST usar solo datos ficticios, MUST poder reiniciarse y sus lecturas y eventos MUST validarse con los contratos compartidos, como el del Flujo A.

#### Scenario: Elegir el Flujo C
- **WHEN** en la barra de demo se elige el Flujo C
- **THEN** la barra indica el Flujo C en su primer paso y `/app` muestra la cita `CONFIRMADA` de Ana con «Cancelar cita»

#### Scenario: Oferta tras la aprobación
- **WHEN** en el Flujo C se cancela en `/app` y se aprueba con el botón recibido en `5210000000001`
- **THEN** `5210000000002` recibe por `wa:mensajes` una oferta con servicio, sede, fecha, hora y botones, y el panel de huecos muestra el hueco `OFRECIDO`

#### Scenario: Efecto dominó
- **WHEN** en el Flujo C se acepta la oferta desde `5210000000002`
- **THEN** el panel muestra el hueco `ASIGNADO` con su oferta `ACEPTADA` y, antes que él, el hueco del horario anterior de Beto `OFRECIDO`, `5210000000003` recibe la oferta de ese horario y los KPI de huecos cambian

#### Scenario: Volver al Flujo A
- **WHEN** a mitad del Flujo C se elige el Flujo A
- **THEN** el Flujo A empieza en su primer paso y el historial de WhatsApp del guion anterior se limpia
