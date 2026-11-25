# Design

## Context

En `main` (`d7f7590`) el núcleo guarda estado y eventos con outbox, el relay publica en `eventos:{0..7}` y `apps/api` corre un consumidor del grupo `tiempo-real` (`ConsumidorStreams` de `in-events`, con `RegistroProcesados`). El dominio tiene `expirarHold` (exige `ts >= expiraEn`), `marcarInasistencia` y `expirarPorInactividad`, con sus transiciones en la definición de `AGENDAR`. `CasosTramite.confirmar` expira el hold si llega tarde, y `AgendaPostgres.apartar` marca `EXPIRADA` un hold vencido del mismo horario antes de insertar. El `Reloj` de la API es `RelojSistema` (`new Date()`); en pruebas se usa `RelojFalso` con `adelantar(ms)`. La semilla usa `ttlReservaMin: 10` y `toleranciaMin: 15`. No hay BullMQ ni endpoint de reloj.

## Goals / Non-Goals

**Goals:**
- Disparar en el momento correcto las tres transiciones temporales que ya existen, sin `UPDATE` directos y con eventos por outbox.
- Programación fiable: no perder trabajos si la API se cae entre guardar y programar, y no duplicarlos si un evento se reprocesa.
- Poder acelerar el tiempo en la demo y ver la expiración en segundos.
- Dejar un puerto reutilizable por recordatorios y ofertas de huecos.

**Non-Goals:**
- Notificaciones al paciente, recordatorios, ofertas de huecos, `TramiteSuspendido` (ver proposal, Fuera de alcance).
- Cambios de contrato con el frente B.

## Decisions

### D1. Puerto `ProgramadorTemporizadores` en `application`

```ts
type TipoTemporizador = 'HOLD' | 'INASISTENCIA' | 'INACTIVIDAD';
interface Temporizador { tipo: TipoTemporizador; tramiteId: TramiteId; venceEn: string; version: number; reservaId?: ReservaId }
interface ProgramadorTemporizadores {
  programar(t: Temporizador, ahora: string): Promise<void>;   // reemplaza el trabajo `${tipo}:${tramiteId}` si cambió
  cancelar(tipo: TipoTemporizador, tramiteId: TramiteId): Promise<void>;
  adelantarVencidos(ahora: string): Promise<number>;          // ejecuta ya los trabajos con venceEn <= ahora
}
```

`ahora` llega del `Reloj` del llamador: el adaptador calcula `delay = max(0, venceEn - ahora)` y nunca usa `Date.now()` para decidir el vencimiento. `version` es la del trámite cuando se programó; el worker la usa en `INACTIVIDAD` (D4). La lista de tipos es una unión cerrada; `recordatorios` la ampliará en su cambio.

Adaptadores:
- **BullMQ** (`ProgramadorBullMQ` en `out-redis`): cola `temporizadores`. El identificador lógico de cada trabajo es `${tipo}:${tramiteId}` (`AGENTS.md` §7) y es el que usan el puerto, los logs y las pruebas. BullMQ rechaza un `jobId` propio con `:` (`Custom Id cannot contain :`), así que el adaptador lo guarda con `jobId` `${tipo}-${tramiteId}` y hace la conversión en un solo lugar (revisión 2). Los tipos no contienen `-`, así que separar en el primer `-` recupera el tipo y el UUID. `programar` lee el trabajo existente: si tiene los mismos datos, no hace nada; si no, lo elimina y agrega el nuevo (BullMQ ignora un `add` con `jobId` repetido). Si el trabajo está activo y no se puede eliminar, `programar` espera a que termine (hasta 5 s) y después lo reemplaza; si no termina, lanza un error para que el consumidor no marque el evento y lo reprocese. Los trabajos terminados no deben bloquear un id nuevo (`removeOnComplete: true`, `removeOnFail` con un límite de historial). `cancelar` de un trabajo activo no hace nada: su ejecución vuelve a comprobar el estado (D4). `adelantarVencidos` recorre `getDelayed()` y llama `promote()` a los que tengan `data.venceEn <= ahora`.
- **Memoria** (`ProgramadorMemoria` en `adapters/memory`): mapa por id; expone a las pruebas `vencidos(ahora)` para ejecutarlos con el mismo manejador del worker.

