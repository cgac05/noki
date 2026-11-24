# PLAN — Cerebro Omnicanal Salud Digna (HackaTec / InnovaTecNM)

> Documento de instrucciones para agentes de IA y para el equipo. Léelo completo antes de escribir código.
> Plazo total: **30 horas**. Prioridad: que el demo funcione de punta a punta y que el jurado pueda operarlo desde su celular.

---

## 1. Contexto

**Reto:** "Orquestación Omnicanal de Atención: un paciente, una sola conversación".
Hoy los canales de Salud Digna (Contact Center, WhatsApp, sitio web, App, clínica) funcionan como silos: el paciente repite sus datos y reinicia trámites al cambiar de canal. Evidencia real: en el bot actual de WhatsApp, una cotización hecha a las 19:13 se pierde cuando el mismo paciente toca "Agendar cita" a las 23:32; también pide la ciudad dos veces y repite en el chat la fecha de nacimiento y el correo.

**Lo que piden los mentores:**
- Un **"cerebro" agnóstico**, una capa intermedia que conecte los canales existentes. **No** rehacer los sistemas internos; esos se **simulan** (no habrá acceso real).
- No depender solo de IA genérica. Núcleo determinista; la IA solo como apoyo.
- Prioridad: **seguimiento de la conversación** entre canales. Flujo pedido explícitamente: **Contact Center → Llamada → WhatsApp**, con los datos conectados.
- "Tomar lo que ya existe y buscar un extra". El costo se calcula, pero no decide.

**Cuatro pilares evaluados:** Identidad · Contexto y estado · Trazabilidad · Seguridad.

**Criterios de evaluación:** experiencia y continuidad omnicanal; arquitectura e integración técnica; seguridad, identidad y trazabilidad; innovación e impacto operativo; calidad del demo y viabilidad.

---

## 2. Alcance

### Real (se implementa de verdad)
- Dominio: máquina de estados del trámite, hilo de atención, eventos, políticas de identidad.
- Event store en PostgreSQL, broker en Redis Streams, temporizadores con BullMQ.
- Resolvedor de continuidad entre canales.
- Seguridad: tokens firmados de un solo uso, OTP, PIN con hash, enlaces mágicos, campos sensibles enmascarados.
- Reserva atómica de horarios (sin doble reserva), concurrencia optimista, idempotencia.
- Tablero en tiempo real.

### Simulado (canales y sistemas externos)
- **WhatsApp:** simulador web tipo chat con botones, listas y un modal tipo *WhatsApp Flow* con campos enmascarados.
- **Web:** asistente de agendado con el botón "Continuar en WhatsApp".
- **Call center:** consola del asesor con un botón "Llamada entrante".
- **App:** PWA con vista móvil (cita y QR).
- **Clínica:** vista de recepción que escanea el QR con la cámara del navegador.
- **Sistemas de Salud Digna** (agenda, catálogo, resultados): servicio `sd-mock` con latencia y fallos configurables.
- **SMS y correo:** "bandeja simulada" visible en la UI.

### Funciones de atención al cliente e innovación (ver §10)
El cerebro atiende **varios tipos de trámite** dentro del mismo hilo, cada uno con su propia máquina de estados y compartiendo identidad, continuidad, eventos y temporizadores:

| Prioridad | Función | Cuándo |
|---|---|---|
| P1 | Relleno de huecos (lista de espera para adelantar cita) | Horas 18–24 |
| P1 | Recordatorios y seguimiento de citas (preparación y ayuno calculados) | Horas 18–24 |
| P2 | Análisis de abandono por paso y canal (embudo en Admin) | Horas 18–24 |
| P2 | Itinerario de visita única para varios estudios | Horas 18–24 |
| P3 | Horario recomendado según saturación · Fila virtual por WhatsApp · Paso a humano con devolución de llamada | Solo si en la hora 22 va bien |
| P3 | Facturación (tipo de trámite mínimo, prueba de extensibilidad) | Solo si sobra tiempo; si no, va en diseño y presentación |

**Ninguna de estas funciones puede poner en riesgo el Flujo A.**

### Fuera de alcance (solo se menciona en la presentación)
- WhatsApp Cloud API real: **bonus opcional**, con tope de 4 h, solo después del MVP.
- INE + selfie remoto, pagos reales, despliegue en varias regiones, NLP avanzado.
- Evolución del producto (§10.7): notas de voz, agenda familiar, recordatorios de prevención, siguiente paso tras resultados, encuesta por canal, copiloto del asesor.

---

## 3. Stack

