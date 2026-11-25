## ADDED Requirements

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
