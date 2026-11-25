# Spec Delta

## ADDED Requirements

### Requirement: Reloj de demo en el tablero
Cuando el cliente ofrece «adelantar reloj», `/admin` SHALL mostrar la sección «Reloj de demo» con:

- botones +15 min, +1 h, +1 día y +1 semana;
- un campo de minutos enteros de 1 a 10 080 con su botón;
- un aviso de que adelantar afecta a toda la demo.

Cada acción SHALL enviar una sola vez aunque se pulse dos veces, y los controles MUST deshabilitarse mientras el envío está en curso. Tras la respuesta, la sección SHALL mostrar la hora del sistema devuelta en la zona del navegador y en UTC, y el tablero SHALL volver a consultar sus lecturas. Un error SHALL mostrarse en la sección con su mensaje y «Reintentar», sin ocultar el resto del tablero. Un valor fuera de rango en el campo MUST NOT enviarse y SHALL explicar el rango. Cuando el cliente no ofrece la operación, la sección MUST NOT mostrarse.

#### Scenario: Adelantar una hora
- **WHEN** en `/admin` se pulsa «+1 h» y la API responde `{ ahora }`
- **THEN** se envía un solo adelanto de 60 minutos, la sección muestra la nueva hora del sistema y el tablero vuelve a consultar sus lecturas

#### Scenario: Doble clic
- **WHEN** se pulsa dos veces seguidas «+1 día»
- **THEN** se envía un solo adelanto de 1 440 minutos

#### Scenario: Campo fuera de rango
- **WHEN** se escriben 20 000 minutos
- **THEN** no se envía nada y la sección explica que el rango es de 1 a 10 080

#### Scenario: Hold vencido en vivo
- **WHEN** hay un horario apartado sin confirmar con hold de 10 minutos y se pulsa «+15 min» en modo real
- **THEN** sin recargar, el conteo por estado pasa ese trámite de `HORARIO_RESERVADO` a `LISTO_PARA_RESERVAR`; si es el hilo mostrado, su línea de tiempo incluye `ReservaExpirada`

#### Scenario: Modo simulado
- **WHEN** se abre `/admin` en modo simulado
- **THEN** no aparece la sección «Reloj de demo»
