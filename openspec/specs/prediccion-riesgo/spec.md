# prediccion-riesgo Specification

## Purpose
TBD - created by archiving change prediccion-riesgo. Update Purpose after archive.

## Requirements

### Requirement: Modelo de riesgo reproducible
Los scripts de `ml/` SHALL generar citas sintéticas con una semilla fija, entrenar una regresión logística sobre los factores de `FACTORES_RIESGO` y escribir el modelo en `packages/adapters/out-modelo/modelo/riesgo-inasistencia.json` y sus métricas en `ml/metricas.json`. Las métricas MUST incluir AUC y Brier del modelo y de la estimación por reglas, medidos en el 20 % de validación, y MUST indicar que los datos son sintéticos. Ejecutarlos dos veces con la misma semilla MUST producir archivos idénticos. Los scripts MUST NOT usar datos de pacientes ni dependencias externas nuevas.

#### Scenario: Entrenamiento repetible
- **WHEN** se ejecuta el entrenamiento dos veces con la misma semilla
- **THEN** los dos modelos y las dos métricas son idénticos byte a byte

#### Scenario: El modelo supera a las reglas
- **WHEN** se evalúa el modelo entrenado en el conjunto de validación
- **THEN** su AUC es al menos 0.70 y no es menor que el de la estimación por reglas

#### Scenario: Modelo versionado en el repositorio
- **WHEN** se lee el modelo guardado en `out-modelo`
- **THEN** sus `factores` son exactamente `FACTORES_RIESGO`, en el mismo orden, y tiene una `version` no vacía

### Requirement: Factores sin datos personales
El dominio SHALL calcular los factores de una cita solo a partir de la anticipación, el historial de asistencia del paciente, el perfil del servicio, la hora y el día locales del inicio en la zona de la sede y el último canal del trámite. Los factores MUST NOT incluir sexo, edad, CURP, nombre, teléfono, correo, ubicación ni sede. El vector numérico SHALL seguir el orden de `FACTORES_RIESGO`, y el mismo vector MUST usarse para entrenar y para estimar.

#### Scenario: Hora local de la sede
- **WHEN** una cita en Tepic empieza a las 19:30 UTC de un viernes
- **THEN** la hora local es 12:30 en `America/Mazatlan`, `franjaTarde` vale 1 y `finDeSemana` vale 0

#### Scenario: Paciente sin historial
- **WHEN** el paciente no tiene atenciones ni inasistencias antes de la estimación
- **THEN** `primeraCita` vale 1 y los dos conteos valen 0

#### Scenario: Conteos con tope
- **WHEN** el paciente tiene 7 inasistencias y 12 atenciones previas
- **THEN** `inasistenciasPrevias` vale 5 y `atencionesPrevias` vale 10

### Requirement: Nivel de riesgo
`nivelDesde` SHALL devolver `BAJO` para una probabilidad menor que 0.20, `MEDIO` desde 0.20 y menor que 0.40, y `ALTO` desde 0.40. Una probabilidad fuera de `[0, 1]` o no numérica MUST fallar con regla `PROBABILIDAD_INVALIDA`.

#### Scenario: Límites de los niveles
- **WHEN** se piden los niveles de 0.19, 0.20, 0.39 y 0.40
- **THEN** son `BAJO`, `MEDIO`, `MEDIO` y `ALTO`

#### Scenario: Probabilidad inválida
- **WHEN** se pide el nivel de 1.2
- **THEN** falla con regla `PROBABILIDAD_INVALIDA`

### Requirement: Estimar el riesgo de una cita confirmada
`EstimarRiesgoInasistencia` SHALL estimar el riesgo de un trámite `CONFIRMADA` con horario, paciente, sede y perfil, y devolver un `RiesgoEstimado` con el trámite, el nivel, la probabilidad redondeada a dos decimales, el origen (`MODELO` o `REGLAS`), la versión del modelo y la hora de la estimación tomada del `Reloj`. MUST NOT guardar el trámite, cambiar su versión ni registrar eventos. Un trámite en otro estado o sin esos datos MUST fallar con regla `RIESGO_SOLO_CITA_CONFIRMADA`, y una sede sin zona horaria con `NO_ENCONTRADO`.

#### Scenario: Cita confirmada con modelo
- **WHEN** se estima el riesgo de una cita `CONFIRMADA` y el modelo devuelve 0.43
- **THEN** el resultado es `ALTO` con probabilidad 0.43, origen `MODELO` y la versión del modelo, y el trámite conserva su versión y sus eventos

#### Scenario: Cita sin confirmar
- **WHEN** se estima el riesgo de un trámite `HORARIO_RESERVADO`
- **THEN** falla con regla `RIESGO_SOLO_CITA_CONFIRMADA`

#### Scenario: Estimación repetida
- **WHEN** se estima dos veces la misma cita con el mismo `Reloj` y el mismo historial
- **THEN** los dos resultados son iguales

