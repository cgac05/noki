# Spec Delta

## ADDED Requirements

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
