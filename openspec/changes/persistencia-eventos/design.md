# Design

## Context

`001_nucleo` ya crea `tramite`, `evento` (con `idempotency_key` única), `outbox` (con `particion` 0–7 y `publicado_en`), `evento_procesado`, `token_usado`, `reserva` con el índice único parcial `reserva_activa_unica` y las tablas de catálogo, pacientes, contactos, vínculos e hilos; `001` no se edita (`docs/trabajo-paralelo.md`). La tabla `tramite` no tiene columnas para las casillas (precio, requisitos, horario, elegibilidad, perfil), `contacto_canal` no guarda su hilo y `vinculo` no guarda el nivel que exige el puerto `Vinculo`. `nucleo-tramite` dejó los puertos de `packages/application/src/ports/nucleo.ts` con adaptadores en memoria; `out-postgres` solo migra y comprueba conexión, `out-redis` solo comprueba conexión, `in-events` y `out-sd` están vacíos y `sd-mock` solo expone `/health`. `pnpm test:integracion` ya crea la base aislada `noki_test` y corre el proyecto Vitest `integracion`. Restricciones: `AGENTS.md` §5, §7 y §9, `PLAN.md` §5–§8 y la propiedad de archivos del frente A.

## Goals / Non-Goals

**Goals:**
- Los puertos del núcleo con implementación Postgres intercambiable por la de memoria, sin cambiar la semántica de versión y eventos.
- Ningún evento guardado se pierde ni se publica sin su cambio de estado (outbox); los consumidores toleran duplicados y reinicios.
- Exactamente un ganador por horario bajo concurrencia, demostrado contra Postgres.
- Resolver H-02 a H-05 de la revisión de `nucleo-tramite`.
- Cero cambios en archivos compartidos.

**Non-Goals:**
- BullMQ y temporizadores (D10), consumidores de negocio, HTTP de comandos y consultas, Socket.IO, criptografía de tokens, OTP y PIN, catálogo y resultados en `sd-mock`, `/admin`.
- Conectar los casos de uso a Postgres en `apps/api` (lo hace `api-comandos`; aquí solo arranca el relay).

## Decisions

### D1. Fila del trámite con instantánea; `evento` como registro de solo inserción
`002` agrega `tramite.datos jsonb NOT NULL DEFAULT '{}'` y `tramite.canal_origen`. El dominio expone `tramite.instantanea()` (datos serializables, sin métodos) y `Tramite.rehidratar(instantanea, registro)`; el repositorio guarda además en columnas lo que se consulta (`estado` calculado, `servicio_id`, `sede_id`, `paciente_id`, `folio_externo`, `version`, `ultimo_canal`, `ultima_actividad`). El estado se lee de la instantánea, no de los eventos.
- Alternativa: reconstruir el trámite reproduciendo eventos. Descartada: los payloads no llevan el perfil ni la cotización completa, y cambiarlos tocaría `docs/eventos.md` (compartido). La tabla `evento` sigue siendo la fuente de la línea de tiempo, del embudo y de la publicación.

### D2. Guardado transaccional con concurrencia optimista
`TramiteRepoPostgres.guardar` abre una transacción: si `versionCargada` es 0 inserta la fila (un `id` existente es conflicto); si no, `UPDATE … WHERE id = $1 AND version = $versionCargada`. Cero filas afectadas → `ConflictoVersion(esperada, actual)` con la versión leída. En la misma transacción inserta cada evento pendiente en `evento` y su fila de `outbox`; cualquier error (incluida una `idempotency_key` repetida) revierte todo. Solo después del `COMMIT` llama a `marcarGuardado()`.
- **Claves de idempotencia como texto** (revisión 3). `nucleo-tramite` (D5, spec `tramite-nucleo` "Versión y eventos pendientes") genera `<idempotencyKey>:n` cuando una operación emite varios eventos, pero `001` declara `evento.idempotency_key` y `evento_procesado.idempotency_key` como `uuid`, así que guardar la sede que completa la cotización fallaría. `002` las convierte con `ALTER COLUMN … TYPE text USING idempotency_key::text`; Postgres conserva la restricción `UNIQUE` de `evento` y la llave primaria `(consumidor, idempotency_key)` de `evento_procesado` y reconstruye sus índices. Se agrega `CHECK (idempotency_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:[1-9][0-9]*)?$')` en ambas tablas para no perder la validación que daba el tipo `uuid`. `001` no se edita.
- Alternativa descartada: derivar en el dominio un UUID v5 determinista por evento. Exige implementar SHA-1 en un dominio sin dependencias y cambiar la semántica de claves aprobada en `nucleo-tramite`, que es un requisito archivado. Tampoco sirve dejar las columnas `uuid` y quitar el sufijo, porque las claves de una misma operación chocarían.

