# Design

## Context

`apps/api` solo arranca Fastify con `/health`, `/ready` y el relay del outbox; `packages/adapters/in-http` solo exporta `MAPEO_ERRORES_HTTP` y `out-security` está vacío. Los casos de uso (`CasosTramite`, `ResolvedorContinuidad`) y sus puertos ya tienen adaptadores Postgres y en memoria (`persistencia-eventos`). `@noki/contracts` define el comando (`ComandoRequestSchema`), la respuesta (`RespuestaComandoSchema`), las 9 consultas (`RUTAS_CONSULTAS`), el simulador de WhatsApp (`SolicitudMensajeWaSchema`), los mensajes del bot, los eventos de Socket.IO y el cuerpo de error. `001` ya crea `token_usado (jti uuid, usado_en, expira_en)`. La web (`ClienteReal`) envía `Idempotency-Key` en cada POST, sin `Authorization`, y valida cada respuesta con el contrato. Restricciones: `AGENTS.md` §5–§9, `PLAN.md` §6–§9 y §12, propiedad de archivos del frente A y la decisión D2 de `nucleo-tramite` (apartar solo desde `LISTO_PARA_RESERVAR`).

## Goals / Non-Goals

**Goals:**
- Un canal puede operar un trámite completo por HTTP con el contrato vigente: comandos, consultas, WhatsApp simulado y tiempo real.
- Respuestas idénticas al contrato, validadas en las pruebas con los esquemas de `@noki/contracts`.
- Idempotencia de extremo a extremo: un reintento con la misma clave no duplica eventos ni reservas.
- Tokens firmados de un solo uso reales para el QR y la continuidad.
- Cerrar H-02 a H-05 de `persistencia-eventos` y dejar preparado H-01 de `contratos-consultas`.

**Non-Goals:**
- Cambiar `@noki/contracts` o cualquier archivo compartido (eso es `contratos-flujo-a`).
- Emitir sesiones, OTP, PIN o enlaces mágicos; BullMQ; consumidores de negocio distintos de `tiempo-real`; escalar Socket.IO a varias instancias.

## Decisions

### D1. Rutas en `in-http`, composición en `apps/api`
`in-http` exporta tres plugins de Fastify (`rutasComandos`, `rutasConsultas`, `rutasWhatsApp`) que reciben sus dependencias ya construidas (casos de uso, puertos de lectura, registro de idempotencia, reloj, generador de ids, configuración `{ demo: boolean }`). Valida entradas con los esquemas de `@noki/contracts` y, en pruebas, también las salidas. `apps/api/src/crearApi.ts` pasa a recibir un objeto de dependencias (`DependenciasApi`) y registra CORS, los plugins y el manejador de errores; `main.ts` construye los adaptadores reales y `pruebas` (subruta exportada de `@noki/api`) construye la variante en memoria. Socket.IO vive en `apps/api` (`AGENTS.md` §4). `in-http` agrega `fastify` 5.6.2 como dependencia; no importa otros adaptadores.
- Alternativa: rutas directamente en `apps/api`. Descartada: `AGENTS.md` §4 ubica la validación Zod y las rutas por canal en `in-http`, y así se prueban con `fastify.inject` y memoria sin levantar la app.

### D2. Traducción de comandos
| `tipo` | Caso de uso | Notas |
|---|---|---|
| `IniciarTramite` | `iniciar(tipoTramite, contacto, ctx)` | `payload.contacto` del contrato (`contratos-flujo-a`); sin él, contacto anónimo del canal (D12) |
| `IdentificarPaciente` | `identificarPaciente(id, payload, valorContacto, ctx)` (de `identidad-paciente`) | `valorContacto` = valor del contacto del hilo del trámite; revisión 4 |
| `SolicitarContinuacion` | grupo 7 (D12) | — |
| `SeleccionarServicio` | `seleccionarServicio` | — |
| `SeleccionarSede` | `seleccionarSede` | — |
| `AsignarPaciente` | `asignarPaciente` | — |
| `ReservarHorario` | `reservar(id, inicio, ctx, recursoId)` | — |
| `ConfirmarCita` | `confirmar` | Si `payload.reservaId` no es la reserva del trámite → `ReglaViolada('RESERVA_NO_COINCIDE')` antes de llamar a la agenda |
| `CancelarCita` | `cancelar` | La política exige vínculo + OTP o botón; sin ellos responde 403 |
| `RegistrarLlegada` | `registrarLlegada(token)` | `tramiteId` del cuerpo, si viene, debe coincidir con el del token o responde `TOKEN_INVALIDO` |