| Área | Tecnología |
|---|---|
| Lenguaje | TypeScript (Node 20+) |
| Monorepo | pnpm workspaces |
| HTTP | Fastify + Zod (validación en los adaptadores) |
| Base de datos | PostgreSQL + Kysely |
| Broker / pub-sub / jobs | Redis: Streams (ioredis), `@socket.io/redis-adapter`, BullMQ |
| Tiempo real | Socket.IO |
| Seguridad | jose (JWS), argon2 (PIN) |
| Frontend | React + Vite + Tailwind + TanStack Query; `qrcode`, `html5-qrcode` |
| Pruebas | Vitest; Testcontainers (opcional); k6 (carga) |
| Logs | pino con `correlation_id` |
| Infraestructura | Docker Compose; despliegue público en Railway o Render |
| Fronteras | dependency-cruiser |

---

## 4. Arquitectura hexagonal (reglas obligatorias)

```
packages/
  domain/          # TS puro, CERO dependencias externas
  application/     # casos de uso + puertos (interfaces). Solo depende de domain
  contracts/       # esquemas Zod y tipos para canales; solo depende de zod
  adapters/
    in-http/       # rutas por canal + webhook WA (Zod)
    in-events/     # consumidores Redis Streams, workers BullMQ
    out-postgres/  # repositorios, event store, reservas (Kysely)
    out-redis/     # publisher de eventos, pub/sub
    out-sd/        # clientes HTTP hacia sd-mock
    out-security/  # jose, argon2, OTP → bandeja simulada
apps/
  api/             # main.ts = composition root (inyección manual), Socket.IO
  sd-mock/         # agenda, catálogo, resultados; ?latencia=ms&fallo=%
  web/             # rutas: /web /wa /app /callcenter /clinica /admin
infra/docker-compose.yml
docs/              # diagramas Mermaid, catálogo de eventos
tests/load/        # k6
```

**Reglas (se validan con dependency-cruiser):**
1. `domain` no importa nada de `application`, `contracts`, `adapters` ni `node_modules`.
2. `application` solo depende de `domain`; no importa `contracts`, `adapters`, aplicaciones ni módulos externos.
3. Los adaptadores no se importan entre sí.
4. Toda entrada externa se valida con Zod **en el adaptador** y se convierte en un comando tipado.
5. Cada puerto tiene un **adaptador en memoria** para pruebas y como respaldo del demo.
6. `contracts` solo importa módulos propios y `zod`; los adaptadores de entrada validan con sus esquemas.
7. `apps/web` consume contratos desde `contracts` y no importa `domain`, `application` ni adaptadores.

---

## 5. Modelo de datos (mínimo)

```
paciente(id uuid, nombre, ap_paterno, ap_materno, fecha_nac, sexo, curp?, nivel_identidad int)
   -- nivel_identidad: 0 declarado · 1 OTP a contacto previo · 2 INE en clínica
contacto_canal(id, canal, valor_externo, primer_contacto, ultimo_contacto)
vinculo(contacto_id, paciente_id, relacion, metodo, verificado_en, ultimo_uso)
   -- relacion: TITULAR | FAMILIAR | TUTOR
   -- metodo: FLOW_DECLARADO | OTP_EMAIL | OTP_SMS | TOKEN_WEB | TOKEN_CC | FOLIO_FECHA_NAC | INE_CLINICA
credencial(paciente_id, tipo, hash, intentos_fallidos, bloqueado_hasta)   -- PIN
hilo_atencion(id, paciente_id?, contacto_id, abierto_en, ultimo_canal)
tramite(id, hilo_id, tipo, folio_externo, servicio_id?, sede_id?, paciente_id?, estado, version int,
        ultima_actividad, ultimo_canal, tramite_padre_id?)
   -- tipo: AGENDAR | ADELANTO | FACTURA   (registro de tipos: cada uno aporta su máquina de estados)
interes_adelanto(id, tramite_id, paciente_id, servicio_id, sedes_aceptadas uuid[], ventana tstzrange,
                 canal_preferido, estado, registrado_en)        -- ACTIVO | CUMPLIDO | CANCELADO | VENCIDO
hueco(id, sede_id, recurso_id, inicio, origen_reserva_id, estado, estrategia, creado_en)
   -- estado: DETECTADO | OFRECIDO | ASIGNADO | DESIERTO · estrategia: SECUENCIAL | OLEADA
oferta_hueco(id, hueco_id, interes_id, estado, enviada_en, expira_en, token_jti)
   -- OFRECIDA | ACEPTADA | RECHAZADA | EXPIRADA | PERDIDA (otro aceptó primero en oleada)
recordatorio(id, tramite_id, tipo, programado_para timestamptz, canal, estado, job_id)
   -- tipo: T48 | PREPARACION | T2 | POST · job_id derivado de tramite_id para cancelar/reprogramar
preferencias_contacto(paciente_id, canal_preferido, silencio_desde time, silencio_hasta time,
                      max_ofertas_semana, opt_in_ofertas bool, opt_in_recordatorios bool)
perfil_fiscal(paciente_id, rfc, razon_social, cp_fiscal, regimen, uso_cfdi)   -- campos sensitive
recurso(id, sede_id, tipo, servicios_compatibles uuid[])   -- ej. sala de ultrasonido
evento(id, tramite_id, hilo_id, tipo, payload jsonb, canal, actor, nivel_auth, version,
       correlation_id, idempotency_key unique, ts timestamptz)
servicio(id, codigo, nombre, categoria, sinonimos text[], perfil jsonb)
sede(id, nombre, ciudad, lat, lng, zona_horaria, horario jsonb)
oferta_sede(sede_id, servicio_id, precio, disponible, modo_agenda)
reserva(id, sede_id, recurso_id, inicio timestamptz, tramite_id, estado, expira_en)
   -- UNIQUE (sede_id, recurso_id, inicio) WHERE estado IN ('APARTADA','CONFIRMADA')
localidad(nombre_normalizado, municipio, estado, lat, lng)   -- "Xalisco" → sede más cercana
```

