# Proposal

## Why

El relleno de huecos (`PLAN.md` §10.1) es el diferenciador principal de la demo y el Flujo C de §12: Ana cancela en `/app`, aprueba la cancelación con un botón en WhatsApp, Beto recibe en menos de 5 s la oferta del espacio liberado, la acepta, su horario anterior se ofrece al siguiente y `/admin` muestra el hueco recuperado y sus KPI en vivo.

El cambio compartido `contratos-relleno-huecos`, ya en `main` (`d37b8c2`), agrega lo que la web necesita (`wa:mensajes`, sala `wa:<waId>`, `HuecoVista`, `panelHuecos` y las claves de KPI). Hoy el núcleo no tiene tablas, eventos ni casos de uso de huecos, y `CancelarCita` desde `/app` siempre responde `STEP_UP_REQUERIDO`, porque nadie puede entregar el botón de aprobación.

## What Changes

- **Aprobación de la cancelación por WhatsApp.** Cuando un paciente pide `CancelarCita` sin OTP ni botón de aprobación, el núcleo envía al WhatsApp vinculado **al paciente dueño de la cita** un mensaje con dos botones ("Sí, cancelar" y "No, conservarla"), cuyos `payload` son tokens firmados de un solo uso, y responde `STEP_UP_REQUERIDO` con `BOTON_APROBACION`. Al pulsar "Sí, cancelar", la cita se cancela con el factor `BOTON_APROBACION`.
- **Relleno de huecos en el núcleo:**
  - migración `005_huecos` con `interes_adelanto`, `hueco` y `oferta_hueco` de `PLAN.md` §5;
  - los 11 eventos de la familia reservada de `docs/eventos.md` pasan a `EventoDominio` (el catálogo escrito lo actualiza un cambio compartido aparte, D12);
  - agregado de hueco con su máquina (`DETECTADO → OFRECIDO → ASIGNADO | DESIERTO`) y de oferta (`OFRECIDA → ACEPTADA | RECHAZADA | EXPIRADA | PERDIDA`);
  - función pura `candidatoCompatible` de §10.1, incluidos el filtro de anticipación (ayuno o preparación), el límite semanal de ofertas y el horario de silencio en la zona de la sede;
  - estrategias `SECUENCIAL` (más de 24 h, un candidato, 15 min, FIFO) y `OLEADA` (menos de 24 h, de 3 a 5 candidatos, un solo ganador por el índice único de `reserva`);
  - saga de aceptación: apartar el horario nuevo, registrarlo en la agenda externa, confirmar, y solo después liberar el horario anterior de B; si algo falla se compensa y B conserva su cita;
  - transición `adelantar` del tipo `AGENDAR` (`CONFIRMADA → CONFIRMADA`) que emite `CitaAdelantada`, y efecto dominó: el horario anterior de B genera otro hueco.
- **Entrega por WhatsApp:** puerto de salida para mensajes iniciados por la empresa, emitidos como `wa:mensajes` a la sala `wa:<waId>`; al unirse a esa sala se reenvían las ofertas todavía vigentes. `ConversacionWa` reconoce los tokens de aprobación y de oferta en `payloadBoton`.
- **Temporizador `OFERTA`** (BullMQ y memoria) para el vencimiento de 15 min, que también responde al reloj de demo.
- **Consumidor del grupo `huecos`** (ya nombrado en `AGENTS.md` §7) que detecta huecos con `CitaCancelada` y `CitaAdelantada`.
- **Lecturas:** consulta `panelHuecos` (`/api/admin/huecos`) en Postgres y memoria, y las claves de KPI `huecosLiberados`, `huecosRecuperados`, `horasRecursoRecuperadas` y `diasAdelantadosPromedio`.
- **Semilla y reinicio de demo:** cita confirmada de Ana, cita posterior de Beto con interés activo, y una tercera paciente con interés para mostrar el efecto dominó.

### Fuera de alcance

- Registrar el interés desde `/wa` o `/app` ("¿Te aviso si se libera un espacio antes?"): solo semilla.
- La tabla `preferencias_contacto`, la baja con un toque y el canal preferido: el límite y el silencio usan valores fijos (design D7).
- Reprogramar desde `/app`, el OTP como alternativa al botón y los recordatorios (`T48`), que son otro cambio.
- Pantallas (frente B): botón "Cancelar" en `/app`, mensajes salientes en `/wa` y el panel en `/admin`.
- Cualquier cambio a `packages/contracts`: todo lo necesario llega con `contratos-relleno-huecos`.
- `docs/eventos.md`: lo actualiza el cambio compartido que prepara `LuisMaster119` junto con `RiesgoEstimado` y el `## Purpose` de `prediccion-riesgo` (D12).

## Capabilities

### New Capabilities
- `relleno-huecos`: aprobación de la cancelación por WhatsApp, detección de huecos, búsqueda de candidatos, ofertas, saga de aceptación, efecto dominó, panel y KPI.

### Modified Capabilities
Ninguna con requisitos reescritos. `tiempo-real`, `consultas-api` y `temporizadores-tramite` se amplían dentro de los requisitos nuevos de `relleno-huecos` para no duplicarlos.

## Impact

- **Dependencia:** `contratos-relleno-huecos`, ya integrado en `main` `d37b8c2`.
- **Archivos del frente A:** `packages/domain`, `packages/application`, `packages/adapters/{memory,out-postgres,out-redis,in-http,in-events}`, `apps/api` (incluidas `semilla/` y `tiempoReal.ts`) e `infra/migraciones/005_huecos.sql`.
- **Sin archivos compartidos:** basta la autorización del frente A (`J3sus-esb` o `cgac05`).
- **Pruebas:** `tests/unit/dominio.test.ts` pasa de 29 a 40 eventos. Se agregan las pruebas obligatorias de huecos de `AGENTS.md` §9 (filtro de ayuno, un solo ganador en oleada y compensación de la saga).
- **Sin dependencias nuevas.**
- **Privacidad:** los mensajes a B solo llevan servicio, sede, fecha y hora; `HuecoVista` y los payloads de eventos solo llevan IDs. La aprobación nunca se envía a un número que indique quien pide cancelar, sino al vinculado al paciente dueño de la cita.
- **Costo:** cada oferta es una plantilla de pago; `SECUENCIAL` es la estrategia por defecto y `OLEADA` solo aplica a huecos de menos de 24 h.