Los comandos que requieren `tramiteId` y no lo traen responden 400. `ContextoComando`: `correlationId` = id de la petición (UUID v7, ya configurado como `correlation_id` en pino), `idempotencyKey` = cabecera, `actor` y `canal` del cuerpo (D5), y `nivel`, `vinculado` y `factores` del token de contexto si existe; si no, `nivel 0`, sin vínculo ni factores. La respuesta convierte el `Tramite` en `TramiteVista`, la `siguientePregunta` de dominio en la del contrato y los eventos en `EventoVista` usando los ids reales del event store, leídos por la clave de idempotencia (`LecturasPort.eventosPorClave(clave)`, que cubre las claves `<clave>:n`).

### D3. Idempotencia de comandos
Puerto `RegistroComandos` (memoria y Postgres, tabla `comando_idempotente` de `004_api`): `reservar(clave, huella, ts)` devuelve `NUEVA`, `EN_CURSO` o `{ COMPLETADA, codigo, respuesta }` o `HUELLA_DISTINTA`; `completar(clave, codigo, respuesta)`; `soltar(clave)`. La huella es SHA-256 de la ruta más el JSON canónico del cuerpo validado. Flujo: `NUEVA` → ejecutar → si la respuesta es 2xx, `completar`; si es error, se consulta `LecturasPort.eventosPorClave(clave)`: sin eventos, `soltar` (nada se guardó y el cliente puede reintentar con la misma clave, como hace `useAccion`); con eventos, `completar` con el código y el cuerpo del error, porque el error tuvo efectos (revisión 3: confirmar con el hold vencido guarda `ReservaExpirada` y luego responde 422). `COMPLETADA` → devolver el mismo código y cuerpo sin ejecutar. `HUELLA_DISTINTA` → 400 `VALIDACION`. `EN_CURSO` → 409 `CONFLICTO_VERSION` con mensaje "solicitud en curso"; una reserva `EN_CURSO` con más de 60 s se considera abandonada y se puede tomar de nuevo. En Postgres, `reservar` es un `INSERT … ON CONFLICT DO NOTHING` seguido de lectura. El mismo mecanismo aplica a `POST /api/canales/wa/mensajes`.
- Alternativa: confiar solo en la unicidad de `evento.idempotency_key`. Descartada: no devuelve la misma respuesta, y una confirmación repetida volvería a llamar a la agenda externa antes de fallar al guardar.

### D4. Tokens firmados (`out-security`, `jose`)
`TokensJose` implementa `VerificadorTokens` y un emisor (`EmisorTokens`, puerto nuevo). JWS compacto HS256 con `TOKEN_SECRET` (al arrancar, menos de 32 bytes es error). Claims: `jti` (UUID), `uso` (`CONTINUIDAD` | `LLEGADA` | `CONTEXTO`), `tid` (trámite), `hid` (hilo), `pid?` (paciente), `niv` (nivel), `can` (canal de origen), `met` (`TOKEN_CC` | `TOKEN_WEB`), `iat`, `exp`. `verificar(token, uso)` comprueba firma, `exp` y `uso` antes de consumir; después consume el `jti` con el puerto `RegistroTokensUsados.consumir(jti, expiraEn)` (Postgres: `INSERT INTO token_usado … ON CONFLICT DO NOTHING`, 0 filas → ya usado; memoria: `Map`). Cualquier fallo devuelve `null`, sin distinguir la causa al cliente.
- `tokenQr` (uso `LLEGADA`): `jti` = `reservaId` de la cita y `exp` = inicio + 24 h. HS256 es determinista, así que dos lecturas de la misma cita devuelven el mismo token y no se acumulan tokens válidos. Al registrar la llegada, el `jti` queda usado.
- Riesgo aceptado: el token se consume antes de guardar la llegada; si el guardado falla (por ejemplo `ConflictoVersion`), la recepción vuelve a leer la llegada, que ya está `EN_CLINICA` o puede reintentarse con el estado nuevo. Se documenta en `implementacion.md` si la prueba lo muestra.
- Un JWS es largo para teclearlo: el código de continuación se usa por enlace o QR, no escrito a mano. La forma del enlace la define el frente B.
- Alternativa: código corto opaco guardado en Postgres. Descartada por ahora: `PLAN.md` §8 y `AGENTS.md` §8 piden token firmado, y guardar el secreto en claro amplía la superficie.

