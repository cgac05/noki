# Design

## Context

Ver `proposal.md` (Why). Estado en `c9d18dd`:

- `apps/sd-mock/src/crearSdMock.ts` y `AgendaExternaMemoria.disponibilidad` calculan `Date.parse(fecha + 'T07:00:00Z')` más 15 intervalos de 30 minutos. En `America/Mazatlan` eso son de 00:00 a 07:00, y en `America/Tijuana` de 23:00 del día anterior a 06:00. `ConsultaDisponibilidad` no lleva zona.
- `ConversacionWa.mensajes` ya convierte a la zona de la sede (`lecturas.zonaSede`), pero con formato `HH:mm`. `formatear` usa `dd/MM/yyyy HH:mm` en el resumen, el vencimiento y la confirmación.
- Los textos crudos están en `ConversacionWa` y en `identificacionWa.ts`:
  - `tramite.canalOrigen` dentro del resumen y de la lista `VARIOS`;
  - `r.tipo.replaceAll('_', ' ')` en los botones de requisitos;
  - `'Selecciona ' + casilla + '.'` en las listas;
  - `'Elige una opción.'` en `CONFIRMAR`.
- `CasosTramite.contacto()` crea el hilo con el canal del primer contacto y nunca lo actualiza. `HiloAtencion` solo cambia su canal en `retomar`, que devuelve el payload de `CanalCambiado`.
- `soloLectura` se calcula igual en memoria y en Postgres: el último `CanalCambiado` del hilo va de `callcenter` a otro canal. Nada lo revierte salvo otro `CanalCambiado` hacia `callcenter`, y eso solo ocurre al retomar un trámite en el call center, que el flujo no hace.

## Goals / Non-Goals

**Goals:** que los horarios de la demo caigan en horario de atención de cada sede y se lean con su día, que el bot no muestre identificadores, y que una llamada nueva deje operar al asesor.

**Non-Goals:** elegir el día en WhatsApp, horarios por recurso, cerrar los trámites viejos del hilo, cambiar contratos o el vocabulario de eventos.

## Decisions

### D1. La zona viaja en la consulta de disponibilidad
`ConsultaDisponibilidad` agrega `zonaHoraria: string` (IANA). `ConversacionWa` ya obtiene la zona con `lecturas.zonaSede` y la pasa. `out-sd` la envía como parámetro `zonaHoraria`. `sd-mock` la valida con Zod y con `Intl.DateTimeFormat` (igual que `CitaVistaSchema`), y genera los inicios con `fromZonedTime(fecha + 'T09:00:00', zona)` de `date-fns-tz` `3.2.0`, más `i × 30 min` para `i = 0…14`. El adaptador en memoria usa la misma función, para que la prueba de equivalencia de `sdAgenda.test.ts` siga valiendo.

Si no hay zona de sede, `ConversacionWa` ya usa `'UTC'` y lo conserva. Una sede sin zona es un error de semilla, no de este cambio.

*Alternativa descartada:* que `sd-mock` conozca las sedes de la semilla. Tendría que importar datos de `apps/api` o duplicarlos, y el simulador quedaría acoplado a la demo.

*Alternativa descartada:* corregir solo el formato. La cita seguiría quedando a medianoche, que es la falla real.

### D2. Un módulo de textos para WhatsApp
Un módulo nuevo `packages/adapters/in-http/src/textosWa.ts` concentra lo siguiente:

- `fechaCorta(inicio, zona)` → `EEE d MMM · HH:mm` y `fechaLarga(inicio, zona)` → `EEEE d 'de' MMMM, HH:mm`, con `formatInTimeZone` y `es` de `date-fns/locale`. Comprobado en `c9d18dd`: `2026-11-26T16:15:00Z` en `America/Mazatlan` da «jue 26 nov · 09:15» y «jueves 26 de noviembre, 09:15».
- `canalOrigen: Record<Canal, string>`, `requisito: Record<TipoRequisito, string>` y `preguntaCasilla: Partial<Record<Casilla, string>>`, tipados de forma exhaustiva para que un canal o requisito nuevo no compile sin su etiqueta.

`identificacionWa.ts` solo cambia el texto de `CONFIRMAR`.

Resumen al retomar: `Retomamos tu trámite: {servicio} en {sede}[, {fechaLarga}]. Lo iniciaste {canalOrigen}.` Fila de `VARIOS`: `{servicio} · {sede} · {canalOrigen}`.

La lista de horarios conserva el día de mañana del código actual. Con la fecha en cada fila, el texto de la lista basta con «¿Qué horario prefieres?».

*Alternativa descartada:* poner las etiquetas en `@noki/domain` o en el registro de tipos. Son textos de un canal; el núcleo no debe conocerlos.

### D3. Llamada nueva: actualizar el último canal sin `CanalCambiado`
`HiloAtencion` agrega `atenderEn(canal)`, que cambia el último canal y no devuelve evento. `CasosTramite.iniciar` lo llama cuando el hilo existe y su canal es distinto, y guarda el hilo junto con el trámite.

`soloLectura` pasa a ser «último `CanalCambiado` de `callcenter` a otro canal **y** último canal del hilo distinto de `callcenter`». En memoria, `ultimoCanal` sale del repositorio de hilos; en Postgres, de `hilo_atencion.ultimo_canal`. Así:

| Momento | Último canal | Último `CanalCambiado` | `soloLectura` |
|---|---|---|---|
| Continuó en WhatsApp | `whatsapp` | `callcenter → whatsapp` | verdadero |
| Llamada nueva | `callcenter` | igual | falso |
| Segunda continuación | `whatsapp` | `callcenter → whatsapp` (nuevo) | verdadero |

Con la regla anterior, el hilo seguiría en `whatsapp` después de la llamada y la segunda continuación no registraría `CanalCambiado` (`retomar` lo omite si el canal no cambia). Con `atenderEn`, la segunda continuación sí se cuenta en `cambiosCanal`.

*Alternativa descartada:* registrar `CanalCambiado{de: 'whatsapp', a: 'callcenter'}` al iniciar. No hay un `MetodoVinculo` que describa una llamada por ANI. Agregarlo cambiaría el vocabulario de `docs/eventos.md` (archivo compartido) y contaría como cambio de canal algo que es un trámite nuevo.

*Alternativa descartada:* calcular `soloLectura` por trámite. Necesita cambiar `FichaHiloSchema` (contrato compartido) y la vista del frente B.

*Riesgo residual:* con la llamada nueva, el trámite viejo que siguió en WhatsApp también deja de estar protegido en la ficha. El call center opera sobre el trámite que devuelve `IniciarTramite`, así que en la demo no se toca. Si el paciente después escribe por WhatsApp sobre el trámite viejo, `nombrePila` y `oferta` de la ficha siguen al trámite abierto más reciente. Eso ya pasaba antes y no cambia aquí.

## Risks / Trade-offs

- **Pruebas que fijan los textos o los inicios de las 07:00Z**: se actualizan dentro de cada grupo de tareas. Si alguna prueba de otro frente los fija, se detiene y se avisa.
- **Rebase con `feat/temporizadores`**: los dos tocan `ports/nucleo.ts`, con conflicto trivial. Se integra el que tenga PASS primero, y el otro hace rebase y repite los controles.
- **WhatsApp real** limita los títulos de fila a 24 caracteres; «jue 26 nov · 09:15» tiene 18. Los nombres de servicio y sede del catálogo no cambian aquí.
