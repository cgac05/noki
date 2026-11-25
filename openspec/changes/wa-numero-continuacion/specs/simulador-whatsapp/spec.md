## MODIFIED Requirements

### Requirement: Continuación por enlace
Al abrir `/wa?continuar=<código>`, el simulador SHALL enviar una sola vez el texto `CONTINUAR <código>` desde el número elegido, mostrar la respuesta y retirar el parámetro con `history.replaceState`. Si la URL trae además `numero` con 10 a 15 dígitos, el simulador SHALL cambiar a ese número antes de enviar y enviar desde él; un `numero` inválido MUST ignorarse. Ambos parámetros SHALL retirarse de la URL. La aplicación SHALL declarar `Referrer-Policy: no-referrer`. Un código vacío MUST NOT enviarse.

#### Scenario: Enlace del call center
- **WHEN** se abre `/wa?continuar=<código>` con un código válido
- **THEN** se envía `CONTINUAR <código>` una sola vez, el bot retoma el trámite y la URL queda como `/wa`

#### Scenario: Enlace con número
- **WHEN** se abre `/wa?continuar=<código>&numero=3112111821`
- **THEN** el número del simulador es 3112111821, `CONTINUAR <código>` se envía una sola vez con `waId` 3112111821, ningún mensaje sale desde el número de demo y la URL queda como `/wa`

#### Scenario: Número inválido en el enlace
- **WHEN** se abre `/wa?continuar=<código>&numero=12ab`
- **THEN** se ignora el número y se envía desde el número actual

#### Scenario: Sin reenvío
- **WHEN** la vista se vuelve a renderizar o se recarga después del envío
- **THEN** el mensaje no se envía de nuevo

#### Scenario: Código inválido
- **WHEN** se abre `/wa?continuar=` sin código
- **THEN** no se envía nada y se muestra la conversación con la caja de texto

#### Scenario: Sin referer
- **WHEN** se inspecciona el documento de la aplicación
- **THEN** declara la política de referer `no-referrer`