### D5. Actores sin sesión (H-01 preparado)
Hasta que exista el cambio de seguridad, `resolverActor(cuerpo, sesion?)`: `paciente` se acepta siempre; `asesor:<id>` y `recepcion:<id>` solo con `DEMO_MODE=true` (si no, 403 `STEP_UP_REQUERIDO` con nivel 1); `sistema` nunca por HTTP (400). Si en el futuro hay sesión de personal, su actor sustituye al del cuerpo y una discrepancia responde 403. El token de contexto (`uso: CONTEXTO`) se verifica pero no se consume (no es de un solo uso) y aporta `pacienteId` y `nivel`; un token inválido responde 403 sin detalles. Este cambio no emite tokens de contexto.
- **Identificación del paciente por HTTP (revisión 5).** Con actor `paciente`, `IdentificarPaciente` en `POST /api/comandos` MUST traer un token de contexto vigente cuyo hilo (`hid`) es el del trámite; sin él, o con otro hilo, responde 403 `STEP_UP_REQUERIDO` antes de ejecutar nada. Motivo: el paso `DESTINATARIO` con `para: 'MI'` busca los pacientes vinculados al teléfono del hilo y devuelve sus nombres enmascarados; si bastara el `tramiteId`, cualquiera que lo conociera vería esos nombres sin poseer el teléfono. En WhatsApp la posesión la da el `waId` del mensaje, así que el motor llama al caso de uso directamente y no necesita token. Los actores internos (solo en demo, D5) no lo necesitan, porque la consola del call center opera en nombre del paciente. Este cambio no emite tokens de contexto, así que hoy la identificación del paciente por HTTP queda reservada a WhatsApp y al personal; la web y la App la usarán cuando el cambio de seguridad emita esos tokens.
  - Alternativa descartada: no exigir nada y aceptar el riesgo como el de las consultas sin autenticación. Las consultas exponen datos ya asociados al `tramiteId`; este paso además revela quiénes están vinculados a un teléfono, que es justo lo que `identidad-paciente` limita.

### D6. Motor de conversación de WhatsApp
Vive en `in-http` (`ConversacionWa`), opera solo con casos de uso y puertos, y guarda su estado por **contacto** (no por número) en el puerto `ConversacionesWa` (tabla `conversacion_wa`): trámite activo, opciones presentadas y horario preferido. Reglas:
1. El contacto se obtiene o crea con canal `whatsapp` y el `waId`; el `waId` y las respuestas del Flow se redactan en los logs.
2. `CONTINUAR <token>` → `retomar` con token. Otro texto → `retomar` sin token (vínculo o teléfono capturado). `RETOMADO` → resumen N1 (servicio, sede, fecha si existe y canal de origen, `PLAN.md` §8) + la pregunta siguiente. `VARIOS` → lista de trámites abiertos con el mismo resumen. `REQUIERE_VERIFICACION` → Flow con folio y fecha de nacimiento (`sensitive`). `BLOQUEADO` → aviso genérico. `SIN_RESULTADO` → inicia un trámite `AGENDAR` y pregunta el servicio.
3. Cada pregunta se arma desde `siguientePregunta(tramite, 'whatsapp')`: `servicio` → lista del catálogo (≤10 filas); `sede` → lista de sedes que ofrecen el servicio; `horario` → lista de horarios de `AgendaExternaPort.disponibilidad` en la zona de la sede (≤10); `requisitos` → botones por requisito pendiente del perfil; `paciente` → Flow con los campos de la pista (`sensitive`); `elegibilidad` → botones. Con trámite reservado → un solo botón "Confirmar cita" y un texto con la hora a la que vence el hold; si no se confirma a tiempo, el siguiente mensaje detecta el hold vencido y vuelve a listar horarios (revisión 3). No se ofrece "Cambiar horario" mientras el hold está vigente: liberarlo antes de tiempo exigiría una transición nueva en la máquina de estados archivada (`tramite-nucleo`), fuera de este cambio.
4. **Horario preferido** (compatibilidad con D2 de `nucleo-tramite` y el orden de WhatsApp de `PLAN.md` §6): si la pregunta es `horario` y el trámite aún no está `LISTO_PARA_RESERVAR`, el horario elegido se guarda en la conversación y el motor pregunta la siguiente casilla pendiente del orden de WhatsApp (requisitos, paciente, elegibilidad). Al llegar a `LISTO_PARA_RESERVAR`, reserva el horario preferido; si ya no está disponible (`HORARIO_NO_DISPONIBLE`), lo avisa y vuelve a listar horarios.
   - Alternativa: cambiar las dependencias del dominio para que `horario` dependa también de `paciente` y `requisitos`. Descartada: modifica un requisito archivado (`siguiente-pregunta`) y el orden de WhatsApp aprobado.
