# tramite-nucleo Specification

## Purpose

Define el comportamiento del trámite en el núcleo: llenado de casillas en cualquier orden, hitos calculados, transiciones con versión y eventos, registro de tipos de trámite, hilo de atención y los casos de uso mínimos del Flujo A sobre puertos con adaptadores en memoria.

## Requirements

### Requirement: Llenado de casillas en cualquier orden
Un trámite `AGENDAR` SHALL aceptar el servicio, la sede, el paciente y los requisitos en cualquier orden antes de reservar. Al seleccionar una sede, el caso de uso MUST validar con el catálogo que la sede ofrece el servicio; si no lo ofrece, MUST lanzar `ReglaViolada` con regla `SERVICIO_NO_DISPONIBLE_EN_SEDE` y las sedes alternativas que sí lo ofrecen, sin modificar el trámite. Al quedar servicio y sede, el trámite MUST registrar el precio en centavos y emitir `CotizacionGenerada`. Si el perfil del servicio no tiene requisitos, la casilla `requisitos` MUST considerarse cumplida al seleccionar el servicio.

#### Scenario: Paciente antes que servicio
- **WHEN** en el call center se asigna el paciente y después se seleccionan servicio y sede
- **THEN** el trámite tiene las tres casillas llenas y emitió `PacienteAsignado`, `ServicioSeleccionado`, `SedeSeleccionada` y `CotizacionGenerada`

#### Scenario: Sede sin el servicio
- **WHEN** se selecciona una sede cuya oferta no incluye el servicio elegido
- **THEN** se lanza `ReglaViolada` con `SERVICIO_NO_DISPONIBLE_EN_SEDE` y alternativas, y la versión y las casillas del trámite no cambian

#### Scenario: Cambio de servicio antes de reservar
- **WHEN** se selecciona otro servicio antes de reservar un horario
- **THEN** se recalculan precio, requisitos y elegibilidad, y la sede se conserva solo si el catálogo ofrece el nuevo servicio en ella

### Requirement: Hitos calculados antes de reservar
Antes de reservar, el estado del trámite SHALL calcularse a partir de sus casillas: `BORRADOR` sin servicio o sin sede; `COTIZADO` con servicio, sede y precio; `LISTO_PARA_RESERVAR` cuando además hay paciente asignado y requisitos cumplidos. La elegibilidad MUST NOT bloquear estos hitos: solo genera una advertencia.

#### Scenario: Cotizado
- **WHEN** un trámite tiene servicio, sede y precio pero no paciente
- **THEN** su estado es `COTIZADO`

#### Scenario: Listo para reservar con advertencia de elegibilidad
- **WHEN** el paciente asignado no cumple la elegibilidad del servicio pero hay servicio, sede, precio, paciente y requisitos
- **THEN** el estado es `LISTO_PARA_RESERVAR` y la casilla `elegibilidad` queda pendiente de reconocer

### Requirement: Transiciones de la cita
El trámite SHALL permitir únicamente estas transiciones explícitas: apartar horario solo desde `LISTO_PARA_RESERVAR` a `HORARIO_RESERVADO` (`PLAN.md` §6); confirmar desde `HORARIO_RESERVADO` a `CONFIRMADA`; expirar el hold desde `HORARIO_RESERVADO` de vuelta a `LISTO_PARA_RESERVAR`; registrar llegada de `CONFIRMADA` a `EN_CLINICA`; cerrar atención de `EN_CLINICA` a `ATENDIDA`; cancelar desde `CONFIRMADA` a `CANCELADA`; marcar inasistencia desde `CONFIRMADA` a `NO_ASISTIO`; y expirar por inactividad desde cualquier estado previo a `CONFIRMADA` a `EXPIRADO`. Apartar horario en `BORRADOR` o `COTIZADO` MUST lanzar `ReglaViolada` con regla `CASILLAS_PENDIENTES` y la lista de casillas que faltan para `LISTO_PARA_RESERVAR`, para que el canal sepa qué pedir. Cualquier otra combinación MUST lanzar `TransicionInvalida{de, comando}`. En ambos casos el trámite no cambia. Después de apartar horario, las casillas servicio, sede y paciente MUST NOT cambiar.

#### Scenario: Flujo completo
- **WHEN** un trámite listo aparta horario, confirma, registra llegada y cierra atención
- **THEN** pasa por `HORARIO_RESERVADO`, `CONFIRMADA`, `EN_CLINICA` y `ATENDIDA`, y emite `HorarioReservado`, `CitaConfirmada{folio}`, `PacienteLlego` y `AtencionCerrada`

#### Scenario: Apartar sin estar listo
- **WHEN** se intenta apartar horario en un trámite `COTIZADO` sin paciente y con requisitos pendientes
- **THEN** se lanza `ReglaViolada` con `CASILLAS_PENDIENTES` y `casillas` igual a `paciente` y `requisitos`, y el estado sigue en `COTIZADO`

#### Scenario: Transición inválida
- **WHEN** se intenta registrar la llegada de un trámite en `COTIZADO`
- **THEN** se lanza `TransicionInvalida` con `de: 'COTIZADO'` y el comando, y la versión no cambia

#### Scenario: Hold expirado
- **WHEN** expira el hold de un trámite en `HORARIO_RESERVADO`
- **THEN** emite `ReservaExpirada`, la casilla `horario` queda vacía y el estado vuelve a `LISTO_PARA_RESERVAR`

