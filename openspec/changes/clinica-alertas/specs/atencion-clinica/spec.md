## ADDED Requirements

### Requirement: Cerrar la atención y avanzar la fila
`CerrarAtencion` SHALL aceptarse solo desde el canal `clinica` con un actor `recepcion:<id>`, para cualquier trámite `EN_CLINICA` de la fila de su sede. No hace falta que sea el primero. El trámite pasa a `ATENDIDA` con `AtencionCerrada`. Después de guardarlo, cada trámite que sigue en la fila y cambia de posición SHALL registrar `TurnoActualizado { posicion }` con su posición nueva, en su propio agregado, con una clave de idempotencia nueva por trámite y el mismo `correlation_id`. Si falla el guardado de uno de esos `TurnoActualizado`, MUST registrarse el error con `correlation_id` y sin datos personales, y la respuesta del comando MUST seguir siendo la del trámite cerrado. Desde otro canal o actor MUST fallar con regla `SOLO_RECEPCION`, y en otro estado con `TRANSICION_INVALIDA`.

#### Scenario: Cerrar al primero
- **WHEN** en Tepic están `EN_CLINICA` A (llegó primero), B y C, y recepción cierra la atención de A
- **THEN** A queda `ATENDIDA` con `AtencionCerrada`, B registra `TurnoActualizado { posicion: 1 }` y C `TurnoActualizado { posicion: 2 }`

#### Scenario: Cerrar a quien terminó antes
- **WHEN** con la misma fila recepción cierra la atención de B
- **THEN** B queda `ATENDIDA`, C registra `TurnoActualizado { posicion: 2 }` y A no registra ningún evento

#### Scenario: Cita sin llegada
- **WHEN** recepción envía `CerrarAtencion` para una cita `CONFIRMADA`
- **THEN** responde 409 `TRANSICION_INVALIDA` y ningún trámite cambia

### Requirement: Fila de la sede
La fila de una sede SHALL estar formada por sus trámites `EN_CLINICA` que aparecen en `llegadasSede`, ordenados por el `ts` de su `PacienteLlego` y, si empatan, por id. Cada uno tiene una posición desde 1. La posición se calcula en la lectura y MUST NOT guardarse aparte. En `llegadasSede`, cada llegada registrada SHALL llevar su `posicion` y una no registrada MUST NOT llevarla. Los adaptadores en memoria y Postgres MUST dar la misma fila.

#### Scenario: Posiciones por orden de llegada
- **WHEN** en Tepic se registran las llegadas de A y luego de B, y C sigue `CONFIRMADA`
- **THEN** `llegadasSede` devuelve A con `posicion` 1, B con `posicion` 2 y C sin `posicion`

#### Scenario: Misma batería en ambos adaptadores
- **WHEN** la batería de la fila se ejecuta contra memoria y contra Postgres
- **THEN** ambas devuelven las mismas posiciones

### Requirement: Alertas de seguridad
`GET /api/admin/alertas` SHALL devolver una alerta por cada `IntentoVerificacionFallido` guardado, tenga o no trámite, de la más reciente a la más antigua por `ts` e id, con un máximo de 50, validadas con `AlertaSeguridadSchema`. Cada alerta lleva el id del evento, `tipo: 'INTENTO_VERIFICACION_FALLIDO'`, el canal y el `ts` del evento, `intentos` del payload, `bloqueado` verdadero si `intentos >= 3` y el `hiloId` del evento, o `null` si no tiene. La respuesta MUST NOT incluir contacto, nombre, método ni valores capturados. Los adaptadores en memoria y Postgres MUST dar la misma lista.

#### Scenario: Bloqueo tras tres fechas equivocadas
- **WHEN** en WhatsApp se envían tres fechas de nacimiento equivocadas para «Soy Ana P.»
- **THEN** la consulta devuelve tres alertas, la más reciente con `intentos` 3 y `bloqueado` verdadero y las otras dos con `bloqueado` falso, y la respuesta no contiene el teléfono ni la fecha

#### Scenario: Límite de 50
- **WHEN** hay 60 intentos fallidos guardados
- **THEN** la consulta devuelve los 50 más recientes

#### Scenario: Sin intentos
- **WHEN** no hay intentos fallidos
- **THEN** la consulta devuelve una lista vacía con 200