5. **Payloads opacos**: cada opción presentada lleva `op:<uuid>` generado con `GeneradorId`; el estado guarda a qué acción corresponde. Solo valen las opciones del último mensaje de ese contacto; una opción vieja o ajena responde "Esa opción ya no está disponible" y repite la pregunta. Nunca contienen folio, ids de paciente ni datos personales. Los botones de aprobación con token de un solo uso (ofertas, recordatorios) llegan con sus cambios.
6. **Identificación del paciente por pasos (revisión 4).** El motor no tiene lógica propia de identificación: usa el caso de uso `CasosTramite.identificarPaciente` y el estado de pasos que dejó `identidad-paciente` en el trámite (`openspec/specs/identificacion-paciente`). Cuando `siguientePregunta` pide `paciente`, el mensaje sale de `pista.paso`: `DESTINATARIO` → botones "Para mí" / "Para otra persona"; `CONFIRMAR` → lista con las opciones de la pista ("Soy Ana P." … y "No soy ninguno"); `FECHA_NAC` → Flow con `fechaNac`; `CURP` → Flow con `curp` seguido de un mensaje de botones "No la tengo"; `DATOS` → Flow con los campos de la pista. Cada opción va con un payload opaco `op:<uuid>` (regla 5) que el estado de la conversación traduce al payload del paso (`para`, `ref` o `null` del candidato, `curp: null`); un `flowResponse` se traduce campo por id al payload del paso y se valida con `IdentificarPacienteSchema` antes de llamar al caso de uso (una respuesta inválida repite la pregunta sin contar intento). Los errores `CURP_INVALIDA`, `CURP_NO_COINCIDE`, `IDENTIDAD_AMBIGUA`, `IDENTIFICACION_BLOQUEADA` y `PASO_IDENTIFICACION_INVALIDO` se convierten en mensajes genéricos que no revelan si la persona existe, seguidos de la pregunta del paso actual. El bot nunca repite valores capturados en el Flow. Se elimina el caso de uso propio de las revisiones 1–3 (búsqueda exacta por nombre y fecha).
7. Errores de dominio dentro del motor se convierten en mensajes del bot, no en errores HTTP; solo la validación de la solicitud responde 400. Fechas y horas se presentan en la zona de la sede con `date-fns-tz` y `sede.zonaHoraria`, como exige `AGENTS.md` §6 (revisión 2; la revisión 1 proponía `Intl.DateTimeFormat`, que contradecía esa regla).

### D7. Lecturas y KPI
Puerto `LecturasPort` en `application` (tipos propios, sin importar `contracts`), con adaptador Postgres (consultas SQL sobre `tramite`, `evento`, `oferta_sede`, `servicio`, `sede`, `paciente`, `contacto_canal`) y en memoria. `in-http` convierte y valida cada respuesta con el esquema de `RUTAS_CONSULTAS`. Reglas de cada consulta en el spec `consultas-api`. Claves de `metricas.kpis` (números; la ventana es todo el histórico):

| Clave | Cálculo |
|---|---|
| `cambiosCanal` | eventos `CanalCambiado` |
| `cambiosCanalPorHilo` | `cambiosCanal` / hilos con al menos un evento, 2 decimales; 0 sin hilos |
| `tramitesRecuperados` | trámites con al menos un `CanalCambiado` que llegaron a `CONFIRMADA` o posterior |
| `citasConfirmadas` | eventos `CitaConfirmada` |
| `llegadasRegistradas` | eventos `PacienteLlego` |
| `datosRepetidos` | eventos `ServicioSeleccionado`, `SedeSeleccionada` o `PacienteAsignado` que repiten el valor ya elegido en el mismo trámite (meta 0, `PLAN.md` §10.8) |
| `intentosVerificacionFallidos` | eventos `IntentoVerificacionFallido` |

Los KPI de huecos, recordatorios y embudo llegan con sus cambios.

