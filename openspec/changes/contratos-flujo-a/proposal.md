# Proposal

## Why

Al preparar `api-comandos` (frente A) se comprobó que el contrato compartido vigente no alcanza para operar el Flujo A real de `PLAN.md` §12 (call center → WhatsApp → App → clínica): el call center no puede indicar el ANI al iniciar ni pedir "Continuar por WhatsApp", la ficha exige nombre y teléfono aunque el hilo aún no los tenga, el canal no ve la reserva que `ConfirmarCita` exige, no hay código para errores internos, un cliente de Socket.IO no puede unirse a una sala y `/app` no tiene de dónde sacar `pacienteId` en modo real (H-02 de la revisión de `contratos-consultas`). Como el contrato de la API quedó congelado en la hora 10 (`docs/trabajo-paralelo.md`, puntos de sincronización), estos ajustes van en un cambio compartido pequeño con el visto bueno de ambos frentes.

## What Changes

Todas las adiciones son compatibles hacia atrás salvo donde se indica:

- **`IniciarTramite`**: `payload.contacto?`, el número del ANI o del canal (10 a 15 dígitos). Es dato de entrada; nunca se devuelve en lecturas.
- **Comando nuevo `SolicitarContinuacion`**: `{ canal, actor, tipo: 'SolicitarContinuacion', tramiteId, payload: { destino: 'whatsapp' } }`. Registra el consentimiento de contacto por WhatsApp y genera el código de continuación que la ficha muestra en `codigoContinuacion` (`PLAN.md` §9, `/callcenter`).
- **`TramiteVista.horario?`**: `{ reservaId, inicio, expiraEn }` cuando el trámite tiene una reserva, para que el canal arme `ConfirmarCita`.
- **`FichaHilo`**: `nombrePila` y `telefonoEnmascarado` admiten `null` (hilo sin paciente vinculado o sin teléfono). Cambio de tipo: las vistas deben tolerar `null`.
- **Código de error `INTERNO`** (HTTP 500) en `CodigoErrorSchema`, con mensaje genérico.
- **Unión a salas de Socket.IO**: eventos del cliente `sala:unirse` y `sala:salir` con una `Sala` válida según `SalaSchema`, en una constante `EVENTOS_CLIENTE_SOCKET`.
- **Consulta solo de demo `contextoDemo`**: `GET /api/demo/contexto` → `{ hiloId, pacienteId, sedeId }` (todos nullables) del último hilo con cita confirmada, marcada `soloDemo`. Es la fuente provisional de `pacienteId` en `/app` hasta el cambio de seguridad (token de contexto por enlace mágico).
- **Documentación**: `docs/contratos.md` (lo anterior y las claves de `metricas.kpis` definidas en `api-comandos`) y `AGENTS.md` §7 (comando nuevo, unión a salas y la consulta de demo).
- **Web**: solo lo necesario para que las pruebas de `apps/web` sigan en verde con el contrato nuevo (datos simulados de `contextoDemo`, tipos que aceptan `null` en la ficha). Usar los campos nuevos en las vistas (ANI, botón real de continuar, unión a salas, `/app` en modo real) es trabajo del frente B en su propio cambio.

Fuera de alcance: el lado del servidor (grupo 7 de `api-comandos`), cambios de UI, sesiones y autenticación de consultas, `/api/admin/embudo` y `/api/admin/huecos`, `docs/eventos.md` (cambio compartido aparte).

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `contratos-canales`: "Comando y respuesta comunes a todos los canales" (contacto, `SolicitarContinuacion`, horario en la vista), "Tiempo real con nombres compartidos" (eventos del cliente para salas) y "Errores de dominio traducidos a HTTP" (`INTERNO`).
- `contratos-consultas`: "Lecturas sin datos sensibles" (nombre y teléfono nulos en la ficha) y "Tabla de rutas de consulta" (`contextoDemo`).

## Impact

- Archivos compartidos: `packages/contracts/src/{comandos.ts,consultas.ts,vocabulario.ts,tiempoReal.ts,index.ts}`, `tests/unit/{contratos,consultas}.test.ts`, `docs/contratos.md`, `AGENTS.md` §7. Archivos del frente B: `apps/web/src/cliente/**` y las vistas que lean `nombrePila` o `telefonoEnmascarado`, solo para conservar las pruebas en verde. Archivo del frente A: `packages/adapters/in-http/src/mapeoErroresHttp.ts` (`INTERNO` → 500) y su prueba de coherencia.
- Sin dependencias nuevas; `contracts` sigue dependiendo solo de `zod`.
- Lo consume `api-comandos` (grupo 7). Después, el frente B adopta los campos en sus vistas.
- Riesgo: hacer `nombrePila` y `telefonoEnmascarado` nullables obliga a revisar las vistas que los muestran; es pequeño y lo detectan las pruebas de tipos.
- Responsable: cambio compartido. Requiere el visto bueno de un responsable de cada frente: `J3sus-esb` o Christian Avila (`cgac05`) por el frente A y `LuisMaster119` por el frente B. Propuesta: lo implementa el frente A (lo necesita primero), incluido el ajuste mínimo de `apps/web`, que el visto bueno del frente B debe cubrir expresamente.
