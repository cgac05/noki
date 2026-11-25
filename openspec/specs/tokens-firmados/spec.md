# tokens-firmados Specification

## Purpose
Define los tokens firmados de un solo uso del núcleo (continuidad, llegada a clínica) y la verificación del token de contexto, implementados con `jose` detrás de los puertos de aplicación.

## Requirements

### Requirement: Tokens firmados de un solo uso
El adaptador `out-security` SHALL implementar `VerificadorTokens` y un puerto emisor con JWS compactos firmados con `TOKEN_SECRET`, que llevan un `jti`, su uso (`CONTINUIDAD`, `LLEGADA` o `CONTEXTO`), el trámite, el hilo, el paciente si existe, el nivel, el canal de origen y un vencimiento. Un token de uso `CONTINUIDAD` o `LLEGADA` MUST aceptarse una sola vez: al verificarlo, su `jti` SHALL registrarse en `token_usado` de forma atómica. Un token con firma alterada, vencido, de otro uso o ya usado MUST verificarse como nulo, sin distinguir la causa ante el canal. Los puertos nuevos MUST tener adaptador en memoria.

#### Scenario: Un token de un solo uso no funciona la segunda vez (prueba obligatoria)
- **WHEN** la recepción registra la llegada con el `tokenQr` de una cita y otra solicitud usa el mismo token
- **THEN** la primera responde 200 con el trámite `EN_CLINICA` y la segunda responde 422 con regla `TOKEN_INVALIDO`

#### Scenario: Dos usos simultáneos
- **WHEN** dos solicitudes verifican el mismo token de continuidad a la vez contra Postgres
- **THEN** exactamente una lo acepta

#### Scenario: Uso equivocado
- **WHEN** se intenta retomar un trámite con un token de uso `LLEGADA`
- **THEN** la verificación devuelve nulo y el `jti` no queda consumido

#### Scenario: Token vencido o alterado
- **WHEN** se verifica un token con un carácter cambiado en la firma o con `exp` en el pasado
- **THEN** la verificación devuelve nulo

### Requirement: Token del QR de la cita
Cada cita de `citasPaciente` y `llegadasSede` SHALL llevar en `tokenQr` un token de uso `LLEGADA` que identifica su trámite y su hilo, vence 24 h después del inicio de la cita y MUST NOT ser ni contener el folio. Dos lecturas de la misma cita SHALL devolver el mismo token.

#### Scenario: QR estable
- **WHEN** se consulta dos veces `citasPaciente` de la misma paciente
- **THEN** el `tokenQr` de la cita es idéntico en ambas respuestas

#### Scenario: Sin folio en el QR
- **WHEN** se decodifica el payload del `tokenQr`
- **THEN** no contiene el folio de la cita ni datos personales

### Requirement: Token de contexto verificado sin consumirse
Un token de uso `CONTEXTO` SHALL verificarse por firma, uso y vencimiento sin registrarse como usado, y SHALL aportar paciente y nivel al contexto de identidad de los comandos. Este cambio MUST NOT emitir tokens de contexto por HTTP.

#### Scenario: Contexto reutilizable
- **WHEN** dos comandos traen el mismo token de contexto vigente
- **THEN** ambos lo aceptan
