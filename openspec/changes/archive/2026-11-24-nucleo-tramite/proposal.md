# Proposal

## Why

La base (`base-contratos`, archivada) fijó vocabulario, eventos, errores y contratos, pero el núcleo todavía no tiene comportamiento: no hay transiciones, no se calcula `siguientePregunta`, no existe la política de identidad ni el resolvedor de continuidad. Sin ese núcleo, el Flujo A (Call Center → WhatsApp → App → Clínica, `PLAN.md` §12) no puede retomarse entre canales, que es lo que evalúa el reto. Corresponde a la fase "Dominio + pruebas" (horas 2–6) de `PLAN.md` §11 y a la fila `nucleo-tramite` del frente A en `docs/trabajo-paralelo.md`. Se construye solo con adaptadores en memoria para que el frente A avance sin Postgres, Redis ni la web.

## What Changes

- **Entidad `Tramite`** en `packages/domain`: llenado de casillas en cualquier orden; `BORRADOR`, `COTIZADO` y `LISTO_PARA_RESERVAR` calculados como hitos; transiciones explícitas `HORARIO_RESERVADO → CONFIRMADA → EN_CLINICA → ATENDIDA`, `CANCELADA`, `NO_ASISTIO`, `EXPIRADO` y la vuelta al hito al expirar el hold. Cada operación que cambia el trámite incrementa `version` y agrega eventos a `eventosPendientes()`; las no permitidas lanzan `TransicionInvalida` y las escrituras concurrentes `ConflictoVersion`.
- **Registro de tipos de trámite**: cada tipo aporta casillas, dependencias, orden por canal, pistas de interfaz y tabla de transiciones. Se registra `AGENDAR`; el núcleo no contiene `if (tipo === …)`.
- **`siguientePregunta(tramite, canal)`**: primera casilla vacía con dependencias cumplidas según el orden del canal, con una salida del dominio de la misma forma que `SiguientePregunta` de `@noki/contracts` (incluida la pista de interfaz). La coherencia con el contrato se prueba en `in-http`.
- **Política de identidad por acción** (`PLAN.md` §8) como un solo objeto del dominio que lanza `StepUpRequerido{nivel, factores}`.
- **Resolvedor de continuidad** (`PLAN.md` §8) con sus cinco prioridades, sin revelar nada ante ambigüedad y con bloqueo temporal al tercer intento fallido (`IntentoVerificacionFallido`).
- **Entidad `HiloAtencion`** mínima (último canal y `CanalCambiado`).
- **Puertos** en `packages/application/src/ports/` con adaptador en `packages/adapters/memory`: repositorio de trámites (con control de versión y registro de eventos guardados), repositorio de hilos, contactos y vínculos, verificación de tokens de un solo uso (sin criptografía), pacientes (datos para elegibilidad y comprobaciones sin exponerlos), catálogo (oferta por sede, precio y perfil), agenda (apartar, confirmar y liberar horario) y registro de intentos de verificación.
- **Casos de uso mínimos del Flujo A** en `packages/application`: iniciar trámite, seleccionar servicio, seleccionar sede, asignar paciente, cumplir requisito, reconocer advertencia de elegibilidad, reservar horario, confirmar cita, retomar trámite (continuidad), registrar llegada y cancelar cita.
- **Pruebas** Vitest con adaptadores en memoria y `RelojFalso`, incluidas las obligatorias de `AGENTS.md` §9: continuidad Call Center → WhatsApp en la casilla correcta y `siguientePregunta` respetando dependencias y orden por canal.

Fuera de alcance: Postgres (event store, outbox, reservas con índice único), Redis Streams, BullMQ y temporizadores, HTTP (`POST /api/comandos`, endpoint de WhatsApp, traducción de errores en rutas), Socket.IO, criptografía real de tokens (jose), envío de OTP y verificación de PIN con argon2, relleno de huecos, recordatorios, reprogramar, clonar un trámite `EXPIRADO`, idempotencia por `Idempotency-Key` (llega con la API), opciones de catálogo dentro de la pista (las agrega el adaptador del canal), tipos `ADELANTO` y `FACTURA`, y cualquier archivo de `apps/web`.

## Capabilities

### New Capabilities
- `tramite-nucleo`: entidad `Tramite`, hitos y transiciones, versión y eventos pendientes, registro de tipos con `AGENDAR`, entidad `HiloAtencion` y los casos de uso mínimos del Flujo A con sus puertos en memoria.
- `siguiente-pregunta`: cálculo de la siguiente casilla según dependencias y orden por canal, con pista de interfaz coherente con el contrato.
- `politica-identidad`: requisitos de verificación por acción de `PLAN.md` §8 en un solo objeto que lanza `StepUpRequerido`.
- `continuidad-canales`: resolvedor de continuidad con cinco prioridades, no exposición ante ambigüedad, límite de intentos y reanudación en el canal nuevo.

### Modified Capabilities
_Ninguna_. `contratos-canales` y `arquitectura-hexagonal` se respetan sin cambiar sus requisitos.

## Impact

- Archivos del frente A únicamente: `packages/domain/src/**`, `packages/application/src/**`, `packages/adapters/memory/src/**`, una prueba de coherencia nueva en `packages/adapters/in-http/test/` y pruebas nuevas en `tests/unit/nucleo/` (incluidas por la configuración de Vitest existente, sin modificarla).
- **No** se modifican archivos compartidos (`packages/contracts`, `docs/contratos.md`, `docs/eventos.md`, `AGENTS.md`, `PLAN.md`, configuración raíz) ni `apps/web`. El vocabulario existente (estados, casillas, eventos y errores) alcanza; ver design D3 y D9. Si durante la implementación hiciera falta un evento, un código de error o un cambio de contrato, se detiene la parte afectada y se propone un cambio compartido aparte con la autorización de ambos responsables.
- Sin dependencias nuevas. `packages/domain` sigue sin `dependencies`; `application` solo depende de `domain`.
- Dependencia para cambios posteriores: `persistencia-eventos` implementará con Postgres los mismos puertos y la semántica de versión y eventos guardados; `api-comandos` traducirá comandos y errores y publicará los nombres de factores de step-up si el frente B los necesita en el contrato.
- Riesgo: apartar exige `LISTO_PARA_RESERVAR` como dice `PLAN.md` §6 (design D2), pero el orden de WhatsApp puede preguntar el horario antes que el paciente. El núcleo responde `CASILLAS_PENDIENTES` con lo que falta y el canal debe pedirlo; en el Flujo A el asesor deja el trámite listo antes de pasar a WhatsApp.
- Riesgo: el contrato no define nombres de factores de step-up; quedan como cadenas documentadas en el dominio hasta `api-comandos`.
- Responsable: frente A, `J3sus-esb`. La implementación solo procede con su autorización registrada en `handoff.md`.
