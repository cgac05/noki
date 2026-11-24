# Spec Delta

## ADDED Requirements

### Requirement: Migración de identidad del paciente
El proyecto SHALL agregar `infra/migraciones/003_identidad.sql` sin modificar `001_nucleo.sql` ni `002_persistencia.sql`. La migración MUST agregar a `paciente` la entidad de nacimiento y la CURP calculada (16 caracteres), validar el formato de `curp`, `curp_base` y `entidad_nac`, hacer única la CURP cuando no es nula, admitir el método de vínculo `TELEFONO_FECHA_NAC` e indexar la búsqueda de contactos por los últimos 10 dígitos del teléfono y de pacientes por `curp_base`. MUST aplicarse sobre una base con `002` y datos sembrados, y volver a migrar MUST NOT aplicar nada nuevo. Los adaptadores Postgres de pacientes y contactos MUST implementar las búsquedas por CURP, por CURP calculada, por teléfono normalizado y el registro de pacientes, con sus equivalentes en memoria y las mismas pruebas de contrato para ambos.

#### Scenario: Migración sobre una base con datos
- **WHEN** se ejecuta `pnpm db:migrate` sobre una base con `001`, `002` y la semilla de demo
- **THEN** se aplica `003_identidad` sin errores y una segunda ejecución no aplica ninguna migración

#### Scenario: CURP única
- **WHEN** se insertan dos pacientes con la misma CURP, y otros dos sin CURP
- **THEN** el segundo con CURP se rechaza y los dos sin CURP se aceptan

#### Scenario: Migraciones anteriores intactas
- **WHEN** se comparan `001_nucleo.sql` y `002_persistencia.sql` con `main` antes del cambio
- **THEN** ambos archivos son idénticos
