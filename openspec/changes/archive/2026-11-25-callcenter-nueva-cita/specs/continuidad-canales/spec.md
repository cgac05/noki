## ADDED Requirements

### Requirement: Llamada entrante con cita nueva
Cuando un asesor envía `IniciarTramite` en `callcenter` con `contacto` y `nuevo: true`, el caso de uso MUST NOT retomar el trámite en proceso del número: SHALL crear un trámite nuevo en el hilo del contacto `callcenter`. Si el trámite en proceso que se habría retomado tiene paciente asignado, el trámite nuevo SHALL quedar con ese mismo paciente (`PacienteAsignado`), sin pedir otra vez la identificación y sin registrar `IdentidadVinculada`. El trámite en proceso MUST quedar sin cambios.

#### Scenario: Nueva cita con paciente identificado
- **WHEN** el número 3119990004 tiene un trámite `COTIZADO` con paciente asignado y el asesor envía `IniciarTramite` con ese contacto y `nuevo: true`
- **THEN** se crea otro trámite (`TramiteIniciado`) con el mismo paciente asignado, la siguiente pregunta no es la del paciente, y el trámite anterior conserva su estado y versión

#### Scenario: Nueva cita sin paciente
- **WHEN** el trámite en proceso no tiene paciente
- **THEN** se crea el trámite nuevo sin paciente y la siguiente pregunta sigue el orden normal

#### Scenario: Sin la bandera no cambia
- **WHEN** se envía `IniciarTramite` sin `nuevo`
- **THEN** se retoma el trámite en proceso como antes