- **Un teléfono NO es la PK.** El paciente se identifica por UUID; un teléfono puede vincularse a varios pacientes (familia).
- Todas las fechas se guardan en UTC. Se muestran en la `zona_horaria` de la sede (ej. Tepic = `America/Mazatlan`, Bahía de Banderas = `America/Bahia_Banderas`).

### Perfil de servicio (estandariza estudios y consultas)
```ts
interface PerfilServicio {
  tipo: 'ESTUDIO' | 'CONSULTA';
  requisitos: Array<{tipo:'ORDEN_MEDICA'} | {tipo:'ACEPTAR_PREPARACION'; texto:string}
                   | {tipo:'DATOS_PACIENTE'; campos:string[]} | {tipo:'CONSENTIMIENTO'; documento:string}>;
  modoAgenda: 'HORARIO' | 'TURNO';
  requiereProfesional: boolean;
  elegibilidad?: { sexo?: 'F'|'M'; edadMin?: number; edadMax?: number };   // advierte, no bloquea
  componentes?: string[];          // paquetes → reserva compuesta (saga)
  duracionMin: number; ttlReservaMin: number; toleranciaMin: number; limiteCambiosHoras: number;
  // nuevos
  preparacion?: { ayunoHoras?: [number, number]; vejigaLlena?: boolean; texto: string };
  anticipacionMinimaHoras: number;   // para ofrecer un hueco: ¿alcanza a prepararse?
  reglasItinerario?: { irPrimero?: boolean; separacionMinMin?: number; incompatibleAntesDe?: string[] };
  recordatorios: Array<'T48' | 'PREPARACION' | 'T2' | 'POST'>;
}
```
Semilla mínima: **Química sanguínea** (laboratorio, TURNO, ayuno), **Ultrasonido abdominal** (HORARIO, preparación), **Consulta nutricional** (CONSULTA, profesional), **Paquete US mamario + Papanicolaou** (componentes, elegibilidad F).
Sedes semilla en al menos 3 zonas horarias (incluir Tepic).

---

## 6. Máquina de estados del trámite (única para todos los canales y servicios)

```
BORRADOR → COTIZADO → LISTO_PARA_RESERVAR → HORARIO_RESERVADO → CONFIRMADA → EN_CLINICA → ATENDIDA
                                              ↑   │ hold expira → LISTO_PARA_RESERVAR
                              reprogramar ────┘   CONFIRMADA → CANCELADA | NO_ASISTIO
cualquier estado previo a CONFIRMADA → EXPIRADO (inactividad)
```

- La fase previa a reservar es **llenado de casillas en cualquier orden**: `servicio`, `sede`, `paciente`, `requisitos`, `elegibilidad`. Los estados son hitos que se calculan:
  - `COTIZADO` = servicio + sede + precio
  - `LISTO_PARA_RESERVAR` = además paciente asignado y requisitos cumplidos
- **Dependencias** (grafo, no secuencia): `horario ← servicio+sede` · `precio ← servicio+sede` · `elegibilidad ← servicio+paciente` · `requisitos ← servicio`.
- Cada canal define su **orden preferido**. `siguientePregunta(tramite, canal)` devuelve la primera casilla vacía cuyas dependencias ya están cumplidas. **Esta función es la que permite reanudar en otro canal.**
- Orden preferido:
  - WhatsApp: servicio → sede → horario → requisitos → paciente → elegibilidad
  - Call center: paciente → servicio → sede → …
  - Presencial: paciente → servicio → …
  - **Regla:** primero el estudio y después las sedes que lo ofrecen.
