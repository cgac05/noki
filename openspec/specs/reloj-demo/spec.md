# reloj-demo Specification

## Purpose
Define el reloj ajustable de la API en modo demo, que permite adelantar el tiempo para mostrar en vivo las expiraciones y los demás temporizadores (`PLAN.md` §14.13).

## Requirements

### Requirement: Adelantar el reloj en modo demo
Con `DEMO_MODE=true`, `POST /api/demo/reloj` con el cuerpo `{ adelantarMinutos }` (entero de 1 a 10080) SHALL adelantar ese número de minutos el `Reloj` que usan todos los casos de uso, tokens, consultas y temporizadores de la API, y MUST responder 200 con `{ ahora }` en ISO 8601 UTC. Un cuerpo inválido MUST responder 400 sin cambiar el reloj. Fuera de `DEMO_MODE=true` el endpoint MUST responder 404 y el reloj MUST ser el del sistema. El reloj MUST NOT retroceder.

#### Scenario: Adelanto válido
- **WHEN** con `DEMO_MODE=true` se envía `{ adelantarMinutos: 60 }`
- **THEN** la respuesta trae `ahora` una hora después de la hora real y la siguiente cotización usa ese tiempo

#### Scenario: Cuerpo inválido
- **WHEN** se envía `{ adelantarMinutos: 0 }` o `{ adelantarMinutos: -5 }`
- **THEN** responde 400 y el reloj no cambia

#### Scenario: Fuera de modo demo
- **WHEN** sin `DEMO_MODE=true` se envía `{ adelantarMinutos: 60 }`
- **THEN** responde 404

### Requirement: Adelantar dispara los temporizadores vencidos
Al adelantar el reloj, todos los trabajos programados cuyo vencimiento quede en o antes del nuevo `ahora` SHALL ejecutarse sin esperar el tiempo real. Los trabajos que sigan en el futuro MUST NOT ejecutarse antes de su vencimiento según el `Reloj`.

#### Scenario: Hold vencido al adelantar
- **WHEN** un trámite tiene un hold que vence en 10 min y se adelanta el reloj 11 min
- **THEN** en menos de 5 s el trámite queda `LISTO_PARA_RESERVAR` con `ReservaExpirada`

#### Scenario: Trabajo aún en el futuro
- **WHEN** un trámite tiene un hold que vence en 10 min y se adelanta el reloj 5 min
- **THEN** el trámite sigue `HORARIO_RESERVADO`

#### Scenario: Reinicio de la API con el reloj adelantado
- **WHEN** se adelantó el reloj, se apartó un horario y la API se reinicia (el desfase vuelve a 0)
- **THEN** el hold no vence antes de que el `Reloj` real llegue a su `expiraEn`
