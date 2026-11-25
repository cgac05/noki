# Spec Delta

## ADDED Requirements

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