#### Scenario: Expiración solo antes de confirmar
- **WHEN** se expira por inactividad un trámite `CONFIRMADA`
- **THEN** se lanza `TransicionInvalida`; en cambio, uno `COTIZADO` pasa a `EXPIRADO` y emite `TramiteExpirado`

#### Scenario: Cancelación con anticipación
- **WHEN** se cancela una cita confirmada 30 horas antes de su inicio según el `Reloj`
- **THEN** pasa a `CANCELADA` y emite `CitaCancelada{anticipacionHoras: 30}`

### Requirement: Versión y eventos pendientes
Cada operación que cambia un trámite SHALL incrementar `version` exactamente una vez y agregar a `eventosPendientes()` sus eventos con la envoltura completa (`tramiteId`, `hiloId`, `canal`, `actor`, `nivelAuth`, nueva `version`, `correlationId`, `idempotencyKey` distinta por evento y `ts` del `Reloj`). Una operación rechazada MUST NOT cambiar versión, casillas ni eventos pendientes. El repositorio MUST rechazar con `ConflictoVersion{esperada, actual}` el guardado de un trámite cuya versión de carga ya no coincide con la almacenada, y al guardar con éxito MUST conservar los eventos y vaciar los pendientes.

#### Scenario: Una versión por operación
- **WHEN** se selecciona la sede que completa la cotización
- **THEN** la versión sube en uno y los eventos `SedeSeleccionada` y `CotizacionGenerada` llevan esa versión y claves de idempotencia distintas

#### Scenario: Escritura concurrente
- **WHEN** dos casos de uso cargan la misma versión del trámite, ambos lo modifican y ambos guardan
- **THEN** el primero se guarda y el segundo recibe `ConflictoVersion` sin alterar lo guardado

#### Scenario: Sin datos sensibles en eventos
- **WHEN** se asigna un paciente y se evalúa su elegibilidad
- **THEN** ningún evento emitido contiene fecha de nacimiento, sexo, teléfono, correo ni otro dato personal; solo IDs

### Requirement: Registro de tipos de trámite
El núcleo SHALL obtener casillas, dependencias, orden por canal, pistas de interfaz y transiciones de un registro de tipos de trámite. `AGENDAR` MUST estar registrado. Iniciar un trámite de un tipo no registrado MUST lanzar `ReglaViolada` con regla `TIPO_TRAMITE_NO_REGISTRADO`. El código del núcleo (entidad, `siguientePregunta`, casos de uso) MUST NOT ramificar por el valor del tipo de trámite.

#### Scenario: Tipo no registrado
- **WHEN** se inicia un trámite `FACTURA` sin haberlo registrado
- **THEN** se lanza `ReglaViolada` con `TIPO_TRAMITE_NO_REGISTRADO`

#### Scenario: Extensión sin tocar el núcleo
- **WHEN** una prueba registra una definición mínima para otro tipo con sus propias casillas y orden
- **THEN** `siguientePregunta` y las transiciones de ese tipo funcionan sin modificar archivos del núcleo, y una búsqueda de comparaciones con literales de tipo de trámite en `domain` y `application` no encuentra ninguna fuera del registro de `AGENDAR`

### Requirement: Hilo de atención y cambio de canal
Cada trámite SHALL pertenecer a un hilo de atención que conserva su último canal. Cuando un trámite se retoma desde un canal distinto del último, el núcleo MUST emitir `CanalCambiado{de, a, metodo}` y actualizar el último canal del hilo y del trámite.

#### Scenario: Retomar desde otro canal
- **WHEN** un trámite cuyo último canal es `callcenter` se retoma en `whatsapp` con un token
- **THEN** se emite `CanalCambiado{de: 'callcenter', a: 'whatsapp', metodo: 'TOKEN_CC'}` y el último canal pasa a `whatsapp`

### Requirement: Casos de uso del Flujo A con adaptadores en memoria
La capa de aplicación SHALL ofrecer los casos de uso iniciar trámite, seleccionar servicio, seleccionar sede, asignar paciente, cumplir requisito, reconocer advertencia de elegibilidad, reservar horario, confirmar cita, retomar trámite, registrar llegada y cancelar cita. Cada caso de uso MUST obtener el tiempo del puerto `Reloj` y los IDs del puerto `GeneradorId`, depender solo de puertos de aplicación y devolver el trámite actualizado, sus eventos nuevos y la siguiente pregunta para el canal del comando. Cada puerto que usen MUST tener un adaptador en `packages/adapters/memory`. Las pruebas de dominio y aplicación MUST correr sin infraestructura en menos de 2 s.

#### Scenario: Camino feliz con guarda y concurrencia
- **WHEN** se prueba cada caso de uso con adaptadores en memoria
- **THEN** hay al menos un camino feliz, una guarda que falla y, donde aplica, un caso de concurrencia

#### Scenario: Llegada con token de un solo uso
- **WHEN** recepción registra la llegada con el token del QR y después repite el mismo token
- **THEN** la primera vez el trámite pasa a `EN_CLINICA`; la segunda se rechaza y el trámite no cambia

#### Scenario: Sin infraestructura
- **WHEN** se ejecuta `pnpm test` con Docker detenido
- **THEN** las pruebas del núcleo pasan