Alternativa descartada: un barrido periódico en Postgres sin BullMQ. Es más simple, pero contradice `PLAN.md` §3 y §6 y no sirve para los recordatorios, que necesitan trabajos individuales cancelables.

### D2. Worker en `in-events`, composición en `apps/api`

`WorkerTemporizadores` (`in-events`) envuelve un `Worker` de BullMQ sobre la cola `temporizadores`, valida `job.data` con Zod (entrada externa, `AGENTS.md` §5.10) y llama a un manejador inyectado. `apps/api/src/main.ts` crea la cola, el worker y el consumidor del grupo `temporizadores` y los cierra en orden en `cerrar()` (primero el consumidor y el worker, después la cola y Redis). El nombre de la cola se pasa desde `main.ts` a ambos adaptadores, que no se importan entre sí (`AGENTS.md` §5.3). Conexiones BullMQ con `maxRetriesPerRequest: null`, creadas por los propios adaptadores a partir de `REDIS_URL` (BullMQ trae su propio ioredis; no compartir la instancia de `ConsumidorStreams`).

Concurrencia del worker: 1 basta para la demo y evita carreras entre trabajos del mismo trámite.

### D3. Programar reconciliando con el estado actual

El consumidor del grupo `temporizadores` usa `ConsumidorStreams` y `RegistroProcesados` (consumidor `temporizadores`), como `tiempo-real`. Por cada evento con `tramiteId`, llama `TemporizadoresTramite.reconciliar(tramiteId)`, que lee el trámite del repositorio y deja exactamente estos trabajos:

| Estado actual | `HOLD` | `INASISTENCIA` | `INACTIVIDAD` |
|---|---|---|---|
| `BORRADOR`, `COTIZADO`, `LISTO_PARA_RESERVAR` | cancelar | cancelar | `ultimaActividad + inactividadHoras` |
| `HORARIO_RESERVADO` | `horario.expiraEn`, con `reservaId` | cancelar | `ultimaActividad + inactividadHoras` |
| `CONFIRMADA` | cancelar | `horario.inicio + perfil.toleranciaMin` | cancelar |
| `EN_CLINICA`, `ATENDIDA`, `CANCELADA`, `NO_ASISTIO`, `EXPIRADO`, o trámite inexistente | cancelar | cancelar | cancelar |

Como lee el estado actual, reprocesar un evento viejo o recibirlo dos veces produce los mismos trabajos. Si el consumidor estuvo caído, al volver procesa los pendientes del stream y programa lo que falte; los trabajos ya vencidos se programan con `delay` 0.

Alternativa descartada: programar dentro de `CasosTramite` después de guardar. Si la API se cae entre el `COMMIT` y la llamada a Redis, el trabajo se pierde; el outbox ya da entrega al menos una vez.

### D4. Ejecución de cada temporizador (`TemporizadoresTramite.ejecutar`)

Cada ejecución carga el trámite y vuelve a comprobar todo con el `Reloj`; el trabajo es solo un aviso. Resultado: `APLICADO`, `SIN_EFECTO` o `REPROGRAMAR(venceEn)`.

- **`HOLD`**: si el trámite está `HORARIO_RESERVADO` con el mismo `reservaId` y `ahora >= expiraEn`: `tramite.expirarHold(contexto)`, guardar y después `agenda.expirar(reservaId)` con la compensación registrada de `CasosTramite` si falla (el vencimiento perezoso de `apartar` cubre el caso). Si aún no vence: `REPROGRAMAR(expiraEn)`. En cualquier otro caso: `SIN_EFECTO`.
- **`INASISTENCIA`**: si está `CONFIRMADA` y `ahora >= inicio + toleranciaMin`: `tramite.marcarInasistencia(contexto)` y guardar. La reserva queda `CONFIRMADA` (histórico; el horario ya pasó). Si aún no vence: `REPROGRAMAR`. Si no está `CONFIRMADA`: `SIN_EFECTO`.
- **`INACTIVIDAD`**: si el estado es previo a `CONFIRMADA`, `tramite.version === t.version` y `ahora >= ultimaActividad + inactividadHoras`: `tramite.expirarPorInactividad(contexto)`, guardar y, si tenía hold, `agenda.expirar(reservaId)`. Si hubo actividad (versión distinta): `SIN_EFECTO` (la reconciliación de ese evento ya programó el nuevo plazo). Si aún no vence: `REPROGRAMAR`.

