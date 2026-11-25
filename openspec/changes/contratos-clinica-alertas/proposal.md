# Proposal

## Why

El primer extra de `PLAN.md` §11 es el tablero de administración y el check-in en clínica. En la exploración del 2026-11-24, `LuisMaster119` eligió para empezar el alcance «clínica y alertas»:

- recepción marca «INE verificada»;
- recepción avanza la fila con la posición en vivo;
- el tablero muestra las alertas de seguridad.

El dominio ya tiene lo necesario: `IdentidadComprobada` con método `INE_CLINICA`, la transición `EN_CLINICA → ATENDIDA` con `AtencionCerrada`, `TurnoActualizado` e `IntentoVerificacionFallido`. Lo que falta es el contrato compartido: no hay comandos para comprobar la identidad ni para cerrar la atención, `LlegadaVista` no trae la posición en la fila, y no hay consulta de alertas. Según `docs/trabajo-paralelo.md`, el contrato se cambia en un cambio propio con el visto bueno de ambos frentes.

## What Changes

Todo es agregado y compatible hacia atrás:

- **Comando `ComprobarIdentidad`**: `{ canal, actor, tipo: 'ComprobarIdentidad', tramiteId, payload: { metodo: 'INE_CLINICA' } }`. Recepción confirma que revisó la INE del paciente de la cita (`PLAN.md` §8 y §9, `/clinica`).
- **Comando `CerrarAtencion`**: `{ canal, actor, tipo: 'CerrarAtencion', tramiteId, payload: {} }`. Pasa la cita de `EN_CLINICA` a `ATENDIDA`; «avanzar la fila» es cerrar la atención de quien está primero.
- **`LlegadaVista.posicion`**: opcional, entero de 1 en adelante, solo cuando la llegada está registrada. Es la posición en la fila de la sede.
- **Modelo `AlertaSeguridad` y consulta `alertasSeguridad`** (`GET /api/admin/alertas`): lista de intentos de verificación fallidos con `id`, `tipo`, `canal`, `ts`, `intentos`, `bloqueado` e `hiloId` (o `null`), sin datos personales.
- **Documentación compartida**: `docs/contratos.md` y `AGENTS.md` §7.
- **Adaptaciones mínimas para no romper compilación ni pruebas** (detalle en `design.md`, D5):
  - en `packages/adapters/in-http/src/rutasComandos.ts` (frente A), los dos comandos responden «operación no disponible» hasta que el núcleo los implemente;
  - en `apps/web/src/cliente/mock/guionFlujoA.ts` (frente B), el guion simulado devuelve `alertasSeguridad: []`.

### Fuera de alcance

- La lógica del núcleo y de la API para los comandos y la consulta (reglas, transiciones, nivel de vínculo, posición en la fila, contenido de las alertas). La implementa el frente A en su propio cambio.
- Las pantallas de `/clinica` y `/admin`. Las implementa el frente B en su propio cambio.
- El resto de `PLAN.md` §9 para `/admin`: selector de hilos, cola de fallidos, embudo, panel de huecos y los demás KPIs.
- El botón «adelantar reloj» de `/admin`, que va en el cambio compartido de documentación que propuso el frente A.
- Escanear el QR con cámara.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `contratos-canales`: «Comando y respuesta comunes a todos los canales» agrega `ComprobarIdentidad` y `CerrarAtencion`.
- `contratos-consultas`: «Modelos de lectura compartidos» agrega `AlertaSeguridad` y la posición en `LlegadaVista`; «Tabla de rutas de consulta» agrega `alertasSeguridad`.

## Impact

- Archivos compartidos: `packages/contracts/src/{comandos.ts,consultas.ts,index.ts}`, `tests/unit/{contratos,consultas}.test.ts`, `docs/contratos.md` y `AGENTS.md` §7.
- Archivo del frente A: `packages/adapters/in-http/src/rutasComandos.ts`, solo la adaptación de D5.
- Archivo del frente B: `apps/web/src/cliente/mock/guionFlujoA.ts`, solo la lectura vacía de D5.
- Sin dependencias nuevas; `contracts` sigue dependiendo solo de `zod`.
- Después lo consumen el cambio del núcleo y la API (frente A) y el de las pantallas de clínica y administración (frente B).
- Riesgo: hasta que el frente A implemente su parte, los comandos responden «no disponible» y la consulta de alertas no tiene ruta (404). Las vistas del frente B no deben integrarse antes de eso.
- Coordinación: el cambio compartido de documentación del frente A (botón «adelantar reloj») toca `docs/` y puede tocar `AGENTS.md`. Conviene integrar uno y hacer rebase del otro, o juntarlos si el frente A lo prefiere.
- Responsable: cambio compartido. Requiere el visto bueno de un responsable de cada frente: `J3sus-esb` o `cgac05` por el frente A y `LuisMaster119` por el frente B. Propuesta: lo implementa el frente A (lo necesita primero para su núcleo), incluida la lectura vacía en `apps/web`, que el visto bueno del frente B debe cubrir expresamente.
