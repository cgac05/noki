## ADDED Requirements

### Requirement: Clave de idempotencia única también en memoria
Los adaptadores en memoria de trámites y de eventos sin trámite SHALL poder configurarse para rechazar un evento cuya `idempotency_key` ya existe, igual que la restricción única de `evento` en Postgres. En ese caso el guardado MUST fallar sin cambiar el trámite ni los eventos guardados, y el trámite MUST conservar sus pendientes. La composición de pruebas de la API (`crearApiPruebas`) MUST usar ese modo, para que las pruebas HTTP y de WhatsApp en memoria detecten claves repetidas.

#### Scenario: Clave repetida en memoria
- **WHEN** con el modo estricto se guarda un trámite cuyo evento tiene una `idempotency_key` ya guardada
- **THEN** el guardado falla, el trámite guardado conserva su versión y el trámite en memoria conserva sus pendientes

#### Scenario: Pruebas del núcleo sin modo estricto
- **WHEN** las pruebas del núcleo usan el repositorio en memoria sin configurarlo
- **THEN** se comporta igual que antes y acepta claves repetidas
