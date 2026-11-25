## ADDED Requirements

### Requirement: Terminar en la app una cita en proceso
Después de identificarse en `/app`, la vista SHALL mostrar «Citas por terminar» con los trámites `AGENDAR` en proceso (`BORRADOR`, `COTIZADO`, `LISTO_PARA_RESERVAR`, `HORARIO_RESERVADO`) del número (`sesionWebDemo.tramitesEnProceso`) y del paciente (`tramitesAbiertos`), sin duplicados, con servicio y sede cuando existan. Cada uno SHALL ofrecer «Termina tu cita», que muestra dentro de `/app` el asistente conversacional con el teléfono de la sesión, como en `/web`, con «Volver» a la lista. Si no hay trámites en proceso, la sección MUST NOT mostrarse. Aunque el número no tenga paciente vinculado, la vista SHALL mostrar sus trámites en proceso en lugar del mensaje de que no hay citas.

#### Scenario: Cita a medias
- **WHEN** el 3112111830 tiene un trámite `COTIZADO` y entra a `/app` con `prueba123`
- **THEN** ve «Citas por terminar» con ese estudio y, al pulsar «Termina tu cita», el asistente aparece dentro de `/app` y muestra el paso pendiente

#### Scenario: Sin paciente vinculado
- **WHEN** el número solo tiene un trámite en proceso sin paciente
- **THEN** se muestra ese trámite en «Citas por terminar» en lugar de «No encontramos citas para este número»

#### Scenario: Sin trámites en proceso
- **WHEN** el paciente solo tiene citas confirmadas o atendidas
- **THEN** no aparece «Citas por terminar» y las citas se muestran como antes
