# Spec Delta

## MODIFIED Requirements

### Requirement: Comando y respuesta comunes a todos los canales
El esquema de `POST /api/comandos` SHALL aceptar `{ canal, actor, tipo, tramiteId?, hiloId?, payload }`, con `canal` en `web | whatsapp | app | callcenter | clinica` y `payload` determinado por `tipo`. `IniciarTramite` SHALL admitir `payload.contacto` opcional con 10 a 15 dígitos. El comando `SolicitarContinuacion` SHALL exigir `tramiteId` y `payload.destino` igual a `whatsapp`. El comando `IdentificarPaciente` SHALL exigir `tramiteId` y un `payload` discriminado por `paso`: `DESTINATARIO` con `para` (`MI` | `OTRA_PERSONA`); `CONFIRMAR` con `candidato` (texto no vacío, la referencia de la opción elegida) o `null`; `FECHA_NAC` con `fechaNac` (fecha ISO); `CURP` con `curp` de 18 caracteres en mayúsculas con el formato oficial, o `null`; `DATOS` con `nombre`, `apellidoPaterno`, `apellidoMaterno` opcional, `fechaNac` opcional, `sexo` opcional (`F` | `M` | `X`) y `entidadNacimiento` opcional (una de las 32 claves de entidad o `NE`); y `REINICIAR` sin más campos. La respuesta SHALL ser `{ tramite, siguientePregunta, eventos }` según `AGENTS.md` §7, y la vista del trámite MUST incluir su `tipo`, SHALL incluir `horario` (`reservaId`, `inicio` y, solo mientras el hold está vigente en `HORARIO_RESERVADO`, `expiraEn`) cuando el trámite tiene una reserva; una cita confirmada MUST NOT llevar `expiraEn` y MUST NOT incluir datos sensibles ni el estado de identificación.

#### Scenario: Payload ligado al comando
- **WHEN** se valida un comando `SeleccionarSede` con el payload de `SeleccionarServicio`
- **THEN** la validación falla

#### Scenario: Comando válido
- **WHEN** se valida un comando `SeleccionarServicio` con canal, actor y payload correctos
- **THEN** la validación tiene éxito y el resultado está tipado como ese comando

#### Scenario: Contacto mal formado
- **WHEN** se valida `IniciarTramite` con `contacto` igual a `"55-1234"`
- **THEN** la validación falla

#### Scenario: Continuación sin trámite
- **WHEN** se valida `SolicitarContinuacion` sin `tramiteId`
- **THEN** la validación falla

#### Scenario: Vista con reserva
- **WHEN** se valida una vista de trámite `HORARIO_RESERVADO` con `horario` completo
- **THEN** la validación tiene éxito y una vista sin `horario` también es válida

#### Scenario: Cita confirmada sin vencimiento
- **WHEN** se valida una vista `CONFIRMADA` con `horario` que tiene `reservaId` e `inicio` pero no `expiraEn`
- **THEN** la validación tiene éxito

#### Scenario: Identificación por pasos
- **WHEN** se validan `IdentificarPaciente` con `{ paso: 'CURP', curp: null }`, con `{ paso: 'CONFIRMAR', candidato: null }`, con `{ paso: 'FECHA_NAC', fechaNac: '1990-02-30' }` y con `{ paso: 'DATOS', nombre: 'Ana', apellidoPaterno: 'Demo', entidadNacimiento: 'XX' }`
- **THEN** los dos primeros son válidos y los otros dos fallan

### Requirement: Siguiente pregunta con pista de interfaz
`SiguientePregunta` SHALL indicar la casilla a llenar y una pista de interfaz con el tipo de entrada (texto, botones, lista, modal tipo Flow o ninguna), las opciones cuando apliquen, qué campos se capturan como `sensitive` o `passcode` y, para la casilla `paciente`, el `paso` de identificación opcional (`DESTINATARIO` | `CONFIRMAR` | `FECHA_NAC` | `CURP` | `DATOS`). La ausencia de casillas pendientes MUST representarse con una variante explícita de completo.

#### Scenario: Pregunta de captura sensible
- **WHEN** se valida una pregunta de datos del paciente con entrada modal tipo Flow y la fecha de nacimiento marcada `sensitive`
- **THEN** la validación tiene éxito

#### Scenario: Pregunta con paso
- **WHEN** se valida una pregunta `paciente` con `paso: 'CURP'` y otra con `paso: 'OTRO'`
- **THEN** la primera es válida y la segunda falla

#### Scenario: Trámite completo
- **WHEN** no queda casilla pendiente
- **THEN** el valor es la variante de completo, distinguible por su discriminante
