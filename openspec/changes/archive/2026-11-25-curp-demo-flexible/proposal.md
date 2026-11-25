# Proposal

## Why

El 2026-11-25 Christian capturó en `/callcenter` su CURP real y la pantalla respondió «No pudimos enviar el formulario. Reintenta el mismo envío o cancela para volver a capturarlo.». Es decir, la API rechazó el comando. Claude comprobó contra la API de la demo que una CURP sintética con dígito verificador correcto sí se acepta. El rechazo viene de las reglas estrictas del núcleo: `CURP_INVALIDA` por formato, fecha o verificador, o `CURP_NO_COINCIDE` por la fecha declarada o por las letras de nombre y apellidos.

Christian decidió para la expo que la CURP solo debe validar que tenga 18 caracteres alfanuméricos, sin dígito verificador ni consulta a semilla o RENAPO.

## What Changes

- **Contrato:** el paso `CURP` de `IdentificarPaciente` acepta 18 caracteres `[A-Z0-9]`; la web ya pasa la CURP a mayúsculas y quita espacios.
- **Núcleo, solo con `DEMO_MODE=true`** (opción `curpFlexible` de `CasosTramite`, que la API activa con el modo demo):
  - una CURP de 18 caracteres alfanuméricos que no pasa `validarCurp`, o cuya fecha no coincide con la declarada, se acepta como «sin CURP verificable»: el trámite sigue como con «No la tengo» y en `DATOS` se piden fecha (si falta), sexo y entidad;
  - si la CURP es válida pero sus letras no concuerdan con los nombres de `DATOS`, se registra al paciente sin guardar esa CURP, en lugar de fallar.
- Fuera del modo demo, todo sigue igual (validación oficial completa).

### Fuera de alcance
- Migraciones: la base solo guarda CURP con formato oficial (`paciente_curp_formato`), por eso en demo una CURP no verificable no se guarda.
- Consulta a RENAPO o semillas.

## Capabilities

### Modified Capabilities
- `identificacion-paciente`: requisito nuevo «CURP flexible en modo demo».

## Impact
`packages/contracts/src/comandos.ts` (compartido, frente único), `packages/application/src/CasosTramite.ts`, `apps/api/src/componerComandos.ts` y `apps/api/src/pruebas.ts` (una línea para pasar la opción), pruebas en `tests/unit/nucleo/` y `tests/unit/` de contratos. Riesgo: en la expo se aceptan CURP falsas; no se guardan en el expediente si no son verificables.
