# Spec Delta

## ADDED Requirements

### Requirement: Reloj de demo en el cliente
El cliente real SHALL ofrecer «adelantar reloj» solo cuando `VITE_DEMO` es `true`. La operación envía `POST` a la ruta de `RUTA_RELOJ_DEMO` con `{ adelantarMinutos }`. La entrada MUST validarse con `AdelantarRelojSchema` antes de cualquier petición, y la respuesta con `RespuestaRelojSchema`. Los errores llegan a la vista como los demás errores del cliente. El cliente simulado y el real sin `VITE_DEMO` MUST NOT ofrecer la operación, y las vistas no la ven.

#### Scenario: Adelantar en modo demo
- **WHEN** el cliente real con `VITE_DEMO=true` adelanta 15 minutos y la API responde `{ ahora }`
- **THEN** la petición es `POST /api/demo/reloj` con `{ adelantarMinutos: 15 }` y la vista recibe `ahora`

#### Scenario: Minutos fuera de rango
- **WHEN** se pide adelantar 0 o 10 081 minutos
- **THEN** el cliente lo rechaza con un error de validación sin hacer la petición

#### Scenario: Sin modo demo
- **WHEN** el cliente es simulado, o es real sin `VITE_DEMO=true`
- **THEN** no ofrece la operación

#### Scenario: Respuesta mal formada
- **WHEN** la API responde `{ ahora: 'ayer' }`
- **THEN** la vista recibe un error de contrato