### D3. Partición
`particion = fnv1a32(pacienteId ?? hiloId) % 8`, calculada en `out-postgres` al insertar el outbox con el `pacienteId` del trámite en ese momento. Se expone como función pura probada con valores fijos para que consumidores y pruebas la reutilicen. Riesgo conocido: los eventos previos a asignar paciente quedan en la partición del hilo y los siguientes en la del paciente; el orden entre ambas no está garantizado para consumidores paralelos (el relay sí publica en orden de guardado).

### D4. Relay del outbox como servicio de aplicación
`RelayOutbox` (en `application`) depende de dos puertos: `OutboxPort` y `PublicadorEventos` (`publicar(particion, evento)`, implementado en `out-redis` con `XADD eventos:{n} * idempotencyKey … tipo … evento <json>`).
- **Exclusión por partición hasta registrar el resultado** (revisión 2). `OutboxPort.tomarParticion(particion)` devuelve `null` si otro relay la tiene, o un arrendamiento con `pendientes(limite)`, `marcarPublicado(id, ts)`, `marcarFallo(id, mensaje)` y `liberar()`. En Postgres el arrendamiento reserva una conexión propia del pool y toma `pg_try_advisory_lock(<clave fija del outbox>, particion)` a nivel de sesión; la conexión y el bloqueo se conservan mientras el relay lee, publica en Redis y marca cada fila, y `liberar()` hace `pg_advisory_unlock` y devuelve la conexión (siempre en un `finally`). Si el proceso muere, Postgres suelta el bloqueo al cerrarse la sesión y las filas siguen pendientes. Las lecturas y marcas son sentencias autocommit sobre esa conexión, sin `FOR UPDATE`. En memoria, un `Set` de particiones tomadas.
- Alternativa descartada: `FOR UPDATE SKIP LOCKED` en una transacción corta, porque los bloqueos se liberan antes de publicar y otro relay puede tomar las mismas filas. También se descartó una columna de arrendamiento con vencimiento: exige migración y elegir un plazo que no corte publicaciones lentas.
- `publicarPendientes()` recorre las particiones 0–7. Por cada una que logra tomar, publica sus filas en orden (`creado_en, id`) y se detiene en el primer fallo de esa partición para no adelantar eventos posteriores; después la libera. Las particiones tomadas por otro relay se omiten en ese ciclo. El arranque periódico (intervalo corto) y la parada están en `apps/api/src/main.ts`. Entrega al menos una vez: si el proceso cae entre `XADD` y `marcarPublicado`, el evento se vuelve a publicar y lo descartan los consumidores (D5). `ultimo_error` guarda un mensaje genérico, nunca el payload.
- Alternativa: `LISTEN/NOTIFY` o publicar directo tras el `COMMIT`. Descartadas: más piezas o riesgo de perder el evento.

### D5. Consumidor base en `in-events`
`ConsumidorStreams` recibe el nombre del grupo, un manejador y el puerto `RegistroProcesados` (`yaProcesado(consumidor, key)`, `marcar(consumidor, key)`; Postgres sobre `evento_procesado`, memoria con un `Set`). Al iniciar crea el grupo en las 8 particiones si no existe (`XGROUP CREATE … MKSTREAM`), primero reprocesa sus pendientes (`XREADGROUP … 0`) y después lee nuevos (`>`). Por mensaje: si ya fue procesado, `XACK` y sigue; si no, ejecuta el manejador, marca y hace `XACK`. Si la entrega número 3 falla (contador de `XPENDING`), copia `{grupo, idempotencyKey, tipo, motivo genérico}` a `eventos:fallidos` y hace `XACK`. Los grupos de `AGENTS.md` §7 se crean cuando exista su consumidor; aquí solo se prueba con un manejador de prueba. `in-events` agrega `ioredis` a su `package.json`; no importa `out-redis`.

