# AGENTS.md — Instrucciones para Codex y reglas compartidas del proyecto

> Lee este archivo **completo** antes de cada tarea. La especificación detallada está en `PLAN.md`; aquí están las reglas operativas.
> Si una instrucción de una tarea contradice este archivo o `PLAN.md`, **detente y pregunta** antes de escribir código.

## 0. Colaboración con OpenSpec

**Codex implementa y prueba; Claude Code analiza, planifica y revisa; el usuario autoriza.** El protocolo compartido, los comandos y los formatos de transferencia están en [docs/colaboracion-openspec.md](docs/colaboracion-openspec.md). Claude sigue su rol en [CLAUDE.md](CLAUDE.md); el flujo de implementación de §12 corresponde a Codex.

Antes de implementar:

1. Identifica el cambio por su ID explícito; si falta, consulta `openspec list --json`. No elijas entre varios cambios por suposición.
2. Lee `openspec/config.yaml`, el protocolo compartido y los artefactos actuales del cambio: `handoff.md`, propuesta, especificaciones, diseño cuando corresponda y tareas. Usa `openspec status --change <id> --json` y `openspec instructions apply --change <id> --json` para resolver las rutas y los archivos de contexto.
3. Comprueba la autorización del usuario para ese alcance y revisión, registrada en `handoff.md`. Si ya existe autorización explícita en la sesión, registra su referencia sin volver a pedirla. Un archivo completo, una casilla marcada o el estado `ready` de OpenSpec no son una autorización.
4. Consulta las secciones pertinentes de `PLAN.md`, el código y las dependencias afectadas. Antes de escribir código, lee `PLAN.md` completo como exige su encabezado; después recupera contexto adicional solo cuando haga falta.

Responsabilidades de Codex:

- Implementar exclusivamente el alcance autorizado y respetar requisitos, criterios de aceptación, arquitectura y contratos aprobados.
- Escribir y ejecutar las pruebas unitarias, de integración y demás validaciones aplicables; conservar los controles de §9 y §12.
- Actualizar `tasks.md` durante la ejecución; marcar una tarea únicamente cuando esté implementada y tenga evidencia de su validación.
- Entregar `implementacion.md` con archivos modificados, resultados reales, limitaciones, decisiones menores y referencias a la evidencia, según el protocolo.
- Leer `revision.md`, corregir los hallazgos dentro del alcance autorizado y presentar evidencia actualizada para una nueva revisión de Claude.
- Reportar bloqueos y contradicciones. Detener la parte afectada si resolverlos exige cambiar requisitos, criterios, alcance o decisiones arquitectónicas aprobadas; solicitar al usuario la autorización correspondiente y remitir la planificación a Claude.

Límites:

- No ampliar el alcance ni modificar requisitos o criterios de aceptación sin autorización. No reescribir el diseño aprobado para justificar una implementación incorrecta.
- Puede decidir detalles menores de implementación compatibles con lo aprobado; debe documentarlos si afectan la revisión.
- No marcar tareas sin evidencia, eliminar o desactivar pruebas para obtener resultados satisfactorios, ni modificar archivos ajenos al cambio activo.
- No sustituir decisiones arquitectónicas aprobadas sin justificar el cambio y obtener autorización del usuario.
- No sincronizar especificaciones principales ni archivar por iniciativa propia. El cierre corresponde a Claude después de la revisión y la autorización explícita del usuario.
- No crear commits ni publicar cambios remotos sin autorización explícita. Una autorización de implementación no autoriza estas acciones.
- No iniciar otros agentes ni simular mensajes o aprobaciones de Claude. La transferencia se hace mediante archivos compartidos y la intervención del usuario.

Los requisitos y el alcance aprobado se consultan en OpenSpec; `PLAN.md` y §5–§9 siguen siendo restricciones del proyecto. Si se contradicen, detener la parte afectada y consultar al usuario. Las instrucciones permanentes de rol se aplican también al invocar habilidades generadas; no editar esas habilidades para incorporar políticas locales.

---

## 1. Qué estamos construyendo (en 30 segundos)

Un **"cerebro omnicanal"** para Salud Digna: una capa intermedia, agnóstica a los sistemas existentes, que conecta los canales de atención (WhatsApp, Web, App, Call Center, Clínica). Un paciente puede empezar un trámite en un canal y continuarlo en otro **sin repetir datos**.

