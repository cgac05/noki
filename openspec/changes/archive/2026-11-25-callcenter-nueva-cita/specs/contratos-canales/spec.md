## ADDED Requirements

### Requirement: Iniciar un trámite nuevo aunque haya uno en proceso
El payload de `IniciarTramite` SHALL admitir `nuevo` opcional booleano; su ausencia MUST equivaler a `false`. El esquema MUST rechazar un `nuevo` que no sea booleano.

#### Scenario: Bandera válida
- **WHEN** se valida `IniciarTramite` con `payload: { tipoTramite: 'AGENDAR', contacto: '3112111821', nuevo: true }`
- **THEN** el esquema lo acepta

#### Scenario: Bandera inválida
- **WHEN** `nuevo` es `'si'`
- **THEN** el esquema lo rechaza
