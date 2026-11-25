# api-comandos Specification

## Purpose
Define la API de comandos común a todos los canales (`POST /api/comandos`), su idempotencia, la traducción de errores, el tratamiento de actores sin sesión y la composición y el arranque de `apps/api`.

## Requirements

### Requirement: Comando único para todos los canales
`POST /api/comandos` SHALL validar el cuerpo con `ComandoRequestSchema`, ejecutar el caso de uso que corresponde a su `tipo` y responder 200 con un cuerpo válido según `RespuestaComandoSchema`. La vista del trámite SHALL reflejar el estado y la versión guardados, `siguientePregunta` SHALL calcularse para el canal del comando y `eventos` SHALL contener los eventos guardados por ese comando con los ids del event store. Un comando que requiere `tramiteId` y no lo trae MUST responder 400.

#### Scenario: Cotizar desde el call center
- **WHEN** un asesor inicia un trámite `AGENDAR` y después envía `SeleccionarServicio` y `SeleccionarSede` con una sede que ofrece el servicio
- **THEN** la última respuesta tiene estado `COTIZADO`, la versión guardada en el repositorio, los eventos `SedeSeleccionada` y `CotizacionGenerada`, y es válida según `RespuestaComandoSchema`

#### Scenario: Sede sin el servicio
- **WHEN** se envía `SeleccionarSede` con una sede que no ofrece el servicio elegido
- **THEN** responde 422 con código `REGLA_VIOLADA`, regla `SERVICIO_NO_DISPONIBLE_EN_SEDE` y las sedes alternativas en `datos`

#### Scenario: Comando sin trámite
- **WHEN** se envía `SeleccionarServicio` sin `tramiteId`
- **THEN** responde 400 con código `VALIDACION` y no se guarda ningún evento

#### Scenario: Reserva que no coincide
- **WHEN** se envía `ConfirmarCita` con un `reservaId` distinto del de la reserva del trámite
- **THEN** responde 422 con regla `RESERVA_NO_COINCIDE` y la agenda externa no recibe ninguna llamada

### Requirement: Idempotencia por clave
Todo `POST` de la API SHALL exigir la cabecera `Idempotency-Key` con un UUID; sin ella MUST responder 400. Una clave ya completada con el mismo cuerpo y ruta SHALL devolver el mismo código y cuerpo sin ejecutar otra vez el caso de uso. La misma clave con otro cuerpo MUST responder 400. Una clave en curso MUST responder 409. Una solicitud que termina en error sin haber guardado eventos MUST dejar la clave libre para reintentar; si el error ocurre después de guardar eventos con esa clave (por ejemplo, `ReservaExpirada` al confirmar con el hold vencido), la clave MUST quedar completada con esa respuesta de error y un reintento con la misma clave MUST devolverla sin ejecutar otra vez.

#### Scenario: Reintento tras perder la respuesta
- **WHEN** se envía dos veces `ConfirmarCita` con la misma clave y el mismo cuerpo
- **THEN** ambas respuestas son idénticas, existe un solo `CitaConfirmada` y la agenda externa recibió un solo registro

#### Scenario: Clave reutilizada con otro cuerpo
- **WHEN** se reutiliza una clave completada con un comando distinto
- **THEN** responde 400 `VALIDACION` y el trámite no cambia

#### Scenario: Concurrencia con la misma clave
- **WHEN** dos solicitudes con la misma clave llegan a la vez contra Postgres
- **THEN** una se ejecuta y la otra responde 409 o la misma respuesta, y existe un solo juego de eventos

#### Scenario: Error con efectos guardados
- **WHEN** se envía `ConfirmarCita` con el hold vencido, la API guarda `ReservaExpirada` y responde 422 `HORARIO_NO_DISPONIBLE`, y después se reenvía con la misma clave
- **THEN** el reintento recibe el mismo 422, existe un solo `ReservaExpirada` y la agenda externa no recibe llamadas

#### Scenario: Reintento tras un error
- **WHEN** un comando falla con 409 por conflicto de versión y se reintenta con la misma clave después de recargar
- **THEN** el reintento se ejecuta normalmente

### Requirement: Errores sin detalles internos
Los errores SHALL responder con `CuerpoErrorSchema` y el código HTTP de `MAPEO_ERRORES_HTTP`. Un error de validación MUST indicar solo las rutas de los campos inválidos, nunca sus valores. Un error inesperado MUST responder 500 con un mensaje genérico y registrarse con `correlation_id`. Ninguna respuesta MUST incluir `stack`, SQL, URLs internas ni datos personales.

