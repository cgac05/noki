# Spec Delta

## ADDED Requirements

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
