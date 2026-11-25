## ADDED Requirements

### Requirement: Elegir entre continuar o nueva cita en la llamada
Cuando «Llamada entrante» retoma un trámite en proceso (la respuesta no incluye `TramiteIniciado`), `/callcenter` SHALL mostrar «Este número tiene un estudio en proceso: <servicio> en <sede>» con «Continuar con este estudio» y «Nueva cita». «Continuar con este estudio» SHALL conservar el trámite retomado. «Nueva cita» SHALL enviar una sola vez `IniciarTramite` con el mismo número y `nuevo: true`, y la ficha SHALL pasar al trámite nuevo. Si la llamada creó un trámite nuevo, el aviso MUST NOT mostrarse.

#### Scenario: Continuar con el estudio
- **WHEN** el asesor recibe la llamada de un número con un estudio cotizado y pulsa «Continuar con este estudio»
- **THEN** la ficha sigue con ese trámite y no se envía otro comando

#### Scenario: Nueva cita
- **WHEN** el asesor pulsa «Nueva cita»
- **THEN** se envía `IniciarTramite` con `nuevo: true` una sola vez y la ficha muestra el trámite nuevo, con el paciente ya asignado si el anterior lo tenía

#### Scenario: Llamada sin trámite en proceso
- **WHEN** la llamada crea un trámite nuevo
- **THEN** no aparece el aviso

### Requirement: Validación de la fecha de nacimiento por el asesor
Cuando la consulta `fechaNacimientoLlamada` devuelve una fecha, `/callcenter` SHALL mostrar la fecha de nacimiento y una casilla «Validé la fecha de nacimiento con el cliente», sin marcar al abrir cada llamada. Mientras no esté marcada, «Continuar con este estudio», «Nueva cita» y «Completar la cita aquí» MUST estar deshabilitados. Sin paciente en la ficha no se muestra la casilla y esas acciones no dependen de ella. Iniciar otra llamada SHALL desmarcarla.

#### Scenario: Fecha visible y casilla obligatoria
- **WHEN** la llamada retoma un trámite con paciente nacido el 1990-02-28
- **THEN** la ficha muestra «28/02/1990» y «Continuar con este estudio», «Nueva cita» y «Completar la cita aquí» están deshabilitados hasta marcar «Validé la fecha de nacimiento con el cliente»

#### Scenario: Sin paciente
- **WHEN** la ficha no tiene paciente
- **THEN** no aparece la casilla y las acciones se pueden usar

#### Scenario: Nueva llamada
- **WHEN** el asesor marcó la casilla y luego inicia otra llamada
- **THEN** la casilla aparece desmarcada