- **"Suspendido" NO es un estado.** Es metadato (`ultima_actividad`) + el evento `TramiteSuspendido`.
- **La verificación de identidad NO es un estado.** Es una guarda que lanza `StepUpRequerido(nivel)`; el adaptador del canal decide cómo pedirla.
- `SeleccionarSede` valida `oferta_sede` → si no hay oferta: `SERVICIO_NO_DISPONIBLE_EN_SEDE` + alternativas.
- Cada transición incrementa `version` (concurrencia optimista) y emite un evento.
- Temporizadores (BullMQ): expiración del hold → `ReservaExpirada` (compensación); recuperación tras X h de inactividad; `EXPIRADO` tras Y h; `NO_ASISTIO` tras la tolerancia.
- Un trámite `EXPIRADO` puede **clonarse** con las casillas ya llenas.

---

## 7. Catálogo de eventos

Campos comunes: `tipo, tramite_id, hilo_id, canal, actor ('paciente'|'asesor:<id>'|'recepcion:<id>'|'sistema'), nivel_auth, version, correlation_id, idempotency_key, ts`.

**Agendar:** `TramiteIniciado` · `ServicioSeleccionado` · `SedeSeleccionada` · `CotizacionGenerada{precio, vigente_hasta}` · `PreparacionAceptada` · `RequisitoCumplido` · `PacienteAsignado` · `ItinerarioPropuesto` · `ItinerarioAceptado` · `HorarioReservado{expira_en}` · `ReservaExpirada` · `CitaConfirmada{folio}` · `CitaReprogramada` · `CitaCancelada{anticipacion_horas}` · `PacienteLlego` · `TurnoActualizado{posicion}` · `AtencionCerrada` · `Inasistencia` · `TramiteSuspendido` · `TramiteExpirado`

**Identidad y canal:** `CanalCambiado{de, a, metodo}` · `PacienteReconocido` · `IdentidadVinculada{metodo}` · `IdentidadComprobada{metodo}` · `ConsentimientoOtorgado{version}` · `ConsentimientoContactoWA` · `IntentoVerificacionFallido`

**Resultados:** `ResultadoDisponible` · `ResultadoConsultado`

**Relleno de huecos:** `InteresAdelantoRegistrado` · `InteresAdelantoCancelado` · `HuecoLiberado` · `OfertaEnviada` · `OfertaAceptada` · `OfertaRechazada` · `OfertaExpirada` · `OfertaPerdida` · `CitaAdelantada{dias_adelantados}` · `HuecoAsignado` · `HuecoDesierto`

**Seguimiento:** `RecordatorioProgramado` · `RecordatorioEnviado` · `RecordatorioCancelado` · `AsistenciaConfirmada` · `PreparacionConfirmada`

**Atención:** `FriccionDetectada{motivo}` · `DevolucionLlamadaSolicitada` · `DevolucionLlamadaAtendida`

**Facturación:** `FacturaSolicitada` · `DatosFiscalesCapturados` · `FacturaValidada` · `FacturaRechazada{motivo}` · `FacturaEmitida` · `FacturaEnviada`

Patrones obligatorios: **outbox** (evento y cambio en la misma transacción) · **idempotencia** por `idempotency_key` · partición por `patient_id` (o `hilo_id` si es anónimo) · cola de mensajes fallidos visible en Admin.

---

## 8. Identidad y seguridad

**Principio:** el número de teléfono es un **factor de posesión**, no una identidad. La validación es proporcional al riesgo de la acción.

### Resolvedor de continuidad (en orden de prioridad)
1. **Token** firmado (`CONTINUAR <código>` o payload de botón): un solo uso, TTL, hereda el nivel del origen.
2. **`wa_id` vinculado** con trámites abiertos → N1 (solo se revelan servicio, sede y canal de origen).
3. **`wa_id` = teléfono capturado** en el trámite → N1.
4. **Folio** (8–9 dígitos): solo localiza; exige fecha de nacimiento.
5. **Datos personales** (Flow) → coincidencia → OTP al contacto registrado previamente.
- Si es ambiguo, **no se revela nada**. Nunca se confirman datos que el usuario no dio.
- Límite de 3 intentos → `IntentoVerificacionFallido` + bloqueo temporal.

