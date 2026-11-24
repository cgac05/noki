# Spec Delta

## Purpose

Define las consolas internas de la web: el call center del asesor, la recepción de la clínica y el tablero de administración, que operan el mismo trámite que el paciente y se actualizan en vivo sin decidir reglas de negocio.

## ADDED Requirements

### Requirement: Llamada entrante con ANI
`/callcenter` SHALL ofrecer "Llamada entrante" con un campo del número de la llamada (ANI). El campo inicia con el número de la paciente de demo y se valida con el patrón del contrato (10 a 15 dígitos). Al pulsar el botón se SHALL enviar `IniciarTramite` con ese número en `payload.contacto`, como actor asesor y canal `callcenter`. El número completo MUST NOT mostrarse después en la ficha, que solo muestra lo que devuelve la lectura.

#### Scenario: Llamada con el número de demo
- **WHEN** el asesor pulsa "Llamada entrante" sin cambiar el número
- **THEN** se envía `IniciarTramite` con `payload.contacto` igual al número de demo y la vista muestra la ficha del hilo

#### Scenario: Número inválido
- **WHEN** el asesor escribe un número de 5 dígitos
- **THEN** el botón queda deshabilitado, se explica el formato y no se envía nada

#### Scenario: ANI no expuesto
- **WHEN** la ficha se muestra después de la llamada
- **THEN** solo aparece el teléfono enmascarado de la lectura (o "—" si es nulo), nunca el número completo

### Requirement: Ficha del hilo para el asesor
`/callcenter` SHALL mostrar la ficha del hilo con el nombre de pila y el teléfono enmascarado (o "—" cuando son nulos), el estado de cada trámite, la cotización si existe y la línea de tiempo con el canal de cada evento. Las operaciones del asesor SHALL enviarse como comandos del canal `callcenter` con actor asesor. Cuando la ficha está en solo lectura, todas las operaciones MUST deshabilitarse y se SHALL mostrar un aviso de que la atención sigue en otro canal.

#### Scenario: Ficha sin paciente vinculado
- **WHEN** la lectura de la ficha trae `nombrePila` y `telefonoEnmascarado` nulos
- **THEN** la vista muestra "—" en ambos y no falla

#### Scenario: Solo lectura
- **WHEN** la ficha llega con `soloLectura` verdadero
- **THEN** los botones de cotizar y de continuar están deshabilitados y se ve el aviso de solo lectura

### Requirement: Continuar por WhatsApp con consentimiento
"Continuar por WhatsApp" SHALL pedir al asesor que confirme que el paciente aceptó continuar por WhatsApp antes de enviar `SolicitarContinuacion` (`destino: 'whatsapp'`) para el trámite activo. El comando MUST enviarse una sola vez por confirmación, aun con doble clic. Cuando la ficha trae `codigoContinuacion`, la vista SHALL mostrar el enlace `/wa?continuar=<código>` y su QR. La vista MUST NOT generar el código ni cambiar el estado del trámite por su cuenta.

#### Scenario: Sin confirmación de consentimiento
- **WHEN** el asesor no ha marcado la aceptación del paciente
- **THEN** no se puede enviar la solicitud

#### Scenario: Solicitud enviada una vez
- **WHEN** el asesor confirma el consentimiento y pulsa dos veces seguidas "Continuar por WhatsApp"
- **THEN** se envía un solo `SolicitarContinuacion`

#### Scenario: Enlace y QR tras la solicitud
- **WHEN** después de la solicitud la ficha trae el código de continuación
- **THEN** se muestran el enlace `/wa?continuar=<código>` y su QR

#### Scenario: Error al solicitar
- **WHEN** la solicitud falla
- **THEN** la vista muestra el mensaje del error con la opción de reintentar, y el reintento reutiliza la misma clave de idempotencia

### Requirement: Recepción de llegadas en la clínica
`/clinica` SHALL listar las llegadas esperadas de la sede del contexto con servicio, sede, fecha en la zona horaria de la sede y estado, y SHALL permitir registrar una llegada enviando `RegistrarLlegada` con el token de la cita, como actor de recepción y canal `clinica`. Una llegada registrada SHALL mostrarse como tal y sin acción. Si todavía no hay sede en el contexto, la vista SHALL explicarlo y ofrecer volver a consultar el contexto.

#### Scenario: Registrar una llegada
- **WHEN** recepción pulsa "Registrar llegada" en una cita esperada
- **THEN** se envía `RegistrarLlegada` con el token de esa cita y, al actualizarse la lista, la cita aparece como registrada

#### Scenario: Sin contexto de sede
- **WHEN** se abre `/clinica` en modo real sin cita confirmada en la demo
- **THEN** la vista explica que aún no hay llegadas que mostrar y ofrece "Actualizar", que vuelve a consultar el contexto

#### Scenario: Sin llegadas esperadas
- **WHEN** la sede no tiene llegadas esperadas
- **THEN** la vista muestra un estado vacío, no un error

### Requirement: Tablero de administración
`/admin` SHALL mostrar el conteo de trámites por estado, los KPIs de la lectura de métricas y la línea de tiempo del hilo del contexto con el canal de cada evento. Los KPIs documentados en `docs/contratos.md` SHALL mostrarse con un nombre legible en español; una clave no documentada SHALL mostrarse con su clave y su valor, sin ocultarse. La vista MUST NOT calcular ni derivar métricas.

#### Scenario: KPI documentado
- **WHEN** las métricas traen `cambiosCanal`
- **THEN** el tablero lo muestra con un nombre legible y su valor

#### Scenario: KPI desconocido
- **WHEN** las métricas traen una clave que la web no conoce
- **THEN** el tablero la muestra con su clave y su valor

#### Scenario: Sin hilo en el contexto
- **WHEN** no hay hilo en el contexto
- **THEN** el tablero muestra los conteos y los KPIs, y en lugar de la línea de tiempo explica que aún no hay hilo que mostrar

### Requirement: Consolas en vivo por sala
Cada consola SHALL unirse a su sala de tiempo real mientras está abierta: `/callcenter` a la del hilo activo, `/clinica` a la de su sede y `/admin` a la sala `admin` y a la del hilo del contexto. Al recibir un evento de su sala, la consola SHALL actualizar sus lecturas sin recargar. Al salir de la vista o cambiar el hilo o la sede, SHALL dejar la sala anterior.

#### Scenario: Llegada registrada desde otra pestaña
- **WHEN** `/admin` está abierta y en otra pestaña se registra una llegada
- **THEN** el tablero actualiza el conteo por estado y la línea de tiempo sin recargar

#### Scenario: Cambio de hilo
- **WHEN** `/callcenter` pasa de un hilo a otro
- **THEN** deja la sala del hilo anterior y se une a la del nuevo