### Requirement: Respaldo determinista
Si el modelo falla o devuelve una probabilidad inválida, `EstimarRiesgoInasistencia` SHALL usar la estimación por reglas del dominio, con origen `REGLAS` y versión `reglas@1`, y registrar el error con `correlation_id` y sin datos personales. La estimación MUST NOT fallar por el modelo.

#### Scenario: Modelo caído
- **WHEN** el modelo lanza un error al estimar una cita `CONFIRMADA`
- **THEN** el resultado tiene origen `REGLAS` y un nivel válido, y se registra un error con el `correlation_id`

#### Scenario: Modelo con resultado inválido
- **WHEN** el modelo devuelve `NaN`
- **THEN** el resultado tiene origen `REGLAS`

### Requirement: Carga validada del modelo
El adaptador `out-modelo` SHALL validar el JSON del modelo antes de usarlo: forma, `factores` iguales a `FACTORES_RIESGO`, arreglos del mismo largo, valores finitos y desviaciones mayores que 0. Un modelo que no cumpla MUST rechazarse con un error `ModeloInvalido` que diga el motivo. Con un modelo válido, la probabilidad SHALL ser la sigmoide de la combinación lineal de los factores estandarizados y MUST quedar en `[0, 1]`. `out-modelo` MUST NOT importar otros adaptadores, y `pnpm lint:deps` MUST comprobarlo.

#### Scenario: Factores desordenados
- **WHEN** se carga un modelo con dos factores intercambiados
- **THEN** falla con `ModeloInvalido` y el motivo nombra los factores

#### Scenario: Cálculo del modelo
- **WHEN** un modelo de prueba tiene intercepto 0 y coeficientes 0
- **THEN** la probabilidad de cualquier vector es 0.5

#### Scenario: Adaptador del modelo aislado
- **WHEN** un archivo de `out-modelo` importa otro adaptador y se ejecuta `pnpm lint:deps`
- **THEN** el comando falla con la regla `adaptador-aislado-out-modelo`

### Requirement: Plan de recordatorios por nivel
`planPorNivel` SHALL devolver los recordatorios del perfil con la variante de su nivel: `ESTANDAR` en `BAJO`, `CONFIRMAR` en `MEDIO` y `CONFIRMAR_Y_FACILITAR_CAMBIO` en `ALTO`. En `ALTO` SHALL agregar `REFUERZO`. `DEVOLUCION_LLAMADA` MUST agregarse solo en `ALTO` y solo si se habilita de forma explícita; por defecto el nivel alto queda solo con `REFUERZO`. `POST` MUST conservar la variante `ESTANDAR`. El plan MUST NOT contener el nivel ni la probabilidad en ningún texto para el paciente. `varianteDesde` SHALL devolver la variante de cada nivel.

#### Scenario: Nivel alto sin devolución de llamada
- **WHEN** se pide el plan `ALTO` de un perfil con `T48`, `PREPARACION` y `T2`, sin habilitar la devolución de llamada
- **THEN** el plan tiene `T48`, `PREPARACION`, `T2` y `REFUERZO` con variante `CONFIRMAR_Y_FACILITAR_CAMBIO`, y no tiene `DEVOLUCION_LLAMADA`

#### Scenario: Nivel alto con devolución de llamada
- **WHEN** se pide el mismo plan habilitando la devolución de llamada
- **THEN** el plan también tiene `DEVOLUCION_LLAMADA`

#### Scenario: Nivel bajo
- **WHEN** se pide el plan `BAJO` del mismo perfil
- **THEN** el plan tiene exactamente `T48`, `PREPARACION` y `T2` con variante `ESTANDAR`

### Requirement: Hora de envío en la zona de la sede
`horaEnvio` SHALL calcular la hora de cada recordatorio en UTC a partir del inicio de la cita: `T48` 48 h antes, `REFUERZO` 24 h antes, `T2` 2 h antes y `PREPARACION` a las 18:00 locales del día anterior en la zona de la sede. Si la hora cae dentro del horario de silencio local, SHALL moverse al final del silencio. MUST devolver `null` si la hora resultante ya pasó o no queda al menos 30 min antes del inicio, y para `POST` y `DEVOLUCION_LLAMADA`.

#### Scenario: Preparación la tarde anterior
- **WHEN** una cita en Tepic empieza a las 08:05 locales del 10 de diciembre
- **THEN** `PREPARACION` es a las 18:00 locales del 9 de diciembre, en UTC

#### Scenario: Recordatorio dentro del silencio
- **WHEN** el silencio es de 21:00 a 08:00 locales y una cita empieza a las 11:00 locales
- **THEN** `T2` (09:00) y `T48` (11:00, dos días antes) no cambian; con una cita a las 07:00 locales, `T48` pasa de las 07:00 a las 08:00 locales de dos días antes

#### Scenario: Sin tiempo antes de la cita
- **WHEN** el silencio es de 21:00 a 08:00 y la cita empieza a las 08:15 locales
- **THEN** `T2` (06:15) se movería a las 08:00, a menos de 30 min del inicio, y devuelve `null`