- Los **canales** son simuladores web dentro de `apps/web`.
- Los **sistemas de Salud Digna** (agenda, catálogo, resultados, facturación) se simulan en `apps/sd-mock`.
- **El cerebro es real:** máquina de estados, event store, broker, identidad, continuidad y seguridad.
- Hackathon de 30 horas, con demo en vivo que el jurado opera desde su celular.

**Prioridad absoluta:** el **Flujo A** (Call Center → WhatsApp → App → Clínica) estable. Ver `PLAN.md §12`.

---

## 2. Mapa de `PLAN.md` (dónde buscar)

| Necesito… | Sección |
|---|---|
| Alcance real / simulado / fuera de alcance | §2 |
| Stack | §3 |
| Estructura y reglas hexagonales | §4 |
| Tablas y perfil de servicio | §5 |
| Máquina de estados, casillas, `siguientePregunta` | §6 |
| Catálogo de eventos y patrones (outbox, idempotencia) | §7 |
| Resolvedor de continuidad y política de seguridad | §8 |
| Rutas y vistas por rol | §9 |
| Huecos, recordatorios, embudo, itinerario, facturación | §10 |
| Fases y orden de construcción | §11 |
| Guion del demo (flujos A, B y C) | §12 |
| Entregables | §13 |

---

## 3. Comandos

Los siguientes comandos son el objetivo del proyecto descrito en `PLAN.md`. Antes de usarlos, comprueba que existan el manifiesto, los scripts y la infraestructura correspondientes; su presencia en esta lista no significa que ya estén implementados.

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d postgres redis   # infraestructura
pnpm db:migrate            # migraciones (Kysely)
pnpm seed                  # sedes, servicios, pacientes y credenciales de demo
pnpm dev                   # api + sd-mock + web en modo watch
pnpm test                  # Vitest (todo)
pnpm test --filter domain  # solo dominio (rápido, sin infraestructura)
pnpm lint                  # ESLint + tsc --noEmit
pnpm lint:deps             # dependency-cruiser: fronteras hexagonales
pnpm demo:reset            # reinicia la base y vuelve a sembrar (antes de cada ensayo)
docker compose -f infra/docker-compose.yml up --build             # todo en contenedores
```

**Antes de terminar cualquier tarea:** `pnpm lint && pnpm lint:deps && pnpm test` en verde.

Si faltan los scripts o la infraestructura, registra el control como **BLOQUEADO**, con el error real; nunca lo informes como aprobado. En tareas exclusivamente documentales o de configuración, ejecuta las validaciones disponibles de los archivos afectados, sin crear código ni pruebas ficticias para satisfacer esta lista.

---

## 4. Estructura del repositorio

```
packages/domain/         TS puro. Entidades, máquinas de estados, eventos, políticas, errores de dominio
packages/application/    Casos de uso + puertos (interfaces). Depende solo de domain
packages/contracts/      Esquemas Zod y tipos derivados para canales. Solo depende de zod
packages/adapters/in-http/       Rutas Fastify por canal, webhook WA, validación Zod
packages/adapters/in-events/     Consumidores Redis Streams, workers BullMQ
packages/adapters/out-postgres/  Repositorios, event store, outbox, reservas
packages/adapters/out-redis/     Publisher de eventos, pub/sub
packages/adapters/out-sd/        Clientes HTTP hacia sd-mock
packages/adapters/out-security/  jose, argon2, OTP → bandeja simulada
packages/adapters/memory/        Adaptadores en memoria de TODOS los puertos (pruebas + respaldo)
apps/api/                main.ts = composition root, Socket.IO
apps/sd-mock/            Agenda, catálogo, resultados, pac-mock (?latencia=ms&fallo=%)
apps/web/                React + Vite: /web /wa /app /callcenter /clinica /admin /bandeja
infra/                   docker-compose.yml, migraciones SQL
docs/                    Diagramas Mermaid, catálogo de eventos
tests/load/              k6
```

---

## 5. Reglas de arquitectura (no negociables)

1. **`packages/domain` no tiene dependencias.** Ni `node_modules` ni otros paquetes del monorepo. Su `package.json` no tiene `dependencies`.
2. **`application` solo importa `domain`.** Nunca adaptadores.
3. **Los adaptadores no se importan entre sí.** Se conectan en `apps/api/src/main.ts`.
4. **Si el dominio necesita algo externo, crea un puerto** en `application/ports/` e implementa **dos** adaptadores: el real y el de `adapters/memory`.
5. **Prohibido `Date.now()` o `new Date()` en domain y application.** El tiempo viene del puerto `Reloj`. En modo demo, `Reloj` se puede adelantar (`POST /api/demo/reloj`).
6. **Prohibido `Math.random()` o `crypto.randomUUID()` en el dominio.** Los IDs vienen del puerto `GeneradorId` (UUID v7).
7. **Toda transición de estado** ocurre en un método de la entidad, incrementa `version` y agrega un evento a `eventosPendientes()`. Nunca hagas `UPDATE tramite SET estado = …` fuera del repositorio.
8. **Persistencia y eventos en la misma transacción** (outbox). El relay del outbox publica en Redis.
9. **Un tipo de trámite nuevo se registra** (máquina de estados + casillas + dependencias) en el registro de tipos. Nunca agregues `if (tipo === 'X')` en el núcleo.
10. **Toda entrada externa** se valida con Zod en el adaptador de entrada y se convierte en un comando tipado.
11. **`contracts` solo importa módulos propios y `zod`.** Ni dominio ni aplicación lo importan; la coherencia del vocabulario se prueba en `in-http`.
12. **`apps/web` consume `contracts`**, nunca dominio, aplicación ni adaptadores.

`pnpm lint:deps` falla si se rompen las reglas 1–3.

---

## 6. Convenciones de código

### Idioma y nombres
- **Dominio en español**, tal como lo usa Salud Digna: `Tramite`, `HiloAtencion`, `Sede`, `Servicio`, `confirmar()`, `CitaConfirmada`.
- **Sufijos técnicos en inglés:** `AgendaPort`, `TramiteRepoPostgres`, `PublisherRedisStreams`, `NotificadorWhatsAppSim`.
- Comentarios y mensajes de commit en español.
- Archivos: `PascalCase.ts` para clases, `camelCase.ts` para funciones y módulos.

### TypeScript
- `strict: true`, ESM, Node 20+. **Sin `any`**; usa `unknown` + Zod en las fronteras.
- Tipos de estado y evento como **uniones discriminadas** (`{ tipo: 'CitaConfirmada'; ... }`).
- **Dinero en centavos enteros** (`precioCentavos: 5500`). Nunca `float`.
- **Fechas:** `timestamptz` en UTC. Se convierten a la zona de la sede **solo en la presentación**, con `date-fns-tz` y `sede.zonaHoraria` (IANA).
- **IDs:** UUID v7 (ordenables por tiempo).

### Errores del dominio
El dominio lanza errores tipados; el adaptador HTTP los traduce:

| Error de dominio | HTTP | Qué hace el canal |
|---|---|---|
| `ReglaViolada{codigo, datos}` | 422 | Muestra el mensaje o las alternativas (ej. `SERVICIO_NO_DISPONIBLE_EN_SEDE`) |
| `StepUpRequerido{nivel, factores}` | 403 | Pide la verificación que corresponde (Flow, OTP, PIN) |
| `ConflictoVersion` | 409 | Recarga el estado y lo muestra ("Ya fue confirmada por teléfono") |
| `NoEncontrado` | 404 | — |
| `TransicionInvalida{de, comando}` | 409 | Recarga el estado |
| Validación Zod | 400 | — |

Nunca devuelvas el `stack` ni datos internos al cliente.

---

## 7. Contratos de integración

### API de comandos (todos los canales usan la misma)
```
POST /api/comandos
Headers: Authorization: Bearer <token de contexto>   (opcional según la acción)
         Idempotency-Key: <uuid>                       (obligatorio)
