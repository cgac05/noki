# Design

## Context

Ver `proposal.md` (Why). Estado en `main` `d37b8c2` (incluye `contratos-relleno-huecos`):

- `CasosTramite.cancelar` exige `cancelar` (vínculo más OTP o `BOTON_APROBACION`), cancela el trámite, emite `CitaCancelada { anticipacionHoras }` y libera la reserva local. Desde `/app` siempre falla con `STEP_UP_REQUERIDO`.
- `aceptarOfertaHueco` exige vínculo más token en `PoliticaIdentidad`.
- Tokens: `EmisorTokens`, `VerificadorTokens` con usos `CONTINUIDAD | LLEGADA | CONTEXTO`, y `RegistroTokensUsados` (`token_usado`) para el solo uso.
- `TemporizadoresTramite` y `ProgramadorTemporizadores` solo conocen `HOLD | INASISTENCIA | INACTIVIDAD`, con clave por trámite.
- `apps/api/src/tiempoReal.ts` emite a salas validadas con `SalaSchema` y solo consume en el grupo `tiempo-real`.
- `AgendaPort` (apartar, confirmar, liberar, expirar) con el índice único `reserva_activa_unica`; `AgendaExternaPort` registra y cancela citas en `sd-mock`.
- La semilla crea a Ana (`5210000000001`) y Beto (`5210000000002`) sin citas.

## Goals / Non-Goals

**Goals:** el Flujo C de `PLAN.md` §12 de punta a punta con eventos reales, las reglas de §10.1 y las pruebas obligatorias de huecos de `AGENTS.md` §9.

**Non-Goals:** registrar el interés desde la interfaz, preferencias de contacto editables, reprogramar, OTP y recordatorios.

## Decisions

### D1. La aprobación va al WhatsApp del dueño de la cita
Si `cancelar` falla por falta de `OTP | BOTON_APROBACION` y el actor es `paciente`, `CasosTramite` busca el contacto de WhatsApp con vínculo vigente (nivel 1 o más y uso en 180 días) **del paciente del trámite**, emite dos tokens de uso `APROBACION` que comparten `jti` (acciones `CANCELAR` y `CONSERVAR`, TTL 10 min, ligados al `tramiteId` y al `contactoId`), envía el mensaje y vuelve a lanzar `StepUpRequerido(0, ['BOTON_APROBACION'])`.
- Sin contacto vinculado no se envía nada y la respuesta es la misma, para no revelar si existe.
- La idempotencia de `/api/comandos` guarda la respuesta de error por clave, así que reintentar con la misma clave no reenvía el mensaje.
- Al pulsar "Sí, cancelar", `ConversacionWa` consume el `jti`, comprueba que el `waId` que escribe sea el del `contactoId` del token y llama a `cancelar` con `canal: 'whatsapp'`, `vinculado: true` y el factor `BOTON_APROBACION`. "No, conservarla" solo consume el `jti`.
- Alternativa descartada: enviar la aprobación al número que indique el cliente. Permitiría cancelar citas ajenas con un número propio.

### D2. Hueco y oferta como agregado propio, sin trámite `ADELANTO`
El hueco es un agregado (`Hueco`) con sus ofertas y sus eventos pendientes, persistido con outbox igual que el trámite. El interés referencia el trámite `AGENDAR` de B (`interes_adelanto.tramite_id`).
- Alternativa descartada: un trámite `ADELANTO` con su máquina. Obligaría a agregar estados a `ESTADOS_TRAMITE`, que el contrato (`TramiteVista.estado`) publica, y sería otro cambio compartido.
- Los eventos de hueco (`HuecoLiberado`, `HuecoAsignado`, `HuecoDesierto`) van al hilo y trámite de origen (la cita liberada). Los de oferta (`OfertaEnviada`, `OfertaAceptada`, `OfertaRechazada`, `OfertaExpirada`, `OfertaPerdida`) y `CitaAdelantada` van al hilo y trámite del candidato. Así nadie ve en su línea de tiempo nada del otro paciente.
- Payloads solo con IDs, estados y fechas: `HuecoLiberado { huecoId, sedeId, recursoId, servicioId, inicio, estrategia }`, `OfertaEnviada { huecoId, ofertaId, expiraEn }`, `OfertaAceptada | OfertaRechazada | OfertaExpirada | OfertaPerdida { huecoId, ofertaId }`, `CitaAdelantada { reservaAnteriorId, reservaId, diasAdelantados }`, `HuecoAsignado { huecoId, ofertaId }`, `HuecoDesierto { huecoId }`, `InteresAdelantoRegistrado { interesId, servicioId }`, `InteresAdelantoCancelado { interesId }`.

