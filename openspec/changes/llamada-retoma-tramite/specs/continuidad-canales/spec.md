## ADDED Requirements

### Requirement: Llamada entrante retoma el trámite en proceso del número
Cuando un asesor recibe una llamada (`IniciarTramite` en `callcenter`, actor `asesor:*`, con `contacto`), el caso de uso SHALL buscar los hilos de los contactos `whatsapp` y `callcenter` cuyo valor coincide en sus últimos 10 dígitos con el número de la llamada y, entre sus trámites del mismo tipo en proceso (`BORRADOR`, `COTIZADO`, `LISTO_PARA_RESERVAR` o `HORARIO_RESERVADO`), SHALL retomar uno en lugar de crear otro: el más reciente que no esté en `BORRADOR` o, si todos están en `BORRADOR`, el más reciente. Al retomarlo, el hilo de ese trámite SHALL quedar con último canal `callcenter`; si el último canal del trámite era otro, SHALL registrarse `CanalCambiado{de: <canal anterior>, a: 'callcenter', metodo: 'LLAMADA_CC'}`; y la respuesta SHALL ser ese trámite con `siguientePregunta` calculada para `callcenter`, sin volver a pedir casillas llenas. Si no hay trámites en proceso, SHALL crear un trámite nuevo como hasta ahora. Esta vía MUST NOT vincular el contacto a un paciente ni registrar `IdentidadVinculada`, y MUST NOT considerar trámites `CONFIRMADA` o posteriores.

#### Scenario: Llamada tras cotizar en WhatsApp
- **WHEN** desde el `wa_id` `3112111818` se elige «Química sanguínea» en «Clínica Tepic» (trámite `COTIZADO`) y después el asesor recibe una llamada del `3112111818`
- **THEN** la respuesta es el mismo trámite `COTIZADO`, con `CanalCambiado{de: 'whatsapp', a: 'callcenter', metodo: 'LLAMADA_CC'}`, la siguiente pregunta no es servicio ni sede y no se crea ningún trámite nuevo

#### Scenario: Número con prefijo de país
- **WHEN** el trámite en proceso se inició desde el `wa_id` `5213112111818` y la llamada llega del `3112111818`
- **THEN** se retoma ese trámite

#### Scenario: Borrador vacío previo del call center
- **WHEN** el número ya tiene un trámite `BORRADOR` más reciente iniciado en `callcenter` y un trámite `COTIZADO` iniciado en `whatsapp`, y entra otra llamada
- **THEN** se retoma el trámite `COTIZADO` de `whatsapp` y no se crea otro trámite

#### Scenario: Sin trámite en proceso
- **WHEN** el número no tiene trámites en proceso, o solo tiene trámites `CONFIRMADA` o cerrados
- **THEN** se crea un trámite nuevo en el hilo del contacto `callcenter`, como antes

#### Scenario: Sin vínculo de identidad
- **WHEN** se retoma por llamada un trámite que tiene paciente asignado
- **THEN** no se guarda `IdentidadVinculada` ni se crea un vínculo del contacto `callcenter`

## MODIFIED Requirements

### Requirement: Último canal del hilo al iniciar un trámite
Iniciar un trámite en un hilo existente SHALL dejar como último canal del hilo el canal del comando, en la misma operación que guarda el trámite nuevo. Ese cambio MUST NOT registrar `CanalCambiado`, porque no continúa ningún trámite: el trámite nuevo tiene ese canal como origen. Una continuación posterior de cualquier trámite del hilo hacia otro canal SHALL registrar `CanalCambiado` con ese canal como `de`, según «Reanudación en el canal nuevo». Una llamada entrante con un trámite en proceso del mismo número no inicia un trámite: lo retoma según «Llamada entrante retoma el trámite en proceso del número».

#### Scenario: Llamada nueva tras continuar en WhatsApp
- **WHEN** un trámite del call center se continuó en WhatsApp con `CanalCambiado{de: 'callcenter', a: 'whatsapp'}`, quedó `CONFIRMADA` y después entra una llamada nueva desde el mismo número
- **THEN** se crea un trámite nuevo en el mismo hilo con canal de origen `callcenter`, el último canal del hilo es `callcenter` y no se guarda ningún `CanalCambiado` nuevo

#### Scenario: Segunda continuación cuenta como cambio de canal
- **WHEN** después de esa llamada el asesor emite un token de continuidad para el trámite nuevo y el paciente lo envía desde `whatsapp`
- **THEN** se guarda `CanalCambiado{de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC'}` y `cambiosCanal` aumenta en 1

#### Scenario: Mismo canal
- **WHEN** se inicia un trámite en un hilo cuyo último canal ya es el del comando
- **THEN** el hilo no cambia y no se guarda `CanalCambiado`