### Política por acción (un solo objeto en el dominio)
| Acción | Requiere |
|---|---|
| cotizar, ver preparación | nada |
| agendar | datos declarados (la clínica valida la INE en recepción) |
| retomar trámite | `wa_id` vinculado; si no lo está: folio + fecha de nacimiento |
| reprogramar / cancelar | `wa_id` vinculado + **OTP** o botón de aprobación |
| ver resultados | identidad ≥1 + **PIN**, vía **enlace mágico a la web** |
| cambiar teléfono o correo | identidad ≥1 + OTP al contacto **anterior** + PIN |
| aceptar oferta de hueco | botón con token de un solo uso enviado al `wa_id` vinculado (cuenta como botón de aprobación) |
| responder recordatorio (confirmar / cancelar) | botón con token de un solo uso |
| solicitar factura | folio + `wa_id` vinculado; datos fiscales en el Flow como `sensitive` |

### Reglas de no exposición
- **Ningún secreto se escribe como mensaje de chat.** Se captura en el modal tipo Flow: el PIN como `passcode`, la fecha de nacimiento y los datos personales como `sensitive`. En el resumen del chat aparecen enmascarados.
- **El bot nunca repite datos sensibles** en sus mensajes.
- Se prefieren secretos **de un solo uso** (OTP, enlace mágico, botón de aprobación) sobre secretos fijos. Lo que queda en el historial ya no sirve.
- Los QR y los enlaces llevan un **token firmado**, no el folio en texto plano.
- El PIN se guarda con argon2. Los vínculos inactivos pierden nivel con el tiempo.
- Al primer contacto se registra `ConsentimientoOtorgado`.

---

## 9. Canales y vistas por rol

| Ruta | Rol | Debe poder |
|---|---|---|
| `/web` | Paciente | cotizar → elegir sede → abandonar → botón "Continuar en WhatsApp" (QR / `CONTINUAR <token>`) |
| `/wa` | Paciente | chat simulado; reconoce al paciente; retoma en `siguientePregunta`; modal tipo Flow; lista de trámites abiertos; resumen con ✅ de lo que ya existe; "¿Te aviso si se libera un espacio antes?"; recibe ofertas de hueco y recordatorios con botones; itinerario propuesto; turno en vivo; "Quiero hablar con alguien" → devolución de llamada; solicitud de factura |
| `/app` | Paciente | ver citas, el QR firmado, el estado en vivo; login con PIN; **cancelar o reprogramar** (dispara el relleno de huecos); preferencias de contacto y suscripción a la lista de espera |
| `/callcenter` | Asesor | "Llamada entrante" (ANI) → ficha del hilo (resumen + línea de tiempo) → operar el trámite *en nombre de* → "Continuar por WhatsApp" (consentimiento + plantilla con token) → la ficha pasa a solo lectura cuando el paciente continúa; **cola de devoluciones de llamada** con el motivo de la fricción; ver y corregir solicitudes de factura rechazadas |
| `/clinica` | Recepción | escanear el QR → `RegistrarLlegada`; marcar "INE verificada" → `IdentidadComprobada`; avanzar la fila (genera `TurnoActualizado`) |
| `/admin` | Administrador | tablero en vivo: trámites por estado, línea de tiempo por paciente con iconos de canal, cambios de canal, alertas de seguridad, cola de fallidos, **embudo de abandono por paso y canal**, **panel de huecos** y KPIs (§10.8) |
| `/bandeja` | Demo | correos y SMS simulados (OTP) |

Detalles de la interfaz de WhatsApp: listas (≤10 filas) y botones (≤3); en lugar de comandos tecleados ("mas", "otro"), filas de la lista; búsqueda difusa de estudios (`pg_trgm` + sinónimos); ubicación por botón o por texto ("Xalisco" → "la más cercana es Tepic, a X km"); recordar la sede habitual.

---

## 10. Atención al cliente e innovación

Cada función es un **tipo de trámite** o un **consumidor de eventos** nuevo. No se modifica la máquina de agendado ni el núcleo de identidad.

### 10.1 Relleno de huecos (P1): el diferenciador principal
**Objetivo:** cuando un paciente cancela, ofrecer el espacio a pacientes interesados en adelantar su cita. Los pacientes organizan mejor su agenda y la clínica recupera horas-recurso.

