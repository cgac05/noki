## ADDED Requirements

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
