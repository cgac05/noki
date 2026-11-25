# Spec Delta

## ADDED Requirements

### Requirement: Panel de huecos en el tablero
`/admin` SHALL mostrar una sección «Panel de huecos» con la lectura `panelHuecos`, en el orden recibido. Cada hueco SHALL mostrar servicio, sede, fecha y hora en la zona de la sede, y su estado con un nombre legible en español; sus ofertas SHALL listarse en el orden recibido con su estado legible y las horas de envío y de vencimiento. La sección SHALL actualizarse sin recargar al recibir eventos de la sala `admin`. La vista MUST NOT reordenar, filtrar ni derivar estados de huecos u ofertas, y MUST NOT mostrar datos de pacientes ni el canal de la oferta. Las cuatro claves de KPI del relleno de huecos documentadas en `docs/contratos.md` (`huecosLiberados`, `huecosRecuperados`, `horasRecursoRecuperadas`, `diasAdelantadosPromedio`) SHALL mostrarse con un nombre legible en español, según el requisito «Tablero de administración».

#### Scenario: Hueco ofrecido
- **WHEN** `panelHuecos` trae un hueco `OFRECIDO` con una oferta `OFRECIDA`
- **THEN** el panel muestra el servicio, la sede, la fecha en la zona de la sede, el estado legible del hueco y una oferta con su estado legible, su envío y su vencimiento

#### Scenario: Sin huecos
- **WHEN** `panelHuecos` responde una lista vacía
- **THEN** el panel indica que no hay huecos liberados y el resto del tablero se muestra igual

#### Scenario: Error del panel
- **WHEN** la lectura `panelHuecos` falla
- **THEN** la sección muestra el error con la opción de reintentar y las demás secciones del tablero siguen visibles

#### Scenario: Panel en vivo
- **WHEN** `/admin` está abierta y llega un evento de la sala `admin`
- **THEN** el panel vuelve a leer `panelHuecos` y muestra el nuevo estado sin recargar

#### Scenario: KPI del relleno de huecos
- **WHEN** las métricas traen `horasRecursoRecuperadas`
- **THEN** el tablero lo muestra con un nombre legible y su valor
