## ADDED Requirements

### Requirement: Último canal del hilo al iniciar un trámite
Iniciar un trámite en un hilo existente SHALL dejar como último canal del hilo el canal del comando, en la misma operación que guarda el trámite nuevo. Ese cambio MUST NOT registrar `CanalCambiado`, porque no continúa ningún trámite: el trámite nuevo tiene ese canal como origen. Una continuación posterior de cualquier trámite del hilo hacia otro canal SHALL registrar `CanalCambiado` con ese canal como `de`, según «Reanudación en el canal nuevo».

#### Scenario: Llamada nueva tras continuar en WhatsApp
- **WHEN** un trámite del call center se continuó en WhatsApp con `CanalCambiado{de: 'callcenter', a: 'whatsapp'}` y después entra una llamada nueva desde el mismo número
- **THEN** se crea un trámite nuevo en el mismo hilo con canal de origen `callcenter`, el último canal del hilo es `callcenter` y no se guarda ningún `CanalCambiado` nuevo

#### Scenario: Segunda continuación cuenta como cambio de canal
- **WHEN** después de esa llamada el asesor emite un token de continuidad para el trámite nuevo y el paciente lo envía desde `whatsapp`
- **THEN** se guarda `CanalCambiado{de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC'}` y `cambiosCanal` aumenta en 1

#### Scenario: Mismo canal
- **WHEN** se inicia un trámite en un hilo cuyo último canal ya es el del comando
- **THEN** el hilo no cambia y no se guarda `CanalCambiado`