**Flujo:**
1. **Registrar el interés.** Al agendar, si no hay horario cercano: "¿Te aviso si se libera un espacio antes?" → ventana (fechas y turno) + sedes aceptadas → `InteresAdelantoRegistrado`. Esa respuesta es también el **opt-in** para recibir plantillas de WhatsApp.
2. **Se libera un espacio.** `CitaCancelada`, `CitaReprogramada` o `ReservaExpirada` sobre una cita confirmada → `HuecoLiberado{sede, recurso, inicio}`.
3. **Buscar candidatos** (función pura en el dominio):
   ```ts
   function candidatoCompatible(h: Hueco, i: InteresAdelanto, p: PerfilServicio, ahora: Date) {
     return i.estado === 'ACTIVO'
       && recursoCompatible(h.recursoId, i.servicioId)        // misma sala/equipo
       && i.sedesAceptadas.includes(h.sedeId)
       && dentroDeVentana(h.inicio, i.ventana)
       && h.inicio < i.citaActual.inicio                      // de verdad lo adelanta
       && horasHasta(h.inicio, ahora) >= p.anticipacionMinimaHoras   // alcanza el ayuno o la preparación
       && requisitosCubiertos(i, p)
       && !excedeLimiteOfertas(i.pacienteId)
       && !enHorarioSilencio(ahora, i.pacienteId, h.zonaHoraria);
   }
   ```
4. **Estrategia de oferta:**
   - **Más de 24 h:** `SECUENCIAL`, un candidato a la vez, TTL de 15 min, orden FIFO de registro.
   - **Menos de 24 h:** `OLEADA` de 3–5 candidatos; el primero que acepta gana (lo garantiza el índice único de `reserva`); los demás reciben `OfertaPerdida` con un mensaje amable.
5. **Aceptación (saga):** reservar el horario nuevo (atómico) → confirmar → **después** liberar el horario anterior de B. Si falla, se compensa y B conserva su cita.
6. **Efecto dominó:** el horario liberado de B genera otro `HuecoLiberado`.

**Máquina de la oferta:** `HUECO_DETECTADO → OFRECIDO(candidato, TTL) → ACEPTADO → ASIGNADO`; `RECHAZADO | EXPIRADO` → siguiente candidato; sin candidatos → `DESIERTO`.

**Reglas:**
- **Privacidad:** B nunca sabe quién canceló. El mensaje solo incluye servicio, sede, fecha y hora.
- **Prioridad justa:** FIFO dentro de la ventana. Nunca por pago. Si Salud Digna quisiera prioridad clínica, el criterio lo definen ellos.
- **Límites:** máximo de ofertas por semana, horario de silencio en la zona de la sede, baja con un toque.
- **Costo:** cada oferta es una plantilla de pago → preferir la estrategia secuencial; registrarlo en el cálculo de costos.

**Criterio de aceptación:** A cancela en `/app` → en menos de 5 s B recibe la oferta en `/wa` → acepta → `CitaAdelantada` → el horario anterior de B se ofrece al siguiente → el panel de huecos y el KPI se actualizan en vivo. Una prueba de Vitest cubre: el filtro de ayuno, el ganador único en oleada y la compensación si falla la saga.

### 10.2 Recordatorios y seguimiento de citas (P1)
`CitaConfirmada` programa trabajos en BullMQ según `perfil.recordatorios`, **calculados en la zona horaria de la sede**:

| Tipo | Cuándo | Contenido | Botones |
|---|---|---|---|
| `T48` | 48 h antes | recordatorio + requisitos pendientes (orden médica) | [Confirmo] [Reprogramar] [Cancelar] |
| `PREPARACION` | tarde anterior (fuera del horario de silencio) | **hora calculada**: cita 08:05 + ayuno 10 h → "deja de comer desde las 22:05" | [Entendido] |
| `T2` | 2 h antes | dirección, QR, "trae identificación" | [Cómo llegar] |
| `POST` | después de `AtencionCerrada` | aviso de resultados (enlace mágico) o encuesta | — |

- Canal: el preferido; si no hay confirmación de entrega, se usa WhatsApp.
- Reprogramar o cancelar la cita **cancela y reprograma** sus trabajos (el `job_id` se deriva del `tramite_id`).
- **Ciclo con §10.1:** el recordatorio facilita cancelar con anticipación en lugar de no presentarse → `HuecoLiberado` → otro paciente adelanta su cita. Mostrarlo así en la presentación.

**Criterio de aceptación:** al confirmar una cita, `/admin` muestra los recordatorios programados; un botón de demo "adelantar reloj" los dispara; "Cancelar" desde un recordatorio dispara el relleno de huecos.

### 10.3 Análisis de abandono (P2)
Embudo por paso y canal, calculado con consultas sobre `evento` (*process mining*): `Cotizado → Sede → Datos → Horario → Confirmada`, con el porcentaje que avanza y el paso con mayor abandono resaltado. Filtros por canal, sede y fecha.

**Criterio de aceptación:** gráfica en `/admin` alimentada por los eventos semilla y los del demo en vivo.

### 10.4 Itinerario de visita única (P2)
**Problema observado:** el bot actual pide una hora por cada estudio del paquete, sin orientar al paciente.
**Propuesta:** un algoritmo voraz, sin IA, que usa `reglasItinerario` (estudios en ayuno primero, separación mínima, incompatibilidades) y la disponibilidad para proponer la secuencia con menor espera total. Se reserva con la saga compuesta (todo o nada).

