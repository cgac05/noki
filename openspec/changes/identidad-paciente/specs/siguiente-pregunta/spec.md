# Spec Delta

## MODIFIED Requirements

### Requirement: Pista de interfaz coherente con el contrato
Cada pregunta SHALL incluir una pista con `entrada` (`TEXTO`, `BOTONES`, `LISTA`, `FLOW` o `NINGUNA`) y, cuando corresponda, `campos` de captura y `opciones`, con la misma forma que `SiguientePregunta` de `@noki/contracts`. Para `AGENDAR`: `servicio`, `sede` y `horario` usan `LISTA`; `requisitos` y `elegibilidad` usan `BOTONES`; `paciente` MUST incluir `paso` con el paso de identificación actual (`identificacion-paciente`) y su pista depende de él: `DESTINATARIO` usa `BOTONES` con las opciones `MI` y `OTRA_PERSONA`; `CONFIRMAR` usa `LISTA` con una opción por candidato (título con su nombre enmascarado y una referencia opaca como payload) y la opción `NINGUNO`; `FECHA_NAC` usa `FLOW` con la fecha de nacimiento; `CURP` usa `FLOW` con la CURP y la opción `SIN_CURP`; `DATOS` usa `FLOW` con nombre, apellido paterno y apellido materno y, si no hay CURP pendiente, sexo, entidad de nacimiento y la fecha si aún no se dio. Todos los campos de `paciente` MUST tener `captura: 'sensitive'` (`PLAN.md` §8: datos personales como `sensitive`). La pista MUST NOT contener valores iniciales de datos personales ni campos `passcode` con valor; el único dato personal permitido en una pista es el nombre enmascarado de las opciones de `CONFIRMAR` (`identificacion-paciente`). Las opciones de catálogo no forman parte de la pista del núcleo. Una prueba en `in-http` MUST validar resultados reales de `siguientePregunta` con `SiguientePreguntaSchema` y comprobar por tipos que la salida del dominio es asignable al tipo del contrato.

#### Scenario: Captura sensible del paciente
- **WHEN** la siguiente pregunta es `paciente` en cualquiera de los pasos `FECHA_NAC`, `CURP` o `DATOS`
- **THEN** la pista es `FLOW`, lleva su `paso`, todos sus campos tienen `captura: 'sensitive'` y ninguno lleva valor inicial

#### Scenario: Primer paso del paciente
- **WHEN** la siguiente pregunta es `paciente` en un trámite sin destinatario declarado
- **THEN** la pista es `BOTONES` con `paso: 'DESTINATARIO'` y las opciones `MI` y `OTRA_PERSONA`

#### Scenario: Confirmar candidatos
- **WHEN** la siguiente pregunta es `paciente` en el paso `CONFIRMAR` de un trámite con dos candidatos
- **THEN** la pista es `LISTA` con `paso: 'CONFIRMAR'`, tres opciones (dos nombres enmascarados y `NINGUNO`) y ningún payload es un `pacienteId`

#### Scenario: Datos con CURP pendiente
- **WHEN** la siguiente pregunta es `paciente` en el paso `DATOS` con una CURP pendiente
- **THEN** los campos son solo nombre, apellido paterno y apellido materno

#### Scenario: Coherencia con el contrato
- **WHEN** la prueba de `in-http` valida con `SiguientePreguntaSchema` la salida para cada casilla de `AGENDAR`, cada paso de `paciente` y `COMPLETO`
- **THEN** todas son válidas, y una divergencia de forma hace fallar la prueba