### D6. Reservas en Postgres (H-05)
`AgendaPostgres.apartar` en una transacción: marca `EXPIRADA` cualquier `APARTADA` del mismo `(sede, recurso, inicio)` con `expira_en <= ts`, elige el recurso (el `recursoId` de la solicitud si viene; si no, el primer recurso de la sede compatible con el servicio y libre a esa hora, por `id`) e inserta `APARTADA` con `expira_en = ts + ttlReservaMin`. La violación de `reserva_activa_unica` o la falta de recurso libre se traducen a `ReglaViolada('HORARIO_NO_DISPONIBLE')`; nunca a `ConflictoVersion`, que queda solo para versiones del trámite. `SolicitudReserva` gana `recursoId?: RecursoId` (identificador nuevo del dominio), coherente con el comando `ReservarHorario { recursoId, inicio }` del contrato. `AgendaMemoria` adopta la misma regla.

### D7. Folio de la agenda externa y confirmación como saga (H-04)
Puerto nuevo `AgendaExternaPort` (`registrarCita({ reservaId, sedeId, servicioId, inicio })` → folio de 8–9 dígitos, idempotente por `reservaId`; `cancelarCita(folio)`), implementado en `out-sd` contra `sd-mock` y en memoria. `AgendaPort.confirmar(reservaId, folio, ts)` marca `CONFIRMADA` con el folio; repetirlo con el mismo folio no cambia nada; con el hold vencido lanza `HORARIO_NO_DISPONIBLE`. El caso de uso confirmar cita:
1. exige `HORARIO_RESERVADO`; si `horario.expiraEn <= ahora`, aplica expirar hold (`ReservaExpirada`), guarda, libera la reserva y lanza `HORARIO_NO_DISPONIBLE`;
2. `registrarCita` → folio;
3. `agenda.confirmar`; si falla por hold vencido, `cancelarCita(folio)` y relanza;
4. `tramite.confirmar(folio)` y guardar; ante `ConflictoVersion`, recarga: si el trámite ya está `CONFIRMADA` con ese mismo folio (dos confirmaciones paralelas), relanza sin compensar; si no, `cancelarCita(folio)`, `agenda.liberar(reservaId)` y relanza.
Los errores de la compensación se registran con el logger sin datos personales y no ocultan el error original.
- Alternativa: generar el folio en Postgres con una secuencia. Descartada: el folio es de Salud Digna (`folio_externo`) y la demo de resiliencia (`PLAN.md` §12, `sd-mock?fallo=50`) necesita una llamada externa con reintentos y compensación visibles.

### D8. `sd-mock` y cliente `out-sd`
`sd-mock` agrega `GET /agenda/disponibilidad?sedeId&servicioId&fecha` (horarios cada 30 min de 07:00 a 14:00 en UTC simple para la demo), `POST /agenda/citas` (idempotente por `reservaId`, folio desde 10000000), `DELETE /agenda/citas/:folio` y `PUT /simulacion { latenciaMs, falloPorcentaje, fallarSiguientes? }` para configurar la simulación global; cada petición también acepta `?latencia=ms&fallo=%`. Un fallo simulado responde 503. Valida sus entradas con Zod (`AGENTS.md` §5.10): `apps/sd-mock/package.json` agrega `zod` 4.1.13, la misma versión fijada en `contracts`, sin importar `contracts`. `AgendaExternaSd` usa `fetch` con tiempo límite de 1 s y hasta 3 intentos con espera de 100 y 200 ms; agotados, lanza `ReglaViolada('AGENDA_NO_DISPONIBLE')`. Registra cada reintento con `correlation_id` y sin datos personales.

