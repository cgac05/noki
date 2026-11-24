# politica-identidad Specification

## Purpose

Concentra en un solo objeto del dominio qué verificación exige cada acción del paciente (`PLAN.md` §8), para que todos los canales apliquen la misma regla y pidan solo lo que falta.

## Requirements

### Requirement: Política única por acción
El dominio SHALL exponer un único objeto de política que, dada una acción y el contexto de autenticación del comando (nivel 0–3, si el contacto está vinculado al paciente, factores verificados en la interacción y canal), no haga nada si se cumple el requisito o lance `StepUpRequerido{nivel, factores}` indicando el nivel mínimo y solo los factores que faltan. Las acciones y requisitos MUST ser los de `PLAN.md` §8: cotizar y ver preparación sin requisito; agendar sin requisito de identidad (los datos declarados los exige la guarda del trámite); retomar con contacto vinculado o, si no lo está, folio + fecha de nacimiento (un token de continuidad válido equivale al vínculo, porque hereda el nivel del origen); reprogramar y cancelar con contacto vinculado + OTP o botón de aprobación; ver resultados con nivel ≥ 1 + PIN a través de enlace mágico en `web`; cambiar teléfono o correo con nivel ≥ 1 + OTP al contacto anterior + PIN; aceptar oferta de hueco y responder recordatorio con token de un solo uso; solicitar factura con folio + contacto vinculado. Los casos de uso MUST consultar este objeto y MUST NOT repetir reglas de identidad por su cuenta.

#### Scenario: Cotizar sin verificación
- **WHEN** un contacto anónimo de nivel 0 cotiza
- **THEN** la política no lanza error

#### Scenario: Ver resultados sin PIN
- **WHEN** un paciente de nivel 1 pide ver resultados por el enlace mágico en `web` sin PIN
- **THEN** se lanza `StepUpRequerido` con `factores` igual a `['PIN']`

#### Scenario: Cancelar sin OTP
- **WHEN** un contacto vinculado cancela su cita sin OTP ni botón de aprobación
- **THEN** se lanza `StepUpRequerido` con los factores `OTP` y `BOTON_APROBACION` como alternativas

#### Scenario: Retomar sin vínculo
- **WHEN** un contacto no vinculado intenta retomar un trámite sin folio ni fecha de nacimiento verificados
- **THEN** se lanza `StepUpRequerido` con el factor `FOLIO_FECHA_NAC`

### Requirement: Acciones de personal interno
Las acciones cuyo actor es `asesor:<id>`, `recepcion:<id>` o `sistema` SHALL quedar fuera de la política del paciente; su autenticación corresponde al adaptador de entrada. La política MUST aplicarse cuando el actor es `paciente`.

#### Scenario: Asesor opera en nombre del paciente
- **WHEN** un asesor asigna paciente y selecciona servicio y sede en el call center
- **THEN** la política no exige factores del paciente

### Requirement: Factores documentados
Los nombres de factores que puede devolver `StepUpRequerido` SHALL ser un conjunto cerrado definido en el dominio (`TOKEN`, `FOLIO_FECHA_NAC`, `OTP`, `BOTON_APROBACION`, `PIN`, `ENLACE_MAGICO`, `OTP_CONTACTO_ANTERIOR`, `VINCULO`, `FOLIO`) y una prueba MUST comprobar que cada acción devuelve solo factores de ese conjunto.

#### Scenario: Factor desconocido
- **WHEN** una regla de la política intenta devolver un factor fuera del conjunto
- **THEN** la verificación de tipos falla

### Requirement: El teléfono no identifica al paciente
Un contacto de canal SHALL poder vincularse a varios pacientes, con relación `TITULAR` o `FAMILIAR`, y la posesión del teléfono MUST NOT bastar por sí sola para asignar un paciente ni para revelar sus datos más allá del nombre enmascarado del paso `CONFIRMAR` (`identificacion-paciente`). El nivel del vínculo MUST depender del método: teléfono + fecha de nacimiento coincidente (`TELEFONO_FECHA_NAC`) → nivel 1; datos declarados con o sin CURP (`FLOW_DECLARADO`) → nivel 0; los métodos existentes conservan el nivel que ya otorgan. Asignar un paciente por su ID (`AsignarPaciente`) SHALL ser exclusivo del personal interno y de `sistema`; con actor `paciente` MUST fallar con `ReglaViolada('ASIGNACION_SOLO_PERSONAL')`, y los canales del paciente MUST usar la identificación por pasos. Agendar para otra persona SHALL seguir sin requisito de identidad (`agendar` de la política), porque la clínica valida la INE en recepción.

#### Scenario: Paciente asigna un ID arbitrario
- **WHEN** un comando con actor `paciente` intenta asignar un `pacienteId`
- **THEN** falla con `ASIGNACION_SOLO_PERSONAL` y el trámite no cambia

#### Scenario: Asesor asigna por ID
- **WHEN** un asesor asigna un `pacienteId` en `callcenter`
- **THEN** la asignación procede como hasta ahora

#### Scenario: Nivel según el método
- **WHEN** un contacto se vincula a un paciente por `TELEFONO_FECHA_NAC` y otro contacto al mismo paciente por CURP declarada
- **THEN** el primer vínculo tiene nivel 1 y el segundo nivel 0
