# Proposal

## Why

Christian decidió terminar el extra 1 de `PLAN.md` §11 (tablero de administración y check-in en clínica) y dejar los demás para después. El contrato compartido `contratos-clinica-alertas` se integró en `main` `05ccd53`. Agregó `ComprobarIdentidad`, `CerrarAtencion`, `LlegadaVista.posicion` y la consulta `alertasSeguridad` (`/api/admin/alertas`). Los dos frentes acordaron dos decisiones:

- **D2:** avanzar la fila es cerrar una atención. La pantalla cierra al primero por defecto y el núcleo acepta cualquier cita de la fila.
- **D4:** el intento que provoca un bloqueo lleva `bloqueado: true`.

**Revisión 2 (2026-11-25):** Christian descartó la comprobación con INE. No todos tienen INE, y la identidad ya se confirmó al agendar, con teléfono y fecha de nacimiento o con CURP. En clínica basta el QR firmado de un solo uso que ya valida `RegistrarLlegada`. Por eso este cambio ya no implementa `ComprobarIdentidad`. Quitarlo del contrato, de la documentación y de `PLAN.md` §7 y §8 va en el cambio compartido de documentación.

En `main` `e3d49ea`, `CerrarAtencion` responde 404 (`NoEncontrado('operacion')`) y la ruta de alertas no existe. Este cambio del frente A los implementa en el núcleo y la API, para que el frente B pueda conectar sus pantallas.

## What Changes

- **`CerrarAtencion`:** solo recepción en `clinica`. Pasa el trámite a `ATENDIDA` con `AtencionCerrada`, y cada trámite que sube de lugar en la fila registra `TurnoActualizado` con su posición nueva.
- **Fila de la sede:** las llegadas registradas se ordenan por la hora de `PacienteLlego`. `llegadasSede` agrega `posicion`, y `sede:fila` se emite al llegar, al avanzar y al cerrar (con posición 0).
- **Alertas de seguridad:** `GET /api/admin/alertas` lista los `IntentoVerificacionFallido` con `bloqueado` si `intentos >= 3`, sin datos personales, y con adaptadores en memoria y Postgres.
- Se retira la respuesta 404 temporal de `rutasComandos.ts` para `CerrarAtencion`. `ComprobarIdentidad` sigue respondiendo 404 hasta que el cambio compartido lo quite del contrato.

### Fuera de alcance

- `ComprobarIdentidad` y cualquier verificación de identidad en clínica (revisión 2).
- Archivos compartidos: `packages/contracts`, `docs/contratos.md`, `docs/eventos.md`, `AGENTS.md` y `PLAN.md` no cambian. Lo que queda desactualizado se corrige en el cambio compartido de documentación (design D6).
- Las pantallas de `/clinica` y `/admin` (frente B).
- El resto de `PLAN.md` §11 y del tablero de §7.
- Escaneo del QR con cámara e inasistencia por la fila.

## Capabilities

### New Capabilities
- `atencion-clinica`: cierre de atención con avance de la fila, fila de la sede y alertas de seguridad.

### Modified Capabilities
- `tiempo-real`: «Emisión en tiempo real desde los eventos publicados» emite `sede:fila` también con `TurnoActualizado` y `AtencionCerrada`, con la posición real.
- `consultas-api`: «Contenido de cada consulta» agrega `posicion` a `llegadasSede` y la consulta `alertasSeguridad`.

## Impact

- Archivos del frente A:
  - `packages/domain/src/Tramite.ts`: método `actualizarTurno`, sin transiciones nuevas;
  - `packages/application/src/CasosTramite.ts` y los puertos: lectura de la fila y de alertas;
  - `packages/adapters/memory/*` y `packages/adapters/out-postgres/*`;
  - `packages/adapters/in-http/src/{rutasComandos,rutasConsultas}.ts` y `apps/api/src/tiempoReal.ts`, más sus pruebas.
- Sin migraciones ni dependencias nuevas.
- Frente B: puede integrar sus pantallas en modo real cuando este cambio llegue a `main`.
- Orden: este cambio va antes del cambio compartido de documentación, que documenta su estado final y retira `ComprobarIdentidad`.
- Riesgo: el `TurnoActualizado` de cada trámite que avanza se guarda en su propio agregado, después del cierre (design D3).
- Responsable: frente A (`J3sus-esb` y `cgac05`); basta uno.
