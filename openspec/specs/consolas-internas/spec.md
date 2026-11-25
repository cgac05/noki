# consolas-internas Specification

## Purpose
Define las consolas internas de la web: el call center del asesor, la recepción de la clínica y el tablero de administración, que operan el mismo trámite que el paciente y se actualizan en vivo sin decidir reglas de negocio.

## Requirements

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

### Requirement: Identificación opcional del paciente en el call center
Cuando la última respuesta de comando de la pestaña trae como siguiente pregunta la casilla `paciente` con un `paso` en su pista, la ficha de `/callcenter` SHALL mostrar «Identificar paciente (opcional)» con la pregunta de ese paso, pintada solo a partir de la pista:

- cada opción es un botón con su título;
- los campos se capturan en el modal protegido;
- si la pista trae campos y opciones, se ofrecen ambos.

Al responder SHALL enviarse `IdentificarPaciente` con el `paso` de la pista, canal `callcenter` y actor asesor:

- una opción se envía como el valor que el contrato define para ese paso: `para` en `DESTINATARIO`; `candidato` en `CONFIRMAR`, con `null` para la opción `NINGUNO`; `curp: null` para la opción `SIN_CURP`;
- los campos se envían con su `id` como nombre del dato, y los opcionales vacíos se omiten.

La sección SHALL ofrecer «Reiniciar identificación», que envía el paso `REINICIAR`. La web MUST NOT codificar el orden de los pasos ni sus textos. La sección MUST NOT bloquear las demás operaciones del asesor y MUST NOT mostrarse con la ficha en solo lectura. Un error del núcleo SHALL mostrarse con su mensaje, sin repetir datos capturados, y la sección SHALL seguir ofreciendo «Reiniciar identificación».

#### Scenario: Destinatario
- **WHEN** la última respuesta pide `paciente` con `paso: 'DESTINATARIO'` y opciones «Para mí» y «Para otra persona», y el asesor pulsa «Para mí»
- **THEN** se envía `IdentificarPaciente` con `payload: { paso: 'DESTINATARIO', para: 'MI' }`, y la sección pasa a la pregunta de la nueva respuesta

#### Scenario: No soy ninguno
- **WHEN** el paso es `CONFIRMAR` y el asesor elige «No soy ninguno»
- **THEN** se envía `payload: { paso: 'CONFIRMAR', candidato: null }`

#### Scenario: Candidato con referencia opaca
- **WHEN** el paso es `CONFIRMAR` y el asesor elige «Soy Ana P.»
- **THEN** se envía como `candidato` el `payload` de esa opción, sin transformarlo

#### Scenario: Fecha de nacimiento en el modal
- **WHEN** el paso es `FECHA_NAC` y el asesor completa la fecha en el modal y envía
- **THEN** se envía `payload: { paso: 'FECHA_NAC', fechaNac }` y el modal se cierra

#### Scenario: Sin CURP
- **WHEN** el paso es `CURP` y el asesor pulsa «No la tengo»
- **THEN** se envía `payload: { paso: 'CURP', curp: null }` sin abrir el modal

#### Scenario: Formato inválido
- **WHEN** en el paso `CURP` el valor capturado no cumple el contrato
- **THEN** no se envía nada, y el modal indica qué campo revisar sin mostrar el valor

#### Scenario: Identificación omitida
- **WHEN** la sección está visible y el asesor cotiza un paquete sin responderla
- **THEN** la cotización se envía con normalidad

#### Scenario: Error del núcleo
- **WHEN** el núcleo responde `IDENTIFICACION_BLOQUEADA`
- **THEN** la sección muestra el mensaje del error, conserva «Reiniciar identificación» y no repite la fecha capturada

#### Scenario: Sin pregunta de paciente
- **WHEN** la última respuesta pide otra casilla o no hay respuesta en la pestaña
- **THEN** la sección no aparece

### Requirement: Datos de identificación protegidos en la consola
Los valores de identificación que captura el asesor (fecha de nacimiento, CURP, nombres, sexo, entidad) SHALL vivir solo en memoria mientras el modal está abierto o su envío está en curso. MUST NOT escribirse en `localStorage`, `sessionStorage`, la consola, la URL ni el estado de mutaciones o consultas del cliente, y MUST NOT mostrarse fuera de su campo enmascarado. Se SHALL descartar al terminar el envío con éxito, al cancelar, al cambiar de paso y al salir de la vista. Cada envío SHALL usar su propio `Idempotency-Key`. Un reintento del mismo envío SHALL reutilizar la clave y los valores, y un doble clic MUST enviar una sola vez.

#### Scenario: Sin rastro de la CURP
- **WHEN** el asesor envía una CURP y la respuesta llega
- **THEN** la CURP no aparece en el texto de la página, en el almacenamiento del navegador, en la consola ni en la caché de mutaciones

#### Scenario: Reintento con la misma clave
- **WHEN** el envío de la fecha falla por red y el asesor reintenta
- **THEN** el reintento lleva el mismo `Idempotency-Key` y la misma fecha, sin volver a capturarla

