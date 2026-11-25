## ADDED Requirements

### Requirement: CURP flexible en modo demo
Con `DEMO_MODE=true`, el paso `CURP` SHALL aceptar cualquier valor de 18 caracteres `[A-Z0-9]` sin contar intento. Si la CURP no pasa la validación oficial o su fecha no coincide con la declarada, el trámite SHALL continuar como si se hubiera elegido «No la tengo» y la CURP MUST NOT guardarse. Si la CURP es válida pero sus caracteres de nombre y apellidos no concuerdan con los de `DATOS`, el paciente SHALL registrarse o reutilizarse sin guardar esa CURP. Sin `DEMO_MODE`, las reglas de «CURP validada y concordante» MUST seguir aplicándose sin cambios. El contrato SHALL aceptar en el paso `CURP` cualquier valor de 18 caracteres `[A-Z0-9]`.

#### Scenario: CURP con verificador incorrecto en demo
- **WHEN** con modo demo el asesor envía en el paso `CURP` una CURP sintética de 18 caracteres con el último dígito alterado
- **THEN** la respuesta es 200, no hay `IntentoVerificacionFallido` y la siguiente pregunta es `DATOS` con fecha (si falta), sexo y entidad

#### Scenario: Fecha distinta en demo
- **WHEN** con modo demo llega una CURP válida cuya fecha no es la declarada
- **THEN** no falla y el trámite continúa como sin CURP

#### Scenario: Nombres que no concuerdan en demo
- **WHEN** con modo demo se completa `DATOS` con nombres que no concuerdan con una CURP válida
- **THEN** el paciente queda registrado y asignado sin esa CURP

#### Scenario: Fuera de demo no cambia
- **WHEN** sin modo demo se envía una CURP con verificador incorrecto
- **THEN** falla con `CURP_INVALIDA`

#### Scenario: Contrato de 18 alfanuméricos
- **WHEN** se valida `IdentificarPaciente` con `paso: 'CURP'` y `curp: 'ABCD123456EFGHIJ78'`
- **THEN** el esquema lo acepta, y rechaza 17 caracteres o un guion