Contexto del sistema: `actor: 'sistema'`, `nivelAuth: 0`, `canal: tramite.ultimoCanal` (evita un `CanalCambiado` falso), `correlationId` e `idempotencyKey` nuevos del `GeneradorId` con el formato que ya exige el event store. No pasa por `PoliticaIdentidad`: no es una petición de un canal.

Concurrencia: si un comando del paciente guarda a la vez, el guardado del temporizador falla con `ConflictoVersion`; el worker lo trata como fallo reintentable y en el reintento las guardas deciden (por ejemplo, ya está `CONFIRMADA` → `SIN_EFECTO`). Si `confirmar` pierde ante el temporizador, ya responde con su error y compensación actuales.

Plazo de inactividad: `DefinicionTipoTramite.inactividadHoras` (obligatorio), 24 en `AGENDAR`. Se registra con el tipo (`AGENTS.md` §5.9), no como variable de entorno, para no tocar `.env.example` ni `AGENTS.md` §11.

### D5. Fallos y reintentos

`attempts: 3` con espera exponencial (1 s base). `NoEncontrado` del trámite (por ejemplo, tras `pnpm demo:reset`) es `SIN_EFECTO`, no un fallo. `REPROGRAMAR` mueve el mismo trabajo a diferido (`job.moveToDelayed` y `DelayedError` de BullMQ) hasta el instante real equivalente a `venceEn` según el `Reloj`; no consume intentos. Al agotar los intentos, el worker registra con el logger `{ codigo: 'TEMPORIZADOR_FALLIDO', tipo, tramiteId }`, sin datos personales ni `stack`, y la siguiente reconciliación del trámite vuelve a programarlo. No se crea una cola de fallidos aparte en este cambio.

### D6. Reloj ajustable de demo

- `application` define `RelojAjustable extends Reloj { adelantar(ms: number): void }` y el caso de uso `RelojDemo.adelantar(minutos)`, que adelanta el reloj y llama `programador.adelantarVencidos(reloj.ahora())`.
- `apps/api/src/sistema/RelojAjustable.ts` sustituye a `RelojSistema`: `ahora() = new Date(Date.now() + desfaseMs)`. Una sola instancia compartida por casos de uso, tokens, relay, tiempo real y temporizadores. Fuera de `DEMO_MODE=true` el desfase es siempre 0.
- `in-http` agrega `POST /api/demo/reloj` con cuerpo `{ adelantarMinutos: entero 1..10080 }` validado con Zod local (no en `@noki/contracts`), respuesta `{ ahora: string }`. Responde 404 fuera de `DEMO_MODE=true`, igual que `/api/demo/bandeja`. No exige `Idempotency-Key`: no es un comando de trámite y repetirlo adelanta otra vez.
- El desfase vive en memoria: reiniciar la API lo vuelve a 0. Los trabajos programados con el tiempo adelantado se ejecutan entonces antes de que el reloj llegue; las guardas de D4 devuelven `REPROGRAMAR` y no aplican nada antes de tiempo. `pnpm demo:reset` no toca Redis; los trabajos de trámites borrados terminan en `SIN_EFECTO`.
- Adelantar el reloj también vence tokens y cotizaciones. Es lo esperado en la demo.

### D7. Cambios mínimos de dominio y agenda

