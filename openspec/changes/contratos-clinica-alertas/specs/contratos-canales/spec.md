# Spec Delta

## MODIFIED Requirements

### Requirement: Comando y respuesta comunes a todos los canales
El esquema de `POST /api/comandos` SHALL aceptar `{ canal, actor, tipo, tramiteId?, hiloId?, payload }`, con `canal` en `web | whatsapp | app | callcenter | clinica` y `payload` determinado por `tipo`. Además:

- `IniciarTramite` SHALL admitir `payload.contacto` opcional con 10 a 15 dígitos.
- `SolicitarContinuacion` SHALL exigir `tramiteId` y `payload.destino` igual a `whatsapp`.
- `ComprobarIdentidad` SHALL exigir `tramiteId` y `payload.metodo` igual a `INE_CLINICA`, sin más campos.
- `CerrarAtencion` SHALL exigir `tramiteId` y un `payload` vacío.
- `IdentificarPaciente` SHALL exigir `tramiteId` y un `payload` discriminado por `paso`:
  - `DESTINATARIO` con `para` (`MI` | `OTRA_PERSONA`);
  - `CONFIRMAR` con `candidato` (texto no vacío, la referencia de la opción elegida) o `null`;
  - `FECHA_NAC` con `fechaNac` (fecha ISO);
  - `CURP` con `curp` de 18 caracteres en mayúsculas con el formato oficial, o `null`;
  - `DATOS` con `nombre`, `apellidoPaterno`, `apellidoMaterno` opcional, `fechaNac` opcional, `sexo` opcional (`F` | `M` | `X`) y `entidadNacimiento` opcional (una de las 32 claves de entidad o `NE`);
  - `REINICIAR` sin más campos.

La respuesta SHALL ser `{ tramite, siguientePregunta, eventos }` según `AGENTS.md` §7. La vista del trámite MUST incluir su `tipo`, y SHALL incluir `horario` (`reservaId`, `inicio` y, solo mientras el hold está vigente en `HORARIO_RESERVADO`, `expiraEn`) cuando el trámite tiene una reserva. Una cita confirmada MUST NOT llevar `expiraEn`, y la vista MUST NOT incluir datos sensibles ni el estado de identificación.

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

#### Scenario: Identidad comprobada en clínica
- **WHEN** se validan `ComprobarIdentidad` con `tramiteId` y `{ metodo: 'INE_CLINICA' }`, sin `tramiteId`, con `{ metodo: 'OTP_SMS' }` y con `{ metodo: 'INE_CLINICA', folio: '12345678' }`
- **THEN** solo el primero es válido

#### Scenario: Cerrar atención
- **WHEN** se validan `CerrarAtencion` con `tramiteId` y `payload: {}`, y sin `tramiteId`
- **THEN** el primero es válido y el segundo falla
