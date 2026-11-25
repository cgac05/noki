# Design

## Context

Ver `proposal.md` (Why). Estado en `main` `e3d49ea`:

- **Dominio:**
  - `Tramite.registrarLlegada` y `cerrarAtencion` ya existen (`CONFIRMADA → EN_CLINICA → ATENDIDA`, eventos `PacienteLlego` y `AtencionCerrada { sedeId }`).
  - `TurnoActualizado { posicion }` e `IdentidadComprobada { pacienteId, metodo }` están en el vocabulario, pero ningún método los registra fuera de la identificación.
  - `MetodoVinculo` incluye `INE_CLINICA`.
- **Aplicación:** `CasosTramite.registrarLlegada` exige canal `clinica` y actor `recepcion:` y lanza `TOKEN_INVALIDO` en otro caso. `CasosTramite` no tiene acceso a `LecturasPort`.
- **Persistencia:** la clave de idempotencia de `evento` tiene que ser un UUID con sufijo `:n` opcional (`002_persistencia`).
- **API:**
  - `rutasComandos.traducir` responde `NoEncontrado('operacion')` a los dos comandos.
  - `rutasConsultas` no registra `alertasSeguridad`.
  - `tiempoReal.ts` emite `sede:fila` solo en `PacienteLlego`, con la cantidad de citas `EN_CLINICA` del día como posición, que no coincide con el orden de llegada.
- **Lecturas:** `llegadasSede` existe en memoria y en Postgres. Los `IntentoVerificacionFallido` se guardan con y sin trámite: en memoria se juntan en `eventos()`, en Postgres van en la tabla `evento`.

## Goals / Non-Goals

**Goals:** `CerrarAtencion` funcional, posición real en la fila y alertas de seguridad, con paridad entre memoria y Postgres.

**Non-Goals:** cambiar contratos, eventos o vocabulario de errores; pantallas; huecos o recordatorios.

## Decisions

### D1. El permiso de recepción es una regla del caso de uso
`CasosTramite.cerrarAtencion` exige `canal === 'clinica'` y `actor` que empiece con `recepcion:`, y falla con `ReglaViolada('SOLO_RECEPCION')`. Las reglas son texto libre dentro de `REGLA_VIOLADA`, así que no cambia el contrato de errores.

*Alternativa descartada:* agregar acciones a `PoliticaIdentidad`. Esa política mide el nivel y los factores del paciente, no el rol del personal. `AsignarPaciente` ya usa una regla del caso de uso (`ASIGNACION_SOLO_PERSONAL`).

### D2. Sin comprobación de identidad en clínica (revisión 2)
La revisión 1 implementaba `ComprobarIdentidad` con `INE_CLINICA`. Christian la descartó el 2026-11-25: no todos tienen INE, y la identidad ya se confirmó al agendar (teléfono y fecha de nacimiento, o CURP). En clínica basta el QR firmado de un solo uso que valida `RegistrarLlegada`. `rutasComandos.ts` conserva la respuesta 404 de `ComprobarIdentidad` porque el comando sigue en el contrato; el cambio compartido de documentación lo quita del contrato y de esa rama. `MetodoVinculo` conserva `INE_CLINICA` (vocabulario de dominio, sin uso) para no tocar `docs/eventos.md` en este cambio.

### D3. Fila calculada y `TurnoActualizado` en cada agregado
La fila se obtiene con un método nuevo del repositorio de trámites, `filaSede(sedeId, ts)`, implementado en memoria y en Postgres. Devuelve los ids `EN_CLINICA` del mismo conjunto que `llegadasSede` (inicio desde el comienzo del día en la zona de la sede), ordenados por el `ts` de `PacienteLlego` y por id. `LecturasPort.llegadasSede` usa el mismo criterio para dar `posicion`.

`CasosTramite.cerrarAtencion`:

1. Lee la fila antes de cerrar.
2. Cierra y guarda el trámite.
3. Para cada trámite posterior de la fila, lo carga, llama a `Tramite.actualizarTurno(posicionNueva, contexto)` y lo guarda.
   - Usa un contexto con `idempotencyKey` nueva (`ids.nuevo()`), el mismo `correlationId`, `actor` y `canal`.
   - `actualizarTurno` exige `EN_CLINICA` y no anota nada si la posición no cambia.
   - Si guardar uno falla, se registra con `registrarError` (`codigo: 'TURNO_NO_ACTUALIZADO'`, `correlation_id`) y se sigue con los demás.

Un reintento del comando con la misma `Idempotency-Key` devuelve la respuesta guardada por la capa HTTP y no recalcula la fila.

*Alternativa descartada:* escribir todos los agregados en una transacción. Rompe la regla de un agregado por operación y la partición de eventos.

*Alternativa descartada:* que un consumidor de `AtencionCerrada` emita los `TurnoActualizado`. Es más robusto, pero agrega un grupo de consumidores y su prueba de integración para la demo. Si la carrera aparece en la práctica, se puede migrar sin cambiar los specs.

### D4. `sede:fila` con la posición real
`tiempoReal.ts` resuelve la sede con `lecturas.tramite(evento.tramiteId)` porque `TurnoActualizado` no la lleva, y emite:

- `PacienteLlego`: la posición del trámite en `llegadasSede`;
- `TurnoActualizado`: su `payload.posicion`;
- `AtencionCerrada`: posición 0.

El esquema del socket (entero no negativo) ya lo permite.

### D5. Alertas como lectura de eventos
`LecturasPort.alertasSeguridad()` filtra `IntentoVerificacionFallido` de todos los eventos (con y sin trámite), ordena por `ts` e id descendentes y corta en 50. Mapea a `{ id, tipo, canal, ts, intentos, bloqueado: intentos >= 3, hiloId }`. En Postgres es una consulta a `evento` con `LIMIT 50`. La ruta la registra `rutasConsultas` y valida con `RUTAS_CONSULTAS.alertasSeguridad.respuesta`.

### D6. Lo compartido queda para el cambio de documentación
Van al cambio compartido de documentación, que se integra **después** de este, porque son archivos compartidos y necesitarían el visto bueno del frente B:

- quitar `ComprobarIdentidad` del contrato, de `rutasComandos.ts`, de `docs/contratos.md`, de `AGENTS.md` §7 y la mención a la INE de `PLAN.md` §7 y §8;
- la sugerencia H-01 de `contratos-clinica-alertas` (`metodo?: 'GET'` en una sola entrada);
- las notas de `docs/contratos.md` y `AGENTS.md` §7 de que la ruta de alertas responde 404.

## Risks / Trade-offs

- **Fallo parcial al avanzar la fila:** falta un `TurnoActualizado` en la línea de tiempo, pero la posición de `llegadasSede` y de `sede:fila` sigue siendo correcta.
- **Concurrencia:** dos cierres simultáneos en la misma sede pueden calcular posiciones intermedias. Cada `TurnoActualizado` se guarda con la versión del agregado (`ConflictoVersion`) y la lectura final es correcta. Se acepta para la demo.
- **Documentación compartida desactualizada** hasta que se integre el cambio de documentación (D6).
