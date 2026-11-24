# Spec Delta

## MODIFIED Requirements

### Requirement: Resolución por prioridades
El resolvedor de continuidad SHALL evaluar, en este orden, y usar la primera fuente que aplique: (1) token de continuidad de un solo uso, que hereda el nivel y el trámite del origen; (2) contacto del canal (`wa_id`) vinculado a un paciente con trámites abiertos → nivel 1, considerando solo vínculos de nivel 1 o mayor cuyo último uso esté dentro de 180 días según el `Reloj`; los vínculos de nivel 0 (datos declarados) o inactivos MUST ignorarse como si no existieran, sin contar intento; (3) `wa_id` igual, en sus últimos 10 dígitos, al teléfono capturado en un hilo con trámites abiertos → nivel 1, que permite mostrar el resumen pero no retomar: como el contacto no está vinculado, la política de identidad exige folio + fecha de nacimiento antes de retomar; (4) folio de 8 a 9 dígitos, que solo localiza y exige fecha de nacimiento antes de revelar o retomar; (5) datos personales declarados que coinciden con un único paciente → verificación por OTP al contacto registrado previamente. Un trámite abierto es uno en estado previo a `ATENDIDA`, `CANCELADA`, `NO_ASISTIO` o `EXPIRADO`. En la prioridad 4, todo folio bien formado sin fecha de nacimiento MUST recibir la misma respuesta (pedir la fecha de nacimiento), exista o no, esté abierto o no, sin consultar el repositorio y sin contar intento; con fecha de nacimiento, un folio inexistente, de un trámite cerrado, de otro paciente admisible o con fecha que no coincide MUST contar como intento fallido y devolver el mismo resultado sin datos.

#### Scenario: El token gana
- **WHEN** un `wa_id` vinculado a otro paciente envía un token válido
- **THEN** se retoma el trámite del token con el nivel del origen, no los del vínculo

#### Scenario: Token de un solo uso
- **WHEN** se usa por segunda vez un token de continuidad ya consumido
- **THEN** no se retoma ningún trámite y cuenta como intento fallido

#### Scenario: Folio sin fecha de nacimiento
- **WHEN** se envía sin fecha de nacimiento un folio existente y, en otra petición, un folio bien formado que no existe
- **THEN** ambos resultados son idénticos: piden la fecha de nacimiento, no revelan servicio, sede ni estado y no cuentan intento

#### Scenario: Folio inexistente con fecha
- **WHEN** se envía un folio bien formado que no existe junto con una fecha de nacimiento
- **THEN** cuenta un intento fallido y el resultado es igual al de un folio existente con fecha equivocada

#### Scenario: Datos personales con coincidencia única
- **WHEN** los datos declarados coinciden con un solo paciente
- **THEN** el resultado pide verificar por OTP al contacto registrado y no revela ningún dato del paciente

#### Scenario: Vínculo declarado no revela
- **WHEN** un `wa_id` cuyo único vínculo es de nivel 0 (creado al declarar la CURP de otra persona) escribe sin token y ese paciente tiene trámites abiertos de otro hilo
- **THEN** el resultado es igual al de un `wa_id` desconocido y no se cuenta intento

#### Scenario: Número reasignado sin uso reciente
- **WHEN** un `wa_id` con un vínculo de nivel 1 cuyo último uso fue hace 181 días según el `Reloj` escribe sin token
- **THEN** el vínculo se ignora y el resultado es igual al de un `wa_id` desconocido