**Criterio de aceptación:** el Paquete US mamario + Papanicolaou propone horarios consecutivos válidos; el paciente acepta con un toque o elige otro día.

### 10.5 Horario recomendado, fila virtual y paso a humano (P3)
- **Horario recomendado:** la ocupación por franja se calcula desde los eventos (`HorarioReservado`, `PacienteLlego`) → "⭐ 11:30: hasta X % menos espera"; para estudios sin ayuno se sugiere evitar la hora pico (el bot actual ya advierte de la saturación de 7 a 11 am).
- **Fila virtual:** después de `PacienteLlego`, la recepción avanza la fila → `TurnoActualizado` → por WhatsApp: "Faltan 3 personas". Aprovecha el Turnómetro que ya existe.
- **Paso a humano:** reglas de fricción (3 entradas no reconocidas, el mismo paso repetido, "quiero hablar con alguien") → `FriccionDetectada` → "¿Te llamamos en unos 10 min?" → la cola de `/callcenter` muestra la ficha y el motivo.

### 10.6 Facturación (P3, prueba de extensibilidad)
Tipo de trámite `FACTURA`: `SOLICITADA → DATOS_FISCALES_COMPLETOS → VALIDADA → EMITIDA → ENVIADA`; `VALIDADA` puede volver a `ERROR_DATOS`.
- Se inicia desde cualquier canal con el folio ("necesito factura del folio …").
- Datos CFDI 4.0 en el Flow (`sensitive`): RFC, nombre o razón social como aparece en la constancia, CP fiscal, régimen fiscal, uso del CFDI. Se guardan en `perfil_fiscal` para la siguiente vez.
- Emisor simulado: `FacturacionPort` → `pac-mock` (puede rechazar, por ejemplo, porque el CP no coincide).
- El asesor ve las solicitudes rechazadas y las corrige sin reiniciar.

### 10.7 Evolución del producto (solo presentación)
Notas de voz con transcripción (accesibilidad) · agenda familiar con el rol `TUTOR` · recordatorios de prevención (con consentimiento expreso) · ofrecer una consulta cuando el **laboratorio** marca valores fuera de rango (el bot nunca interpreta resultados) · encuesta de satisfacción por canal · copiloto del asesor.

### 10.8 KPIs del tablero
Repeticiones de datos por paciente (meta: 0) · trámites recuperados · cambios de canal por hilo · tiempo de traspaso · **huecos liberados vs. recuperados** · tiempo hasta reasignar · **horas-recurso recuperadas** · días promedio que se adelantó la atención · ingreso estimado recuperado · cancelaciones anticipadas vs. inasistencias · paso con mayor abandono por canal.

---

## 11. Fases e hitos

| Horas | Objetivo | Criterio de aceptación |
|---|---|---|
| 0–2 | Contratos | Este plan, los tipos de eventos, los estados, los puertos y el esquema SQL en el repo; Docker Compose levanta Postgres y Redis |
| 2–6 | Dominio + pruebas | Vitest verde: transiciones, guardas, `siguientePregunta`, política de identidad, resolvedor de continuidad (con adaptadores en memoria) |
| 6–10 | Infraestructura real | Event store + outbox, Redis Streams, reservas con índice único, BullMQ, `sd-mock` |
| 2–10 (paralelo) | Esqueleto del frontend | Las 6 rutas navegables con datos falsos |
| 10–18 | **MVP** | **Flujo A** de punta a punta con eventos reales (ver §12) |
| 18–24 | Extras (en este orden) | 1) Tablero de admin + check-in en clínica · 2) **Relleno de huecos (§10.1)** · 3) **Recordatorios (§10.2)** · 4) OTP/PIN/enlace mágico · 5) **Flujo B** · 6) Embudo de abandono (§10.3) · 7) Itinerario (§10.4) |
| 22 | Punto de decisión | Si los puntos 1–5 están verdes: P3 (§10.5, §10.6) o WhatsApp real (≤4 h). Si no: solo se estabiliza |
| 24–27 | Resiliencia y entregables | Demos de caos y contención, datos semilla (incluir intereses de adelanto e historial para el embudo), README, diagramas |
| 27–30 | Congelar | Despliegue público, 3 ensayos, video de respaldo |

**Reparto vigente:** dos frentes, núcleo (dominio, continuidad, persistencia, API, infraestructura, seguridad) y canales (`apps/web`: `/web`, `/wa`, `/app`, `/callcenter`, `/clinica`, `/admin`, `/bandeja`). Responsables, propiedad de archivos, secuencia de cambios y reglas de integración en [docs/trabajo-paralelo.md](docs/trabajo-paralelo.md).