### D9. Intentos y continuidad (H-02, H-03)
`RegistroIntentos.fallar(contactoId, ts)` solo cuenta y devuelve `{ intentos, bloqueadoHasta? }`; Postgres lo implementa con una tabla `intento_verificacion(contacto_id, intentos, bloqueado_hasta)` de `002` y un `INSERT … ON CONFLICT DO UPDATE` atómico. El resolvedor construye `IntentoVerificacionFallido` con la envoltura del contexto (`tramiteId: null`, `hiloId` del contacto, `version: 0` para eventos sin trámite) y lo guarda con el puerto nuevo `EventosSinTramite.agregar(eventos)`, que en Postgres inserta `evento` y `outbox` en una transacción. El contador se escribe antes que el evento: si el proceso cae entre ambos, se pierde el evento pero no el bloqueo.
Prioridad 4: todo folio de 8–9 dígitos sin fecha de nacimiento responde `REQUIERE_VERIFICACION { metodo: 'FOLIO_FECHA_NAC' }` sin consultar si existe y sin contar intento; con fecha, un folio inexistente, cerrado, de otro paciente o con fecha distinta cuenta un intento y responde `SIN_RESULTADO`.

### D10. Sin BullMQ en este cambio
`docs/trabajo-paralelo.md` no incluye BullMQ en la fila de `persistencia-eventos` aunque `PLAN.md` §11 lo menciona en las horas 6–10. Los temporizadores del Flujo A (expiración del hold) se cubren de forma perezosa en D6 y D7; los demás (`EXPIRADO`, `NO_ASISTIO`, recordatorios) llegan con §10.2 y el "adelantar reloj" de `PLAN.md` §14.13. Se propone moverlos a un cambio `temporizadores` posterior; la decisión es del responsable (Open Questions).

### D11. Pruebas
Las pruebas existentes de `tests/unit/nucleo/` afectadas por los contratos que cambian (D6, D7, D9) se adaptan conservando sus comprobaciones (revisión 2). Unitarias nuevas en `tests/unit/persistencia/` con adaptadores en memoria (relay, consumidor con un cliente Redis simulado en memoria si hace falta, saga, resolvedor, partición, agenda en memoria). Integración en `tests/integracion/` contra `noki_test` y Redis: repositorios, outbox atómico, 50 reservas concurrentes (prueba obligatoria con nombre reconocible), relay y particiones, consumidor reiniciado sin pérdidas ni duplicados, `eventos:fallidos`, `sd-mock` con fallos y reintentos, y la saga con compensación. Las pruebas de integración usan streams con prefijo propio o limpian `eventos:*` en `noki_test` y nunca tocan la base `noki` de la demo.

## Risks / Trade-offs

- [Holds vencidos sin temporizador] → el trámite puede verse `HORARIO_RESERVADO` hasta que se intenta confirmar; aceptable para el Flujo A, donde el paciente confirma enseguida. D10.
- [Entrega al menos una vez] → duplicados posibles en Redis; los consumidores los descartan por `idempotency_key` (D5).
- [Partición que cambia al asignar paciente] → orden entre particiones no garantizado para consumidores paralelos (D3).
- [Contador e evento de intentos no atómicos] → se prioriza el bloqueo (D9).
- [Instantánea JSON del trámite] → un cambio futuro de `DatosTramite` necesita compatibilidad al rehidratar; se prueba la ida y vuelta.
- [Tamaño del cambio] → grupos ordenados: 1–3 son lo mínimo para `api-comandos`; 4–5 pueden ir detrás si el tiempo aprieta, con decisión del responsable.

## Migration Plan

`002_persistencia.sql` solo agrega columnas, una tabla y, si se usa, una secuencia; es compatible con los datos sembrados. `pnpm demo:reset` y `pnpm db:migrate` la aplican. Rama `feat/persistencia-eventos`; se integra en `main` con dictamen `PASS` y los cuatro controles en verde tras rebase (`docs/trabajo-paralelo.md`). Revertir: no hay `down`; en la demo se recrea la base con `pnpm demo:reset`.

## Open Questions

_Ninguna._ Resueltas por el responsable al autorizar la revisión 1 (2026-11-24, ver `handoff.md`): BullMQ pasa a un cambio `temporizadores` posterior (D10) y `docs/eventos.md` se corrige en un cambio compartido aparte con el frente B, después de integrar este.
