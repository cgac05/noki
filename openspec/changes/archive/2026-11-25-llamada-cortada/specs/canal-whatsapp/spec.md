## ADDED Requirements

### Requirement: Continuación tras llamada cortada
`/callcenter` SHALL ofrecer «Cerrar atención (llamada cortada)» en la ficha de un trámite abierto, que envía `SolicitarContinuacion` con el asesor. Cuando después escribe en WhatsApp el mismo número que el ANI de ese hilo y hay una continuación vigente sin usar, el bot SHALL avisar que la llamada se cortó, mostrar lo ya guardado (servicio, sede, horario y paciente enmascarado, si existen) y retomar el trámite con esa continuación de un solo uso, siguiendo con la siguiente pregunta pendiente. Sin coincidencia exacta de número o sin continuación vigente, WhatsApp MUST comportarse como antes.

#### Scenario: Llamada cortada y continuación
- **WHEN** el asesor cotiza un servicio en una sede para el ANI `5210000000001`, pulsa «Cerrar atención (llamada cortada)» y luego `5210000000001` escribe «Hola» en `/wa`
- **THEN** el bot dice que la llamada se cortó, muestra el servicio y la sede guardados y continúa con la siguiente pregunta, sin pedir `CONTINUAR`

#### Scenario: Otro número
- **WHEN** escribe en `/wa` un número distinto del ANI
- **THEN** no se retoma el trámite del Call Center

#### Scenario: Un solo uso
- **WHEN** la continuación ya se usó
- **THEN** un nuevo «Hola» del mismo número no la vuelve a consumir