#### Scenario: Paso adicional requerido
- **WHEN** un paciente sin vínculo ni OTP envía `CancelarCita`
- **THEN** responde 403 `STEP_UP_REQUERIDO` con los factores requeridos y la cita no cambia

#### Scenario: Fallo inesperado
- **WHEN** el repositorio lanza un error no previsto durante un comando
- **THEN** responde 500 sin `stack` y el log tiene el `correlation_id` y un código, sin el cuerpo de la solicitud

#### Scenario: Valor inválido no se repite
- **WHEN** se envía un `servicioId` que no es UUID v7
- **THEN** responde 400 y el cuerpo nombra el campo pero no contiene el valor enviado

### Requirement: Actores sin sesión
Mientras no exista sesión de personal, la API SHALL aceptar el actor `paciente` del cuerpo y MUST aceptar `asesor:<id>` y `recepcion:<id>` solo con `DEMO_MODE=true`; fuera de modo demo MUST responder 403. El actor `sistema` MUST rechazarse con 400 por HTTP. Si llega `Authorization: Bearer` con un token de contexto válido, su nivel y paciente SHALL alimentar el contexto de identidad; un token inválido o vencido MUST responder 403 sin detalles. Con actor `paciente`, `IdentificarPaciente` MUST exigir un token de contexto vigente del mismo hilo que el trámite.

#### Scenario: Identificación del paciente sin credencial
- **WHEN** un comando `IdentificarPaciente` con actor `paciente` y paso `DESTINATARIO` llega sin token de contexto, o con un token de otro hilo
- **THEN** responde 403 `STEP_UP_REQUERIDO`, el trámite no cambia y la respuesta no contiene nombres de candidatos

#### Scenario: Asesor fuera de modo demo
- **WHEN** con `DEMO_MODE=false` un comando trae el actor `asesor:asesor1`
- **THEN** responde 403 y no se ejecuta

#### Scenario: Actor sistema por HTTP
- **WHEN** un comando trae el actor `sistema`
- **THEN** responde 400

#### Scenario: Token de contexto alterado
- **WHEN** un comando trae un token de contexto con la firma alterada
- **THEN** responde 403 y la respuesta no explica la causa

### Requirement: Composición y arranque de la API
`apps/api` SHALL construir en `main.ts` los adaptadores reales (Postgres, Redis, `out-sd` con `SD_MOCK_URL`, `out-security` con `TOKEN_SECRET`) y registrar las rutas de comandos, consultas y WhatsApp, Socket.IO y CORS solo para `PUBLIC_BASE_URL` (incluida la cabecera `Idempotency-Key`). MUST fallar al arrancar si falta una variable requerida o si `TOKEN_SECRET` tiene menos de 32 bytes. El logger SHALL inyectarse en el cliente de agenda externa y en el registro de compensaciones fallidas, con `correlation_id` y sin datos personales. El relay del outbox SHALL esperar de forma creciente mientras falla y MUST registrar el fallo solo al cambiar de estado.

#### Scenario: Reintento de agenda registrado
- **WHEN** `sd-mock` falla la primera petición de registro de una cita y la segunda tiene éxito
- **THEN** el log tiene una línea de reintento con `correlation_id` y código, sin datos personales

#### Scenario: Compensación fallida registrada
- **WHEN** la compensación de una confirmación falla
- **THEN** el log tiene `COMPENSACION_AGENDA_FALLIDA` con el `correlation_id` del comando

#### Scenario: Redis caído sin ruido
- **WHEN** Redis no responde durante 10 s con el relay en marcha
- **THEN** el aviso `RELAY_OUTBOX_FALLIDO` aparece una sola vez y los intentos se espacian hasta 5 s; al volver Redis se registra `RELAY_OUTBOX_RECUPERADO` y se publican los pendientes

#### Scenario: Secreto corto
- **WHEN** la API arranca con un `TOKEN_SECRET` de 10 caracteres
- **THEN** el arranque falla con un mensaje que no incluye el secreto

#### Scenario: Origen no permitido
- **WHEN** una solicitud de preflight llega desde un origen distinto de `PUBLIC_BASE_URL`
- **THEN** la respuesta no incluye la cabecera que permite ese origen
