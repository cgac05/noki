## ADDED Requirements

### Requirement: Fecha de nacimiento para validar en la llamada
`RUTAS_CONSULTAS` SHALL incluir la consulta solo de demo `fechaNacimientoLlamada` (`GET /api/demo/callcenter/hilos/:hiloId/fecha-nacimiento`), que devuelve `{ fechaNacimiento }` (fecha ISO `AAAA-MM-DD`) del mismo paciente del que `fichaHilo` toma `nombrePila`, o `null` si no hay paciente. Fuera del modo demo la ruta MUST NOT existir. `FichaHilo` MUST NOT cambiar, y solo `/callcenter` SHALL consumir esta consulta.

#### Scenario: Hilo con paciente
- **WHEN** en demo se consulta un hilo cuyo trámite abierto tiene un paciente nacido el 1990-02-28
- **THEN** responde `{ fechaNacimiento: '1990-02-28' }`

#### Scenario: Hilo sin paciente
- **WHEN** ningún trámite del hilo tiene paciente
- **THEN** responde `{ fechaNacimiento: null }`

#### Scenario: Fuera de demo
- **WHEN** el modo demo está apagado
- **THEN** la ruta no está disponible

#### Scenario: La ficha no cambia
- **WHEN** se valida una respuesta de `fichaHilo`
- **THEN** no incluye la fecha de nacimiento
