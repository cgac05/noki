# Spec Delta

## MODIFIED Requirements

### Requirement: Tiempo real con nombres compartidos
El paquete de contratos SHALL definir una sola vez:

- los nombres de eventos de Socket.IO y el esquema del dato de cada evento, incluido `wa:mensajes` con `{ waId, mensajes }`: `waId` de 10 a 15 dígitos y `mensajes` de 1 a 5 elementos válidos según `MensajeBotSchema`;
- las salas `tramite:<id>`, `hilo:<id>`, `paciente:<id>`, `sede:<id>`, `admin` y `wa:<waId>`, esta última con `waId` de 10 a 15 dígitos;
- los eventos que envía el cliente para unirse a una sala (`sala:unirse`) y salir de ella (`sala:salir`).

El dato de los eventos del cliente MUST ser una sala válida.

#### Scenario: Sala mal formada
- **WHEN** se valida una sala con un prefijo distinto de los seis definidos
- **THEN** la validación falla

#### Scenario: Evento desconocido
- **WHEN** un cliente se suscribe con un nombre de evento que no está en las constantes
- **THEN** la verificación de tipos falla

#### Scenario: Unirse a una sala inválida
- **WHEN** se valida el dato de `sala:unirse` igual a `"tramite:123"`
- **THEN** la validación falla

#### Scenario: Sala de WhatsApp
- **WHEN** se validan las salas `wa:5210000000002`, `wa:55-1234` y `wa:123`
- **THEN** solo la primera es válida

#### Scenario: Mensajes salientes de WhatsApp
- **WHEN** se valida `wa:mensajes` con un `waId` válido y un mensaje de botones, sin mensajes, con 6 mensajes y con un `waId` de 5 dígitos
- **THEN** solo el primero es válido
