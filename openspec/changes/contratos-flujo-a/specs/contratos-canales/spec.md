# Spec Delta

## MODIFIED Requirements

### Requirement: Comando y respuesta comunes a todos los canales
El esquema de `POST /api/comandos` SHALL aceptar `{ canal, actor, tipo, tramiteId?, hiloId?, payload }`, con `canal` en `web | whatsapp | app | callcenter | clinica` y `payload` determinado por `tipo`. `IniciarTramite` SHALL admitir `payload.contacto` opcional con 10 a 15 dígitos. El comando `SolicitarContinuacion` SHALL exigir `tramiteId` y `payload.destino` igual a `whatsapp`. La respuesta SHALL ser `{ tramite, siguientePregunta, eventos }` según `AGENTS.md` §7, y la vista del trámite MUST incluir su `tipo`, SHALL incluir `horario` (`reservaId`, `inicio` y, solo mientras el hold está vigente en `HORARIO_RESERVADO`, `expiraEn`) cuando el trámite tiene una reserva; una cita confirmada MUST NOT llevar `expiraEn` y MUST NOT incluir datos sensibles.

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

### Requirement: Tiempo real con nombres compartidos
Los nombres de eventos de Socket.IO, el esquema del dato de cada evento, las salas `tramite:<id>`, `hilo:<id>`, `paciente:<id>`, `sede:<id>` y `admin`, y los eventos que envía el cliente para unirse a una sala (`sala:unirse`) y salir de ella (`sala:salir`) SHALL definirse una sola vez en el paquete de contratos. El dato de los eventos del cliente MUST ser una sala válida.

#### Scenario: Sala mal formada
- **WHEN** se valida una sala con un prefijo distinto de los cinco definidos
- **THEN** la validación falla

#### Scenario: Evento desconocido
- **WHEN** un cliente se suscribe con un nombre de evento que no está en las constantes
- **THEN** la verificación de tipos falla

#### Scenario: Unirse a una sala inválida
- **WHEN** se valida el dato de `sala:unirse` igual a `"tramite:123"`
- **THEN** la validación falla

### Requirement: Errores de dominio traducidos a HTTP
Cada error de dominio SHALL tener exactamente un código HTTP según `AGENTS.md` §6 (`ReglaViolada` 422, `StepUpRequerido` 403, `ConflictoVersion` 409, `NoEncontrado` 404, `TransicionInvalida` 409, validación 400). Un error inesperado SHALL usar el código `INTERNO` con HTTP 500. El cuerpo de error SHALL tener código y mensaje y MUST NOT incluir `stack` ni detalles internos.

#### Scenario: Mapeo completo
- **WHEN** se agrega un error de dominio nuevo sin entrada en el mapeo
- **THEN** la verificación de tipos falla

#### Scenario: Códigos esperados
- **WHEN** una prueba recorre el mapeo
- **THEN** cada error devuelve el código HTTP de `AGENTS.md` §6 e `INTERNO` devuelve 500

#### Scenario: Sin detalles internos
- **WHEN** se valida con el esquema del cuerpo de error un objeto que incluye `stack`
- **THEN** el resultado validado no contiene `stack`