Body:    { canal, actor, tipo, tramiteId?, hiloId?, payload }
→ 200    { tramite, siguientePregunta, eventos[] }
```
- `canal`: `web | whatsapp | app | callcenter | clinica`
- `actor`: `paciente | asesor:<id> | recepcion:<id> | sistema`
- El **token de contexto** (JWS con jose) lleva `pacienteId`, `nivel`, `canal` y `exp`.

### Consultas
`GET /api/tramites/:id` · `GET /api/hilos/:id/linea-tiempo` · `GET /api/pacientes/:id/tramites-abiertos` · `GET /api/admin/embudo` · `GET /api/admin/huecos` · `GET /api/admin/kpis`

### Simulador de WhatsApp
`POST /api/canales/wa/mensajes` con `{ waId, texto?, payloadBoton?, flowResponse? }`. Es el **mismo contrato** que tendría el adaptador del webhook real de Meta; el adaptador traduce ambos a comandos.

### Eventos (Redis Streams)
- Streams particionados: `eventos:{n}` con `n = hash(pacienteId ?? hiloId) % 8`. Así se conserva el orden por paciente.
- Un grupo de consumidores por tipo de consumidor: `proyecciones`, `notificador`, `huecos`, `recordatorios`, `tiempo-real`.
- **Todo consumidor es idempotente**: registra el `idempotency_key` procesado y descarta duplicados.
- Tras N fallos → `eventos:fallidos` (visible en `/admin`).

### Tiempo real (Socket.IO)
Salas: `tramite:<id>`, `hilo:<id>`, `paciente:<id>`, `sede:<id>`, `admin`. Al tablero se emiten métricas agregadas; el detalle solo cuando se abre un hilo.

### Trabajos diferidos (BullMQ)
`job_id` determinista: `${tipo}:${tramiteId}` (ej. `PREPARACION:0193…`). Así se pueden cancelar o reprogramar al cambiar la cita.

---

## 8. Seguridad y privacidad (revisar en cada PR)

- [ ] El teléfono **nunca** es la llave del paciente; se usa `paciente.id` (UUID).
- [ ] Ningún secreto se pide como texto libre en el chat. PIN = campo `passcode`; fecha de nacimiento y datos fiscales = campos `sensitive` en el modal tipo Flow.
- [ ] **El bot nunca repite datos sensibles** (fecha de nacimiento, correo, RFC, resultados).
- [ ] En N1 solo se revelan servicio, sede, fecha y canal de origen.
- [ ] Cuando la búsqueda es ambigua, **no se revela nada**; nunca se confirman datos que el usuario no dio.
- [ ] Los QR, enlaces y botones llevan un **token firmado de un solo uso** (`jti` registrado), nunca el folio en texto plano.
- [ ] El PIN se guarda con argon2. Máximo 3 intentos → bloqueo + `IntentoVerificacionFallido`.
- [ ] **Logs sin datos personales:** pino con `redact` para `fechaNac`, `email`, `telefono`, `rfc`, `pin`, `curp`. Se registra `correlation_id`, no el contenido.
- [ ] Los `payload` de eventos visibles en `/admin` no contienen datos sensibles; se referencian por ID.
- [ ] Las notificaciones iniciadas por la empresa respetan opt-in, horario de silencio (zona de la sede) y límites de envío.
- [ ] Un mensaje al paciente B **nunca** revela datos del paciente A.
- [ ] El bot **nunca interpreta resultados clínicos**.
- [ ] Los secretos (`TOKEN_SECRET`, etc.) van solo en `.env`, que está en `.gitignore`; existe `.env.example`.

---

## 9. Pruebas

- **Dominio y aplicación:** Vitest con adaptadores de `adapters/memory` y `RelojFalso`. Deben correr en menos de 2 s.
- **Cada caso de uso** tiene al menos: camino feliz, una guarda que falla y un caso de concurrencia o idempotencia si aplica.
- **Pruebas obligatorias** (no se pueden borrar ni marcar como `skip`):
  - Continuidad: un trámite del call center se retoma en WhatsApp en la casilla correcta.
  - `siguientePregunta` respeta las dependencias y el orden de cada canal.
  - Reserva: 50 intentos concurrentes por el mismo horario → exactamente 1 éxito (contra Postgres).
  - Huecos: el filtro de ayuno excluye a los candidatos sin tiempo de preparación; en oleada hay un solo ganador; la saga compensa si falla.
  - Seguridad: un token de un solo uso no funciona la segunda vez; la política rechaza `verResultados` sin PIN.
  - Zona horaria: una cita en Tepic se muestra en `America/Mazatlan`.
- Nombres de prueba en español y descriptivos: `it('rechaza confirmar si el hold ya expiró')`.

---

## 10. Datos semilla y credenciales de demo

`pnpm seed` debe crear como mínimo:

| Rol | Usuario | Uso |
|---|---|---|
| Paciente A | `ana` · WA `5210000000001` · PIN `1234` | Flujos A y C (la que cancela) |
| Paciente B | `beto` · WA `5210000000002` · PIN `1234` | Flujo C (con interés de adelanto activo) |
| Asesor | `asesor1` / `demo123` | `/callcenter` |
| Recepción | `recepcion.tepic` / `demo123` | `/clinica` |
| Administrador | `admin` / `demo123` | `/admin` |

Además: sedes en al menos 3 zonas horarias (incluir Tepic y Bahía de Banderas), los 4 servicios de `PLAN.md §5`, `localidad` con Xalisco → Tepic, e historial de eventos de los últimos 7 días para que el embudo tenga datos.

**Estas credenciales son solo de demo.** Documéntalas en el README y nunca reutilices el patrón fuera del modo demo.

---

## 11. Variables de entorno

```
DATABASE_URL=postgres://...
REDIS_URL=redis://...
SD_MOCK_URL=http://localhost:4001
TOKEN_SECRET=...               # firma de tokens (jose)
DEMO_MODE=true                 # habilita /api/demo/* (reloj, reset) y la bandeja simulada
PUBLIC_BASE_URL=https://...    # para QR y enlaces mágicos
LOG_LEVEL=info
```

---

## 12. Flujo de trabajo para cada tarea

Este flujo corresponde a la implementación de producto por Codex, después de la autorización de §0. Para documentación o configuración, aplica solo los pasos pertinentes y reporta los controles que no se pudieron ejecutar.

1. **Lee** la tarea, este archivo, el handoff y los artefactos del cambio autorizado, y `PLAN.md` conforme a §0.
2. **Identifica la capa:** ¿dominio, caso de uso, puerto, adaptador o UI? Si toca varias, empieza por el dominio.
3. **Escribe primero la prueba** del comportamiento en el dominio o la aplicación.
4. **Implementa** lo mínimo para que pase, respetando §5–§8.
5. Si creas un evento, agrégalo a `docs/eventos.md`. Si creas un puerto, agrega su adaptador en memoria.
6. Ejecuta `pnpm lint && pnpm lint:deps && pnpm test`.
7. **Solo si el usuario autorizó un commit**, usa Conventional Commits en español: `feat(dominio): guarda de ayuno para ofertas de hueco`. En caso contrario deja las modificaciones sin commit.
8. **Reporta** en `implementacion.md`: qué hiciste, qué archivos tocaste, validaciones con resultados reales, evidencia y pendientes. Entrega el cambio a Claude para revisión; no lo archives.

### Definición de terminado
- [ ] Pruebas nuevas en verde y las existentes sin romper.
- [ ] `lint:deps` sin violaciones.
- [ ] Sin `any`, sin `TODO` sin dueño, sin `console.log` (usa el logger).
- [ ] Si cambia algo visible en el demo, se probó a mano en la ruta correspondiente.
- [ ] Si cambia un contrato (evento, puerto, esquema, API), se actualizó `docs/` y se avisó en el reporte.

---

## 13. Qué NO hacer

- No agregues dependencias pesadas sin justificarlo (no a ORMs adicionales, frameworks de DI, Kafka, ni microservicios extra).
- No reescribas módulos que funcionan para "mejorarlos" si la tarea no lo pide.
- No cambies contratos (eventos, puertos, esquema, API de comandos) sin indicarlo explícitamente en el reporte.
- No hagas llamadas a servicios reales de Salud Digna ni a la API real de Meta, salvo en la tarea explícita del bonus de WhatsApp real.
- No uses IA o LLM en el núcleo. Si una tarea pide IA, va detrás de un puerto (`ClasificadorIntencion`) con respaldo determinista.
- No marques pruebas como `skip` para que el pipeline pase.
- No dejes datos personales reales en semillas, pruebas, capturas ni logs.
- Ante la duda entre "más funciones" y "Flujo A estable", **elige el Flujo A estable**.

---

## 14. Glosario

| Término | Significado |
|---|---|
| **Hilo de atención** | Conversación única del paciente que atraviesa todos los canales |
| **Trámite** | Proceso dentro del hilo (`AGENDAR`, `ADELANTO`, `FACTURA`) con su máquina de estados |
| **Casilla** | Dato que el trámite necesita (servicio, sede, paciente, requisitos, horario) |
| **`siguientePregunta`** | Primera casilla vacía cuyas dependencias están cumplidas, según el orden del canal |
| **Contacto** | Identidad de canal (`wa_id`, teléfono, correo) |
| **Vínculo** | Relación contacto ↔ paciente (`TITULAR`, `FAMILIAR`, `TUTOR`) con método y nivel |
| **N0 / N1 / N2 / N3** | Niveles de autenticación: anónimo / reconocido / verificado / sensible |
| **Step-up** | Pedir una verificación adicional cuando la acción lo exige |
| **Hold** | Reserva temporal de un horario con TTL |
| **Hueco** | Horario liberado por una cancelación o reprogramación |
| **Oferta** | Propuesta de un hueco a un candidato (secuencial u oleada) |
| **Folio** | Identificador de cita que ya usa Salud Digna (`folio_externo`) |
| **Perfil de servicio** | Configuración que estandariza estudios y consultas (requisitos, preparación, elegibilidad) |
| **sd-mock / pac-mock** | Simulaciones de los sistemas de Salud Digna y del emisor de facturas |