### D3. `adelantar` en el tipo `AGENDAR`
Se registra la transición `adelantar: { CONFIRMADA: 'CONFIRMADA' }`. `Tramite.adelantar(reservaNueva, folio, contexto)` cambia el horario, incrementa `version` y emite `CitaAdelantada`. Es dato del registro de tipos, no un `if` en el núcleo (`AGENTS.md` §5.9).

### D4. Candidatos y estrategia en el dominio
`candidatoCompatible(hueco, interes, perfil, ahora, historial)` es pura y sigue §10.1. La zona horaria del silencio la resuelve el puerto `CalendarioSede` que ya existe (D12 de `prediccion-riesgo`), y el dominio recibe la hora local ya calculada. `elegirEstrategia(inicio, ahora)` devuelve `SECUENCIAL` con 24 h o más y `OLEADA` con menos. El orden es FIFO por `registradoEn`; nunca por pago.
- Un hueco con `inicio` anterior a la anticipación mínima del servicio, o sin candidatos, pasa a `DESIERTO`.

### D5. Saga de aceptación
1. Consumir el `jti` (si ya se usó: "Esa opción ya no está disponible.").
2. `agenda.apartar` en la sede, recurso e inicio del hueco para el trámite de B. Si el índice único lo rechaza, la oferta queda `PERDIDA`.
3. `agendaExterna.registrarCita` del horario nuevo y `agenda.confirmar`.
4. `Tramite.adelantar` y guardar; la oferta pasa a `ACEPTADA` y el hueco a `ASIGNADO` (en oleada, las demás ofertas a `PERDIDA`, con un mensaje amable).
5. Después, liberar la reserva anterior de B y cancelar su folio externo.
- Si falla el paso 3 o 4: se libera la reserva nueva (y se cancela el folio nuevo si existía), B conserva su cita, la oferta pasa a `EXPIRADA` y el hueco sigue con el siguiente candidato. Si falla el paso 5, se registra `COMPENSACION_AGENDA_FALLIDA` en el log, igual que el riesgo residual aceptado en `temporizadores`.

### D6. Mensajes salientes y reenvío
Puerto `NotificadorWa.enviar(waId, mensajes)` con un tipo propio de aplicación (texto y hasta 3 botones con `titulo` y `payload`). El adaptador real vive en `apps/api/src/tiempoReal.ts`, traduce a `MensajeBot` y emite `wa:mensajes` a `wa:<waId>`; el de memoria acumula los envíos para las pruebas.
- Al unirse a `wa:<waId>`, la API pide al núcleo las ofertas `OFRECIDA` vigentes de ese contacto y las reenvía con tokens nuevos del mismo `jti`. Las aprobaciones no se reenvían: si vencen, Ana vuelve a pulsar "Cancelar".
- Textos (en `textosWa.ts`): oferta "Se liberó un espacio para {servicio} en {sede} el {fecha y hora locales}. ¿Quieres adelantar tu cita?" con "Sí, adelantar" y "No, gracias"; aprobación "¿Confirmas que quieres cancelar tu cita de {servicio} en {sede} del {fecha y hora}?" con "Sí, cancelar" y "No, conservarla"; perdida "Ese espacio ya fue tomado. Te avisaremos si se libera otro."; aceptada "Listo, tu cita quedó el {fecha y hora}."; cancelada "Tu cita quedó cancelada."; conservada "Conservamos tu cita."; token vencido o usado "Esa opción ya no está disponible." (la respuesta normal del endpoint).
- `CancelarCita` en espera responde 403 `STEP_UP_REQUERIDO` con `BOTON_APROBACION`, sin cambiar el trámite; al aprobar, el trámite emite `tramite:actualizado` como cualquier cambio. Así se comunicó al frente B el 2026-11-25

### D7. Límite semanal y silencio con valores fijos
Sin `preferencias_contacto`, el límite es 3 ofertas por paciente en 7 días y el silencio va de 22:00 a 07:00 en la zona de la sede, como constantes del dominio. Cumple `AGENTS.md` §8 sin una tabla que nadie edita todavía.
- Riesgo: una demo de noche no enviaría ofertas. Se mitiga con el reloj de demo y se documenta en el README.

### D8. Temporizador `OFERTA`
`TipoTemporizador` gana `OFERTA`, con clave lógica `OFERTA:<ofertaId>` y física `OFERTA-<ofertaId>`. El campo `tramiteId` de `Temporizador` pasa a `claveId` o se agrega `ofertaId`; la elección queda para la implementación mientras los tres tipos actuales no cambien de comportamiento. Al vencer, la oferta pasa a `EXPIRADA` y el hueco ofrece al siguiente.