### D8. Tiempo real
Socket.IO 4 sobre el mismo servidor HTTP de Fastify, con CORS para `PUBLIC_BASE_URL`. Un consumidor `ConsumidorStreams` con grupo `tiempo-real` (`AGENTS.md` §7) recibe cada evento y emite, validando con `ESQUEMAS_EVENTOS_SOCKET`: `tramite:actualizado` (vista del trámite) a `tramite:<id>`, `hilo:<id>` y, si hay paciente, `paciente:<id>`; `hilo:linea-tiempo` (línea completa, máximo 200) a `hilo:<id>`; `admin:metricas` (KPI de D7) a `admin`; `sede:fila` a `sede:<id>` ante `PacienteLlego`, con la posición = llegadas `EN_CLINICA` de esa sede en el día de la sede.

**Zona horaria (revisión 2).** Toda conversión a la zona de la sede fuera de SQL (mensajes del bot, día de la sede en el adaptador de lectura en memoria y en `sede:fila`) usa `date-fns-tz` con `sede.zonaHoraria` (`AGENTS.md` §6). En Postgres, el día de la sede se calcula en SQL con `AT TIME ZONE`. `date-fns-tz` y su dependencia `date-fns` se agregan con versión exacta a los paquetes que las usan (`in-http`, `memory`, `apps/api`). `bandeja:mensaje` se emite cuando `BandejaPort` agrega un mensaje (ningún flujo de este cambio lo hace). El manejador es idempotente: emitir dos veces el mismo estado no cambia nada para el cliente. El contrato no define cómo un cliente se une a una sala; mientras `contratos-flujo-a` no esté en `main`, el servidor no une sockets a salas y solo se prueba la emisión a salas desde el servidor (D12).

### D9. Errores
Un solo manejador: `ZodError` → 400 `VALIDACION` (mensaje genérico y, en `datos`, solo las rutas de los campos inválidos, nunca sus valores); errores de dominio → `MAPEO_ERRORES_HTTP` con `datos` (`regla` y datos de `ReglaViolada`, `nivel` y `factores` de `StepUpRequerido`); cualquier otro → 500 con mensaje genérico, registrado con `correlation_id` y sin `stack` en la respuesta. Las reglas `HORARIO_NO_DISPONIBLE`, `AGENDA_NO_DISPONIBLE`, `TOKEN_INVALIDO`, `SERVICIO_NO_DISPONIBLE_EN_SEDE` y `RESERVA_NO_COINCIDE` responden 422. El código del cuerpo para el 500 depende de D12.

### D10. Arranque, logger y relay (H-02, H-03)
`main.ts` crea un logger pino (el de Fastify, con el `redact` actual más `req.body.waId` y `req.body.flowResponse`) y pasa una función `registrar` hija con `correlation_id` a `AgendaExternaSd` y a `CasosTramite.registrarError`; las pruebas comprueban que un reintento y una compensación fallida dejan una línea con `correlation_id` y código, sin datos personales. El relay usa espera creciente mientras falla (250 ms, duplicando hasta 5 s, y vuelve a 250 ms tras un ciclo exitoso) y registra `RELAY_OUTBOX_FALLIDO` solo al pasar de sano a fallido y `RELAY_OUTBOX_RECUPERADO` al volver. El cierre detiene en orden: Socket.IO, consumidor `tiempo-real`, relay, conexiones.

### D11. Agenda externa (H-05)
`AgendaExternaPort.disponibilidad(sedeId, servicioId, fecha)` → lista de inicios ISO, implementado en `out-sd` contra `GET /agenda/disponibilidad` (con el mismo tiempo límite y reintentos) y en memoria. Para no ofrecer horarios ya apartados, el motor descarta los que tengan una reserva activa (`LecturasPort.horariosOcupados(sedeId, fecha)`). `sd-mock`: registrar una reserva cuya cita está cancelada responde 409 `CITA_CANCELADA`; `AgendaExternaSd` reintenta solo errores de red, tiempo límite y 5xx, y ante 4xx lanza `AGENDA_NO_DISPONIBLE` sin reintentar.

