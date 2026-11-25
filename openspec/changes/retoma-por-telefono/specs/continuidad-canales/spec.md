## ADDED Requirements

### Requirement: Mismo número retoma una cita en proceso en cualquier canal
Cuando un paciente escribe por WhatsApp sin código de continuación desde un número cuyos últimos 10 dígitos coinciden con un contacto `whatsapp`, `callcenter` o `web` de un hilo con un trámite `AGENDAR` en proceso (`BORRADOR`, `COTIZADO`, `LISTO_PARA_RESERVAR` o `HORARIO_RESERVADO`), el sistema SHALL retomar ese trámite directamente, sin folio ni fecha de nacimiento (excepción a la prioridad 3 de «Resolución por prioridades», recogida en `PLAN.md §8`), eligiendo el más reciente que no esté en `BORRADOR` o, si todos lo están, el más reciente. Si el último canal era otro, SHALL registrarse `CanalCambiado{de, a: 'whatsapp', metodo: 'MISMO_NUMERO'}`. El aviso MUST limitarse a los datos de nivel 1 (servicio, sede, fecha y canal de origen). Esta vía MUST NOT vincular el contacto a un paciente ni registrar `IdentidadVinculada`, y MUST NOT aplicarse a trámites de otro tipo ni a `CONFIRMADA` o posteriores. En la sesión web de demo, al identificarse con un teléfono, esos mismos trámites SHALL listarse aunque no haya paciente vinculado; listarlos MUST NOT registrar eventos, y «Continúa donde lo dejaste» SHALL mostrar dentro de `/web` el asistente conversacional con el teléfono de la sesión, que retoma el trámite y permite completarlo (horario, preparación, datos y confirmación) sin salir de la web ni enviar `SolicitarContinuacion`.

#### Scenario: Llamada cortada sin botón y WhatsApp
- **WHEN** el asesor cotiza «Consulta nutricional» en «Clínica Bahía de Banderas» para la llamada del 3119990002, no pulsa ningún botón, y luego el `wa_id` 3119990002 escribe «Hola»
- **THEN** el bot dice que retoma ese trámite (servicio y sede), registra `CanalCambiado{de: 'callcenter', a: 'whatsapp', metodo: 'MISMO_NUMERO'}` y pregunta el día, sin volver a pedir servicio ni sede

#### Scenario: Con prefijo de país
- **WHEN** la llamada fue del 3119990002 y escribe el `wa_id` 523119990002
- **THEN** se retoma el mismo trámite

#### Scenario: Web tras llamada cortada
- **WHEN** tras la llamada del 3119990002 sin paciente identificado, alguien entra a `/web` con el teléfono 3119990002 y la contraseña de demo
- **THEN** ve el trámite en proceso con «Continúa donde lo dejaste», y al pulsarlo el asistente aparece dentro de `/web`, retoma ese trámite y muestra el paso pendiente

#### Scenario: Web con horario apartado
- **WHEN** el trámite del número está en `HORARIO_RESERVADO` y se pulsa «Continúa donde lo dejaste» en `/web`
- **THEN** no aparece el error «La acción no está permitida en el estado actual» y el asistente ofrece confirmar la cita dentro de `/web`

#### Scenario: Cita confirmada no se retoma por número
- **WHEN** el único trámite del número está `CONFIRMADA` y escribe por WhatsApp sin código
- **THEN** el comportamiento es el de antes (no se retoma por número)

#### Scenario: Sin vínculo y sin datos del paciente
- **WHEN** se retoma por número un trámite con paciente asignado
- **THEN** no se crea vínculo ni `IdentidadVinculada`, y el aviso no menciona al paciente
