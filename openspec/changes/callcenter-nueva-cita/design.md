# Design

## Decisions

### D1. Bandera en el contrato
`IniciarTramite.payload.nuevo?: boolean`. Sin la bandera, o en `false`, todo sigue igual. Solo tiene efecto en `callcenter` con actor `asesor:*` y `contacto` (la única vía que retoma al iniciar); en otros canales se ignora.

### D2. Paciente del trámite en proceso
Con `nuevo: true`, `CasosTramite.iniciar` busca el trámite que habría retomado (`tramitesEnProcesoPorTelefono(...)[0]`). Crea el trámite nuevo en el hilo del contacto `callcenter` como hoy y, si aquel tenía `pacienteId`, asigna el mismo paciente al nuevo con la misma regla que `AsignarPaciente` del asesor (registra `PacienteAsignado`, sin `IdentidadVinculada` nueva). El trámite anterior no cambia.

### D3. Cómo sabe la vista que retomó
La respuesta de `IniciarTramite` incluye los eventos de la operación. Si no hay `TramiteIniciado` (hubo retoma), `CallCenter.tsx` muestra el aviso con «Continuar con este estudio» y «Nueva cita». «Continuar» solo oculta el aviso. «Nueva cita» envía `IniciarTramite` con el mismo ANI y `nuevo: true`, y la ficha pasa al trámite nuevo (mismo flujo que «Llamada entrante»). El ANI se conserva para «Completar la cita aquí» y el enlace de WhatsApp.

### D4. Fecha de nacimiento en la ficha (revisión 1, pedido de Christian: «pon la fecha de nacimiento en pantalla y haz que el operador marque un check que lo validó»)
Revisión 2 (pausa de Codex: la ficha `/api/hilos/:hiloId/ficha` no verifica rol y la consume también `/web`). La ficha NO cambia. Consulta aparte, solo de demo, `fechaNacimientoLlamada` (`GET /api/demo/callcenter/hilos/:hiloId/fecha-nacimiento` → `{ fechaNacimiento: string|null }`), del mismo paciente que `nombrePila` (lecturas memoria y Postgres), consumida solo por `CallCenter.tsx`. La API no tiene control de rol en consultas, así que la única barrera disponible es `soloDemo`: fuera de demo la ruta no existe. No contradice `PLAN.md §8`: el dato no se revela al que llama; el asesor lo usa para comparar con lo que dice el cliente. En `CallCenter.tsx` se muestra como «Fecha de nacimiento» (DD/MM/AAAA) y una casilla local «Validé la fecha de nacimiento con el cliente» (estado de la vista, sin evento). La casilla habilita «Continuar con este estudio», «Nueva cita» y «Completar la cita aquí» cuando hay paciente. Se reinicia con cada llamada (igual que el consentimiento de WhatsApp).

## Risks
La fecha de nacimiento es un dato personal que el asesor ve en pantalla. Solo se muestra en `/callcenter` mediante una consulta solo de demo; en la demo no hay autenticación de personal, así que quien conozca la ruta y el `hiloId` podría leerla (limitación de la demo, igual que `sesionWebDemo`). Fuera de demo no existe. Un número compartido por dos personas: «Nueva cita» heredaría el paciente del trámite en proceso. El asesor puede corregirlo con la identificación (cambiar destinatario). Se acepta para la demo.