### D9. Consumidor `huecos`
Grupo de Redis Streams `huecos` en `main.ts`. Con `CitaCancelada` (de una cita con reserva confirmada e `inicio` futuro) y con `CitaAdelantada` (la reserva anterior) crea el hueco y ofrece. Es idempotente con `evento_procesado` y además con una restricción única `hueco(origen_reserva_id)`.

### D10. Lecturas y KPI
`panelHuecos`: los 50 huecos más recientes por `creado_en`, ofertas en orden de `enviada_en`. KPI: `huecosLiberados` (huecos creados), `huecosRecuperados` (`ASIGNADO`), `horasRecursoRecuperadas` (suma de `duracionMin` del servicio de los asignados, en horas con un decimal) y `diasAdelantadosPromedio` (promedio de `diasAdelantados` de `CitaAdelantada`, 0 si no hay).

### D11. Semilla
`reiniciarDemo` y `sembrar` crean, relativas al reloj:
- Ana: cita `CONFIRMADA` de Ultrasonido abdominal en Tepic el siguiente jueves con al menos 48 h de distancia, 09:15 locales.
- Beto: cita `CONFIRMADA` del mismo servicio y sede 7 días después, con interés `ACTIVO` (Tepic, ventana desde ahora hasta su cita).
- Carla (`5210000000003`, nueva): cita posterior a la de Beto con interés que incluye el horario de Beto, para que el efecto dominó tenga a quién ofrecer.
- Los tres con vínculo de WhatsApp de nivel 1 y uso reciente.

### D12. `docs/eventos.md` fuera de este cambio
El catálogo escrito de los eventos de huecos (con los payloads de D2) lo actualiza un cambio compartido preparado por `LuisMaster119`, junto con `RiesgoEstimado` y el `## Purpose` de `prediccion-riesgo`, acordado el 2026-11-25. Este cambio no toca archivos compartidos. Si ese cambio llega antes a `main`, se rebasa sin conflicto porque no comparten archivos.

### D13. Posesión del número: supuesto del simulador, solo en modo demo
`POST /api/canales/wa/mensajes` y la sala `wa:<waId>` aceptan el `waId` que declara el cliente. En WhatsApp real, Meta garantiza la posesión: solo el teléfono dueño del `wa_id` recibe los mensajes salientes y envía los entrantes, y el webhook llega firmado (`X-Hub-Signature-256`). El simulador **supone** esa garantía; es el mismo supuesto con el que hoy funciona el factor `VINCULO` por `waId` (`PLAN.md` §8: el teléfono es factor de posesión).
- Mitigación dentro del frente A: con `DEMO_MODE` distinto de `true`, el núcleo no envía `wa:mensajes`, no emite tokens `APROBACION` ni `OFERTA` y `ConversacionWa` rechaza esos botones con "Esa opción ya no está disponible."; `CancelarCita` sigue respondiendo `STEP_UP_REQUERIDO` y los huecos se detectan pero quedan `DESIERTO` por falta de canal. Así, fuera de la demo ninguna acción sobre una cita depende de un número sin verificar.
- Fuera de alcance: verificar la firma del webhook real de Meta y acreditar la posesión en el simulador (OTP o sesión), que requieren cambios en el contrato y en la web.
- Alternativa descartada: una prueba de posesión en el simulador ahora. Exige un cambio compartido y otro de pantallas, y retrasa el Flujo C sin mejorar la demo, donde el jurado ya controla el número.
- Hallazgo externo, registrado aparte para el cambio de seguridad: el factor `VINCULO` por `waId` del simulador (retomar en N1) tiene el mismo supuesto desde `api-comandos`.

## Risks / Trade-offs

- [Número declarado sin verificar en el simulador] → D13: supuesto de la demo, deshabilitado fuera de `DEMO_MODE`.
- [Cualquiera con el número puede unirse a `wa:<waId>`] → Riesgo aceptado en `contratos-relleno-huecos`; los tokens se ligan al `contactoId`, son de un solo uso y los mensajes no llevan datos del otro paciente.
- [Fallo al liberar el horario anterior de B] → `COMPENSACION_AGENDA_FALLIDA` en el log; compensación durable en un cambio posterior.
- [Silencio nocturno en la demo] → reloj de demo (D7).
- [Tamaño del cambio] → grupos de tareas independientes con punto de control por grupo.

## Migration Plan

`005_huecos.sql` crea `interes_adelanto`, `hueco` (con `UNIQUE (origen_reserva_id)`) y `oferta_hueco` (con `token_jti`). Reversión: revertir el commit y eliminar las tres tablas en la base de demo.