---

## 12. Guion del demo (debe funcionar siempre)

**Flujo A (principal): Call Center → WhatsApp → App → Clínica**
1. El asesor recibe una llamada (ANI), cotiza el paquete y elige la sede de Tepic. La llamada "se corta"; el asesor pulsa "Continuar por WhatsApp".
2. Un jurado abre `/wa` en su celular con el token. El sistema retoma en el paso del horario. Verifica (modal enmascarado) y confirma → `CitaConfirmada`.
3. `/app` muestra la cita y el QR; `/admin` muestra la línea de tiempo con los tres canales y `CanalCambiado`.
4. `/clinica` escanea el QR → `PacienteLlego`.

**Flujo B: Web → WhatsApp.** El paciente cotiza en la web y abandona; escribe "Hola" en `/wa`; el bot dice "Tienes una cotización de … ¿Continuar?".

**Flujo C: Relleno de huecos (unos 60 s).**
1. Ana cancela su cita del jueves desde `/app` (o desde el botón del recordatorio `T48`, con "adelantar reloj").
2. Un jurado con interés registrado recibe en `/wa`: "Se liberó un espacio el jueves a las 9:15…" → [Sí, adelantar].
3. `/admin`: `HuecoLiberado → OfertaEnviada → CitaAdelantada`; el horario anterior del jurado se ofrece al siguiente; sube el KPI de horas-recurso recuperadas.

**Mensaje de cierre:** el cerebro conecta los canales **y aprende de cada interacción**: recupera huecos, reparte esperas y detecta abandonos con los mismos eventos que ya guarda para la trazabilidad.

**Resiliencia (en vivo):**
- Apagar el consumidor a media operación y volver a levantarlo → sin pérdidas ni duplicados.
- 50 solicitudes simultáneas por el mismo horario → exactamente 1 lo obtiene (k6 o un script).
- `sd-mock?fallo=50` → reintentos y compensación visibles.
- El hold expira → `ReservaExpirada` → se ofrecen horarios nuevos sin error.

---

## 13. Entregables (requisitos del reto)
- [ ] Repo en GitHub con código ordenado.
- [ ] `README.md`: instalación (`docker compose up`), **credenciales de prueba por rol** (paciente A, paciente B con interés de adelanto, asesor, recepción, admin), **pasos exactos** para replicar los flujos A, B y C, y cómo usar "adelantar reloj".
- [ ] `docs/`: diagrama de arquitectura, diagrama de secuencia del cambio de canal, **diagrama de secuencia de la saga de huecos**, modelo de datos (Mermaid `erDiagram`), catálogo de eventos, máquinas de estados (agendar, oferta de hueco, factura), grafo de dependencias real (`depcruise`).
- [ ] Cálculo de costos por componente (WhatsApp por plantilla —incluye ofertas y recordatorios—, infraestructura, IA con tope) vs. ahorro (minutos de contact center, **ingreso por huecos recuperados**, inasistencias evitadas).

---

## 14. Reglas de trabajo para agentes de IA
1. **No rompas las fronteras hexagonales.** Si necesitas algo externo en el dominio, crea un puerto.
2. Toda transición de estado pasa por un método del dominio y emite un evento. Nunca hagas `UPDATE tramite SET estado` directo.
3. Toda escritura de trámite usa `version` (concurrencia optimista) y outbox.
4. Toda entrada externa se valida con Zod en el adaptador.
5. Ningún dato sensible en logs, en los mensajes del bot ni en el `payload` de eventos visibles al administrador.
6. Fechas en UTC; se muestran en la zona de la sede.
7. Cada caso de uso nuevo lleva su prueba en Vitest con adaptadores en memoria.
8. Ante la duda entre "más funciones" y "flujo A estable", **elige el flujo A estable**.
9. Commits pequeños con mensajes descriptivos; no cambies los contratos (eventos, puertos, esquema) sin avisar al equipo.
10. Un tipo de trámite nuevo se agrega **registrando** su máquina de estados y sus casillas; no se agregan `if (tipo === …)` en el núcleo.
11. Toda notificación iniciada por la empresa respeta: opt-in, horario de silencio en la zona de la sede, límite de envíos y token de un solo uso en los botones.
12. Ningún mensaje al paciente B revela datos del paciente A. El bot nunca interpreta resultados clínicos.
13. Los temporizadores del demo deben poder acelerarse (endpoint o botón "adelantar reloj", solo en modo demo) para mostrar recordatorios y expiraciones en vivo.