#### Scenario: Cancelar descarta
- **WHEN** el asesor escribe la fecha, cancela el modal y lo vuelve a abrir
- **THEN** el campo está vacío

### Requirement: Cotización desde el catálogo
Mientras el trámite activo no tenga cotización, `/callcenter` SHALL ofrecer un botón de cotizar por cada oferta del catálogo. El texto de cada botón SHALL incluir el servicio, la sede y el precio de esa oferta tal como los devuelve la lectura `catalogo`. Dos ofertas distintas MUST NOT mostrarse con el mismo texto. La vista MUST NOT agrupar, filtrar, ordenar ni ocultar ofertas por su cuenta.

#### Scenario: Catálogo con varios servicios por sede
- **WHEN** el catálogo trae 4 servicios en 3 sedes
- **THEN** hay 12 botones, cada uno con un texto distinto que nombra su servicio, su sede y su precio

#### Scenario: Cotizar la oferta elegida
- **WHEN** el asesor pulsa el botón del «Paquete US mamario + Papanicolaou» en «Clínica Tepic»
- **THEN** se envían `SeleccionarServicio` y `SeleccionarSede` con los identificadores de esa oferta

### Requirement: Fila de atención en clínica
`/clinica` SHALL mostrar, en cada llegada registrada que traiga `posicion`, su turno como «Turno N», en el orden en que llegan las llegadas en la lectura `llegadasSede`. La vista MUST NOT calcular, reordenar ni completar posiciones por su cuenta. Una llegada registrada sin `posicion` SHALL mostrarse sin turno. Al recibir un evento de la sala de la sede, la fila SHALL actualizarse sin recargar.

#### Scenario: Dos pacientes en la fila
- **WHEN** la lectura trae dos llegadas registradas con `posicion` 1 y 2
- **THEN** se ven «Turno 1» y «Turno 2» en sus tarjetas

#### Scenario: Fila en vivo
- **WHEN** `/clinica` está abierta y la sala de su sede recibe `sede:fila`
- **THEN** la vista vuelve a consultar las llegadas y muestra los turnos nuevos sin recargar

### Requirement: Cierre de atención en clínica
Cada llegada registrada SHALL ofrecer «Cerrar atención», que envía `CerrarAtencion` con el `tramiteId` de la cita, `payload: {}`, canal `clinica` y actor de recepción. El envío MUST ocurrir una sola vez aunque se pulse dos veces. Tras la respuesta, la vista SHALL mostrar las llegadas y turnos de la lectura nueva, sin quitar ni mover tarjetas por su cuenta. Qué cita se puede cerrar lo decide el núcleo, no la vista. Un error SHALL mostrarse en la tarjeta con su mensaje y «Reintentar» con la misma clave, sin bloquear las demás tarjetas. La vista MUST NOT ofrecer «INE verificada» ni enviar `ComprobarIdentidad`: en clínica basta el QR firmado.

#### Scenario: Avanzar la fila
- **WHEN** recepción cierra la atención de la llegada con «Turno 1» y la lectura nueva trae la otra llegada con `posicion: 1`
- **THEN** la cita cerrada ya no aparece y la otra muestra «Turno 1»

#### Scenario: Doble clic
- **WHEN** recepción pulsa dos veces seguidas «Cerrar atención»
- **THEN** se envía un solo `CerrarAtencion`

#### Scenario: Error al cerrar
- **WHEN** la API responde con un error al cerrar la atención de una tarjeta
- **THEN** esa tarjeta muestra el mensaje con «Reintentar», el reintento lleva la misma clave y las demás tarjetas siguen operables

#### Scenario: Sin INE verificada
- **WHEN** se muestra una llegada registrada
- **THEN** no hay ningún botón «INE verificada» y la vista nunca envía `ComprobarIdentidad`

### Requirement: Alertas de seguridad en el tablero
`/admin` SHALL mostrar «Alertas de seguridad» con la lista de la consulta `alertasSeguridad`, en el orden recibido. Cada alerta muestra el canal, la hora en la zona del navegador, el número de intentos y la marca «Bloqueado» cuando `bloqueado` es verdadero. La vista MUST NOT mostrar el `id` del evento ni datos personales, y MUST NOT calcular ni filtrar alertas. Sin alertas, SHALL mostrar un estado vacío; con un error de la consulta, su mensaje y «Reintentar», sin ocultar el resto del tablero. La lista SHALL refrescarse sin recargar al recibir eventos de la sala `admin`.

#### Scenario: Alerta con bloqueo
- **WHEN** la consulta trae una alerta de WhatsApp con `intentos: 3` y `bloqueado: true`
- **THEN** el tablero la muestra con su canal, su hora, «3 intentos» y «Bloqueado»

#### Scenario: Sin alertas
- **WHEN** la consulta trae una lista vacía
- **THEN** el tablero muestra «Sin alertas de seguridad» y el resto de secciones

#### Scenario: Consulta no disponible
- **WHEN** `/api/admin/alertas` responde 404 porque el núcleo aún no la implementa
- **THEN** la sección muestra el error con «Reintentar», y los conteos, los KPIs y la línea de tiempo siguen visibles