### D12. Lado del servidor de `contratos-flujo-a` (en `main` desde `9de129b`)
El grupo 7 de `tasks.md` implementa el lado del servidor del contrato de `contratos-flujo-a`: contacto en `IniciarTramite`; comando `SolicitarContinuacion` (evento `ConsentimientoContactoWA` y token `CONTINUIDAD` de 24 h cuyo `jti` se guarda en `token_emitido` para volver a firmar el código en la ficha mientras siga vigente y sin usar); ficha con nombre y teléfono nulos para hilos sin paciente o sin teléfono, y `soloLectura` cuando el último `CanalCambiado` del hilo salió del call center; `horario` en `TramiteVista`; código `INTERNO` para el 500; mensaje `sala:unirse` validado con `SalaSchema`; y `GET /api/demo/contexto` para `/app`. `horario.expiraEn` solo se envía mientras el trámite está `HORARIO_RESERVADO` (revisión 2 de ese cambio) y `/api/demo/contexto` responde 404 fuera de `DEMO_MODE=true`.
- Revisión 4: `contratos-flujo-a` ya está en `main`, así que no hay reglas provisionales: la ficha devuelve `null` en nombre o teléfono cuando falta el dato, el 500 usa `INTERNO` y la vista del trámite lleva `horario`. Solo queda una regla para `IniciarTramite` sin `contacto` (es opcional en el contrato): se crea un contacto anónimo del canal (valor `anonimo:<uuid nuevo>`), que nunca aparece en la ficha. La ficha toma `nombrePila` del paciente del trámite abierto más reciente del hilo (Impact de `identidad-paciente`). La tabla `token_emitido` va en `004_api`.

### D14. Migración `004_api` y entrada del simulador (revisión 4)
- `identidad-paciente` tomó `003_identidad.sql`, así que la migración de este cambio se renombra a `infra/migraciones/004_api.sql` con el mismo contenido más `token_emitido` (Kysely no aplica un `003` distinto después de otro `003`).
- La web de `simulador-wa` (en `main` desde `42d6a78`) ya envía a `POST /api/canales/wa/mensajes`: texto `CONTINUAR <código>` al abrir el enlace del call center; `flowResponse` con un valor por `id` de cada campo del Flow; `payloadBoton` con el payload de la opción tal cual; y una `Idempotency-Key` UUID por mensaje, la misma cuando reintenta ese mensaje. Pinta cualquier `MensajeBot` sin orden fijo, así que el motor puede enviar varios mensajes por respuesta. Todo cabe en el contrato vigente; no hace falta un cambio compartido.

### D13. Pruebas
- Unitarias en `packages/adapters/in-http/test/` con `fastify.inject` y la composición en memoria: cada comando, cada consulta, cada error, idempotencia y el motor de WhatsApp. Cada respuesta se valida con su esquema del contrato.
- Integración en `tests/integracion/` con la composición real (Postgres `noki_test`, Redis y `sd-mock` iniciado en la prueba): Flujo A con datos sembrados (WhatsApp: retomar con token emitido por la prueba → horario → requisitos → "Para mí" → "Soy Ana P." → fecha de nacimiento → confirmar; luego `citasPaciente`, `registrar llegada` con el `tokenQr` y línea de tiempo), idempotencia contra Postgres, la obligatoria del token de un solo uso y Socket.IO (cliente `socket.io-client` obtenido desde `@noki/api/pruebas`, que la prueba une a una sala con una ayuda de servidor solo de pruebas hasta que exista `sala:unirse`).
- No se cambian `vitest.config.ts` ni el `package.json` raíz.

## Risks / Trade-offs

- [Tamaño] → grupos ordenados por valor; 5 y 6 pueden quedar después sin bloquear la integración.
- [Sin autenticación en consultas y salas] → riesgo ya aceptado en `AGENTS.md` §7; actores internos solo en demo.
- [Token consumido antes de guardar la llegada] → D4; la vista se recupera leyendo el estado.
- [Horario preferido puede ocuparse antes de reservar] → se avisa y se vuelve a listar; no hay doble reserva gracias a `AgendaPostgres`.
- [Orden entre particiones (H-04)] → documentado; ningún consumidor de este cambio depende del orden entre trámites distintos.
- [Código de continuación largo] → se usa por enlace o QR (D4).

## Open Questions

1. **Cambio compartido `contratos-flujo-a`**: ¿se prepara ya, con el contenido de D12, para pedir el visto bueno del frente B? Recomendado: sí, en paralelo al grupo 1; sin él no hay Flujo A real de punta a punta.
2. **`pacienteId` en `/app` (H-02 de `contratos-consultas`)**: (a) consulta solo de demo `GET /api/demo/contexto` que devuelve los ids del último hilo con cita confirmada, o (b) token de contexto entregado por un enlace desde WhatsApp más `GET /api/sesion`. Recomendado: (a) para el MVP, porque (b) es parte del cambio de seguridad (OTP, PIN y enlace mágico, extra 4 de `PLAN.md` §11).
