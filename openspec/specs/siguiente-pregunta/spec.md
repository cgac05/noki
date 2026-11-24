# siguiente-pregunta Specification

## Purpose

Define cómo el núcleo decide qué preguntar después en cada canal, de modo que un trámite empezado en un canal se retome en otro en la casilla correcta.

## Requirements

### Requirement: Primera casilla vacía con dependencias cumplidas
`siguientePregunta(tramite, canal)` SHALL recorrer las casillas en el orden preferido del canal registrado para el tipo de trámite y devolver la primera casilla vacía cuyas dependencias estén cumplidas. Para `AGENDAR` las dependencias MUST ser: `horario ← servicio + sede`, `elegibilidad ← servicio + paciente`, `requisitos ← servicio`; `servicio`, `sede` y `paciente` no dependen de otras casillas. Una casilla vacía con dependencias pendientes MUST omitirse y la búsqueda MUST continuar. Si no queda ninguna casilla vacía, MUST devolver `{ tipo: 'COMPLETO' }`. La función MUST ser pura: no modifica el trámite ni emite eventos.

#### Scenario: Dependencia pendiente se omite
- **WHEN** en `whatsapp` un trámite tiene servicio pero no sede
- **THEN** la siguiente pregunta es `sede`, nunca `horario`

#### Scenario: Requisitos dependen del servicio
- **WHEN** en `callcenter` un trámite tiene paciente pero no servicio
- **THEN** la siguiente pregunta es `servicio`, y `requisitos` no se pregunta antes

#### Scenario: Trámite completo
- **WHEN** todas las casillas del trámite están llenas
- **THEN** el resultado es `{ tipo: 'COMPLETO' }`

### Requirement: Orden preferido por canal
El registro de `AGENDAR` SHALL declarar el orden de cada canal: `whatsapp`, `web` y `app`: servicio → sede → horario → requisitos → paciente → elegibilidad; `callcenter`: paciente → servicio → sede → horario → requisitos → elegibilidad; `clinica`: paciente → servicio → sede → requisitos → horario → elegibilidad. Cada orden MUST incluir todas las casillas del tipo exactamente una vez.

#### Scenario: Mismo trámite, distinto canal
- **WHEN** un trámite vacío se consulta en `whatsapp` y en `callcenter`
- **THEN** en `whatsapp` la pregunta es `servicio` y en `callcenter` es `paciente`

#### Scenario: Retoma en el horario
- **WHEN** un trámite con paciente, servicio y sede (requisitos pendientes) del call center se consulta en `whatsapp`
- **THEN** la pregunta es `horario`

#### Scenario: Orden incompleto rechazado
- **WHEN** se registra un tipo cuyo orden para un canal omite o repite una casilla
- **THEN** el registro lanza un error al registrar, no al consultar

### Requirement: Pista de interfaz coherente con el contrato
Cada pregunta SHALL incluir una pista con `entrada` (`TEXTO`, `BOTONES`, `LISTA`, `FLOW` o `NINGUNA`) y, cuando corresponda, `campos` de captura, con la misma forma que `SiguientePregunta` de `@noki/contracts`. Para `AGENDAR`: `servicio`, `sede` y `horario` usan `LISTA`; `requisitos` y `elegibilidad` usan `BOTONES`; `paciente` usa `FLOW` con nombre, apellido paterno, apellido materno y fecha de nacimiento, todos con `captura: 'sensitive'` (`PLAN.md` §8: datos personales como `sensitive`). La pista MUST NOT contener valores iniciales de datos personales ni campos `passcode` con valor. Las opciones de catálogo no forman parte de la pista del núcleo. Una prueba en `in-http` MUST validar resultados reales de `siguientePregunta` con `SiguientePreguntaSchema` y comprobar por tipos que la salida del dominio es asignable al tipo del contrato.

#### Scenario: Captura sensible del paciente
- **WHEN** la siguiente pregunta es `paciente`
- **THEN** la pista es `FLOW`, todos sus campos (nombre, apellidos y fecha de nacimiento) tienen `captura: 'sensitive'` y ninguno lleva valor inicial

#### Scenario: Coherencia con el contrato
- **WHEN** la prueba de `in-http` valida con `SiguientePreguntaSchema` la salida para cada casilla de `AGENDAR` y para `COMPLETO`
- **THEN** todas son válidas, y una divergencia de forma hace fallar la prueba
