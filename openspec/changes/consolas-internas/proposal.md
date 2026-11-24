# Proposal

## Why

Las consolas internas (`/callcenter`, `/clinica`, `/admin`) del esqueleto funcionan solo con el guion simulado. No usan lo que `contratos-flujo-a` agregó para el Flujo A real (`PLAN.md` §12): el ANI en `IniciarTramite`, el comando `SolicitarContinuacion`, la unión a salas de Socket.IO y `contextoDemo` para saber qué hilo, paciente y sede mostrar. Esa propuesta dejó explícitamente su adopción al frente B. Sin esto, la integración conjunta (`VITE_API=real`, `docs/trabajo-paralelo.md`, horas 14–18) no puede recorrer el guion de punta a punta ni mostrar los cambios en vivo.

## What Changes

- **Call center**: "Llamada entrante" pide el número de la llamada (ANI), con el de la paciente de demo como valor inicial, y lo envía como `contacto` en `IniciarTramite`. "Continuar por WhatsApp" pide al asesor confirmar que el paciente aceptó continuar por WhatsApp, envía `SolicitarContinuacion` una sola vez y muestra el enlace y el QR cuando la ficha trae el código. La ficha tolera nombre y teléfono nulos, y en solo lectura deshabilita toda operación.
- **Clínica**: llegadas esperadas de la sede del contexto, registro de llegada con el token de la cita y actualización en vivo por la sala de la sede. Si aún no hay contexto, lo explica y ofrece volver a consultarlo.
- **Administración**: trámites por estado, KPIs con nombres legibles para las claves documentadas en `docs/contratos.md` (las desconocidas se muestran con su clave), línea de tiempo del hilo con el canal de cada evento y actualización en vivo por la sala `admin`.
- **Cliente, tiempo real**: el cliente real se conecta por Socket.IO, se une y sale de salas validadas con `SalaSchema` (`sala:unirse` / `sala:salir`), vuelve a unirse al reconectar y valida cada evento con su esquema. Las vistas lo usan mediante el cliente, nunca con el socket directo. En modo simulado la unión no hace nada.
- **Cliente, contexto en modo real**: `hiloId`, `pacienteId` y `sedeId` salen de la última respuesta de comando o, si no la hay, de la consulta `contextoDemo`. Aplica también a `/app`, que queda lista para `VITE_API=real`.
- **Guion simulado**: la llamada incluye el ANI de demo y se agrega el paso "Continuación solicitada" (`SolicitarContinuacion`); el código de continuación aparece solo después de ese paso, igual que en modo real.
- **Dependencia nueva** en `apps/web`: `socket.io-client` con versión exacta, alineada con la major del servidor que use `api-comandos`.

### Fuera de alcance

- La parte de identidad del asesor (paso opcional en la ficha). Se agrega con `/opsx:update` cuando `identidad-paciente` llegue a `main`.
- Lo de `PLAN.md` §9 que el contrato aún no cubre: cola de devoluciones de llamada, facturas rechazadas, "INE verificada" (`IdentidadComprobada`), avanzar la fila (`TurnoActualizado`), alertas de seguridad, cola de fallidos, embudo de abandono, panel de huecos y recordatorios.
- Escanear el QR con la cámara; la recepción registra la llegada desde la lista de llegadas esperadas.
- Sesiones o autenticación por rol, el servidor de Socket.IO y cualquier cambio en `packages/contracts` o en archivos compartidos.

## Capabilities

### New Capabilities
- `consolas-internas`: comportamiento de las consolas del asesor, de recepción y de administración: llamada con ANI, ficha del hilo, continuación por WhatsApp con consentimiento, registro de llegadas, tablero y actualización en vivo por sala.

### Modified Capabilities
- `cliente-api-canales`: requisitos nuevos de tiempo real con salas y de contexto de consulta en modo real; "Guion simulado del Flujo A" incorpora el ANI y la continuación solicitada.
- `navegacion-canales`: "Contenido mínimo por vista" remite `/callcenter`, `/clinica` y `/admin` a `consolas-internas`, y su escenario del enlace de continuación pasa a depender de `SolicitarContinuacion`.

## Impact

- Archivos del frente B: `apps/web/src/vistas/{CallCenter,Clinica,Admin,App}.tsx`, `apps/web/src/cliente/**` (interfaz, cliente real y simulado, proveedor, guion), componentes nuevos o ajustados en `apps/web/src/componentes/`, pruebas y `apps/web/README.md`.
- `apps/web/package.json` y `pnpm-lock.yaml` por `socket.io-client`. Según `docs/trabajo-paralelo.md`, se hace rebase sobre `main` y `pnpm install` justo antes de integrar.
- Sin cambios en `packages/contracts` ni en archivos compartidos.
- Dependencias externas: el recorrido real de punta a punta depende de `api-comandos` (frente A: endpoints, `contextoDemo` con `DEMO_MODE=true` y servidor de Socket.IO). Hasta entonces el modo real se prueba con un servidor falso y queda como control bloqueado.
- Riesgos:
  - La major de `socket.io-client` puede no coincidir con la del servidor. Se fija la 4.x y se confirma con el frente A antes de integrar.
  - `contextoDemo` solo existe con `DEMO_MODE=true`. Sin él, las vistas en modo real muestran el estado "sin contexto" en lugar de fallar.
- Responsable: frente B, `LuisMaster119`.
