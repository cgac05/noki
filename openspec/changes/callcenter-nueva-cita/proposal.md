# Proposal

## Why

Christian (2026-11-25, hilo del proyecto): «en el call center ya identifica al cliente, pero debe de manejar la opción de continuar con el estudio (la que ya tiene ahorita) y crear una nueva cita». Hoy, si el número de la llamada tiene un trámite `AGENDAR` en proceso, `IniciarTramite` lo retoma siempre (`CasosTramite.iniciar`, requisito «Llamada entrante retoma el trámite en proceso del número»), y el asesor no puede abrir una cita distinta.

## What Changes

- **Contrato:** `IniciarTramite.payload` admite `nuevo?: boolean` (por defecto `false`).
- **Núcleo:** con `nuevo: true`, la llamada no retoma: crea un trámite nuevo en el hilo del contacto `callcenter`. Si el trámite en proceso que se habría retomado tiene paciente, el nuevo queda con ese mismo paciente asignado (`PacienteAsignado`), para no volver a pedir la identificación.
- **Call center:** cuando la llamada retoma un trámite, la ficha muestra «Este número tiene un estudio en proceso: <servicio> en <sede>» con dos opciones: «Continuar con este estudio» (lo de hoy) y «Nueva cita», que envía `IniciarTramite` con `nuevo: true` y abre la ficha del trámite nuevo.

- **Fecha de nacimiento:** la ficha muestra la fecha de nacimiento del paciente y una casilla «Validé la fecha de nacimiento con el cliente». Sin marcarla, «Continuar con este estudio», «Nueva cita» y «Completar la cita aquí» quedan deshabilitados. Christian: «pon la fecha de nacimiento en pantalla y haz que el operador marque un check que lo validó».

### Fuera de alcance
WhatsApp, web y app (siguen retomando como hoy). Elegir entre varios trámites en proceso (se ofrece el que ya se elige hoy).

## Capabilities

### Modified Capabilities
- `contratos-canales`: requisito nuevo «Iniciar un trámite nuevo aunque haya uno en proceso».
- `continuidad-canales`: requisito nuevo «Llamada entrante con cita nueva».
- `consolas-internas`: requisitos nuevos «Elegir entre continuar o nueva cita en la llamada» y «Validación de la fecha de nacimiento por el asesor».
- `contratos-consultas`: requisito nuevo «Fecha de nacimiento para validar en la llamada» (consulta solo de demo; la ficha no cambia).

## Impact
`packages/contracts/src/comandos.ts`, `packages/contracts/src/consultas.ts` (consulta `fechaNacimientoLlamada`), `rutasConsultas.ts`, lecturas memoria y Postgres, `packages/application/src/CasosTramite.ts`, `apps/web/src/vistas/CallCenter.tsx`, cliente simulado, pruebas (contrato, núcleo en memoria, integración HTTP y vista), `docs/contratos.md`.
