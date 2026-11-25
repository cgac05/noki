## MODIFIED Requirements

### Requirement: Continuar por WhatsApp con consentimiento
"Continuar por WhatsApp" SHALL pedir al asesor que confirme que el paciente aceptó continuar por WhatsApp antes de enviar `SolicitarContinuacion` (`destino: 'whatsapp'`) para el trámite activo. El comando MUST enviarse una sola vez por confirmación, aun con doble clic. Cuando la ficha trae `codigoContinuacion`, la vista SHALL mostrar el enlace `/wa?continuar=<código>` y su QR; si la llamada se inició en esa pestaña, el enlace y el QR SHALL incluir además `&numero=<ANI>` con el número capturado en «Llamada entrante». La vista MUST NOT generar el código ni cambiar el estado del trámite por su cuenta.

#### Scenario: Sin confirmación de consentimiento
- **WHEN** el asesor no ha marcado la aceptación del paciente
- **THEN** no se puede enviar la solicitud

#### Scenario: Solicitud enviada una vez
- **WHEN** el asesor confirma el consentimiento y pulsa dos veces seguidas "Continuar por WhatsApp"
- **THEN** se envía un solo `SolicitarContinuacion`

#### Scenario: Enlace y QR tras la solicitud
- **WHEN** después de la solicitud la ficha trae el código de continuación
- **THEN** se muestran el enlace `/wa?continuar=<código>` y su QR

#### Scenario: Enlace con el número de la llamada
- **WHEN** el asesor inició la llamada con el número 3112111821 y pulsa «Cerrar atención (llamada cortada)»
- **THEN** el enlace «Abrir WhatsApp» es `/wa?continuar=<código>&numero=3112111821` y el QR codifica esa misma ruta

#### Scenario: Error al solicitar
- **WHEN** la solicitud falla
- **THEN** la vista muestra el mensaje del error con la opción de reintentar, y el reintento reutiliza la misma clave de idempotencia
