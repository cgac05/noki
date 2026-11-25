# Design

## Context

Ver `proposal.md` (Why). Estado actual en `main` `465f944`:

- **Contrato**: `ComandoRequestSchema` (`packages/contracts/src/comandos.ts`) es una unión discriminada por `tipo`. `RUTAS_CONSULTAS` (`consultas.ts`) tiene 10 entradas, y `tests/unit/consultas.test.ts` lo fija con `toHaveLength(10)`. Las lecturas usan `z.object`, que descarta los campos desconocidos.
- **Dominio**, ya existente: eventos `IdentidadComprobada{pacienteId, metodo}` con el método `INE_CLINICA`, `TurnoActualizado{posicion}`, `AtencionCerrada{sedeId}` e `IntentoVerificacionFallido{metodo, intentos}`, y la transición «cerrar atención» de `EN_CLINICA` a `ATENDIDA` (spec `tramite-nucleo`).
- **API**:
  - `packages/adapters/in-http/src/rutasComandos.ts` despacha con un `switch` sobre `comando.tipo`, sin rama por defecto; un tipo nuevo sin `case` rompe la compilación.
  - `rutasConsultas.ts` registra cada consulta por nombre, así que una consulta nueva sin registrar no tiene ruta (404).
  - El servidor ya emite `sede:fila` con la posición cuando ocurre `PacienteLlego` (spec `tiempo-real`).
- **Web**: `LecturasCliente` (`apps/web/src/cliente/consultas.ts`) es un mapa de todas las consultas, y el guion simulado debe dar un valor para cada una.

## Goals / Non-Goals

**Goals:** fijar la forma de los dos comandos, la posición en la fila y la consulta de alertas, de modo que los frentes A y B implementen en paralelo sin romper `main`.

**Non-Goals:** las reglas de negocio (quién puede comprobar identidad, cómo se calcula la fila, qué intentos cuentan como alerta); son del cambio del núcleo del frente A.

## Decisions

### D1. `ComprobarIdentidad` con método explícito
El payload lleva `metodo: z.literal('INE_CLINICA')` y nada más (`strictObject`). Así se pueden sumar métodos después sin cambiar el nombre del comando, y la web no envía datos de la credencial. El número de la INE no viaja; recepción solo confirma que la revisó. Exigir canal `clinica` y actor `recepcion:<id>` es política del núcleo, no del esquema, igual que en los demás comandos.
- Alternativa: un comando `VerificarIne` sin payload. Se descarta porque no deja crecer a otros métodos presenciales.

### D2. «Avanzar la fila» es cerrar la atención
`CerrarAtencion` (payload vacío) cierra la atención de una cita `EN_CLINICA`. El núcleo emite `AtencionCerrada` y recalcula las posiciones de las demás citas de la sede (`TurnoActualizado`), y el servidor reemite `sede:fila`. Recepción avanza la fila cerrando la atención del primero.
- Alternativa: un comando «Llamar siguiente» que mueva la fila sin cerrar la atención. Se descarta porque agrega un estado intermedio que el dominio no tiene.
- **Pendiente de confirmar por el frente A.**

### D3. Posición en la lectura, no solo en el evento
`LlegadaVista.posicion` es opcional y solo es válida con `registrada: true`, con una regla `refine` en el esquema. Así `/clinica` muestra la fila al abrirse, y no solo cuando llega `sede:fila`. Que sea opcional mantiene válidas las respuestas actuales del servidor y del guion.

### D4. Alertas como lectura propia
`AlertaSeguridadSchema` (`z.object`) tiene `id`, `tipo: 'INTENTO_VERIFICACION_FALLIDO'`, `canal`, `ts`, `intentos`, `bloqueado` e `hiloId` nullable. La consulta `alertasSeguridad` (`/api/admin/alertas`, sin parámetros) devuelve como máximo 50, no es de demo y no tiene datos personales ni el método de verificación. `bloqueado` lo calcula el núcleo según su regla de bloqueo, no la web. El tablero la refresca con el `admin:metricas` que ya existe, sin evento nuevo.
- Alternativa: derivar las alertas en la web desde `lineaTiempo`. Se descarta porque solo cubre un hilo y obligaría a la web a interpretar eventos.
- **Pendiente de confirmar por el frente A**: si los bloqueos cuentan como alerta propia o solo como `bloqueado: true` en el intento que lo provocó (esta propuesta).

### D5. Adaptaciones mínimas para no romper `main`
- En `rutasComandos.ts` (frente A), `ComprobarIdentidad` y `CerrarAtencion` lanzan `NoEncontrado('operacion', id)` hasta que el núcleo los implemente. Es el mismo patrón que ya usa `SolicitarContinuacion` sin dependencia.
- `rutasConsultas.ts` no cambia: sin registrar, `/api/admin/alertas` responde 404 hasta el cambio del núcleo.
- En `apps/web/src/cliente/mock/guionFlujoA.ts` (frente B), las lecturas del guion incluyen `alertasSeguridad: []` para que `LecturasCliente` compile.
- `tests/unit/consultas.test.ts` pasa a esperar 11 consultas.

## Risks / Trade-offs

- [Los comandos existen en el contrato, pero la API responde «no disponible»] → La web no debe exponer los botones en modo real hasta el cambio del núcleo. El cambio de pantallas del frente B se integra después.
- [Choque con el cambio de documentación del frente A en `docs/contratos.md` o `AGENTS.md`] → Integrar uno primero y hacer rebase del otro.
- [D2 o D4 no coinciden con lo que el frente A necesita] → Se resuelven en su visto bueno, antes de implementar; si cambian, se actualizan los artefactos y se vuelve a pedir la autorización.

## Migration Plan

Sin migración de datos. Reversión: revertir el commit; los cambios son agregados.