- `Tramite.ultimaActividad`: `ts` de la última operación que anotó eventos (se fija en `anotar`) y parte de la instantánea. Una operación sin eventos no es actividad (revisión 3): no cambia la versión ni este valor, no llega al stream y por eso no reprograma `INACTIVIDAD`. Es coherente con "Una versión por operación" de `tramite-nucleo`: lo que no deja rastro en el event store no cuenta para el embudo ni para el plazo. Al rehidratar instantáneas guardadas antes de este cambio, el repositorio Postgres la toma de la columna `tramite.ultima_actividad`; el de memoria, del último evento.
- `AgendaPort.expirar(reservaId)`: `UPDATE reserva SET estado = 'EXPIRADA' WHERE id = … AND estado = 'APARTADA'`; idempotente. `liberar` sigue marcando `CANCELADA` para las cancelaciones.

### D8. Pruebas

- Unitarias (memoria, `RelojFalso`, `ProgramadorMemoria`): tabla de D3 completa; cada rama de D4 (aplicado, sin efecto, reprogramar); carrera confirmar contra `HOLD` con `ConflictoVersion`; `RelojDemo` adelanta y ejecuta solo los vencidos; contexto `sistema` en los eventos generados.
- Integración (Postgres y Redis reales): flujo de punta a punta con la API compuesta — apartar, adelantar el reloj 11 min por `POST /api/demo/reloj` y observar en menos de 5 s el trámite en `LISTO_PARA_RESERVAR`, el evento `ReservaExpirada` en el event store y la reserva `EXPIRADA`; reinicio del worker con un trabajo vencido pendiente; evento duplicado en el grupo `temporizadores` deja un solo trabajo; el endpoint responde 404 sin `DEMO_MODE`.
- Las pruebas obligatorias de `AGENTS.md` §9 siguen en verde sin `skip`.

## Risks / Trade-offs

- **Desfase en memoria** → un reinicio de la API en medio de la demo "regresa" el tiempo. Mitigación: las guardas evitan efectos prematuros; el guion de la demo no reinicia la API.
- **Un solo proceso** → si en el futuro hay varias instancias de la API, cada una tendría su desfase. Fuera del alcance del hackatón; el desfase podría ir a Redis en un cambio posterior.
- **Reconciliar en cada evento** lee el trámite una vez por evento. Volumen de demo pequeño; aceptable.
- **El grupo `temporizadores` no figura en la lista de grupos de `AGENTS.md` §7**, que es un archivo compartido. La lista es descriptiva y no prohíbe grupos nuevos; se propone añadirlo en el próximo cambio compartido de documentación, junto con la corrección pendiente de `docs/eventos.md`.
- **Cita externa huérfana si falla la compensación** (revisión 4) → si el hold vence mientras `confirmar` espera el folio y después `sd-mock` rechaza la cancelación, queda una cita externa activa. No lo introduce este cambio: la misma carrera ya existía porque `AgendaPort.confirmar` exige `expira_en > ts`; el temporizador solo puede adelantar el momento en que se nota. Se acepta como riesgo residual con la regla de `reservas-horario` (intentar cancelar con los reintentos del cliente y registrar `COMPENSACION_AGENDA_FALLIDA`). Una compensación durable (trabajo `COMPENSAR` en BullMQ que reintenta hasta lograrlo) queda para un cambio posterior.
- **`jobId` físico distinto del de `AGENTS.md` §7** (revisión 2) → `AGENTS.md` es compartido y no se cambia aquí; el identificador lógico sí sigue §7. Se propone anotar el formato físico de BullMQ en el mismo cambio compartido de documentación.
- **BullMQ y `ioredis` 5.8.2**: BullMQ trae su propia versión de ioredis; por eso cada adaptador crea su conexión desde la URL (D2).

## Open Questions

Para el responsable del frente A (recomendación entre paréntesis):

1. Alcance: los tres temporizadores (recomendado) o solo `HOLD`.
2. Plazo de inactividad de `AGENDAR`: 24 h (recomendado; `PLAN.md` §6 lo deja como "Y h").
3. Botón "adelantar reloj" en `/admin`: dejarlo para un cambio compartido posterior con el frente B que agregue el esquema a `@noki/contracts` (recomendado, así este cambio no necesita a Luis), o meter el contrato ahora y pedir el visto bueno del frente B.
