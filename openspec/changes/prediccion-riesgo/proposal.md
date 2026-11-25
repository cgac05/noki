# Proposal

## Why

Christian quiere un módulo que estime el riesgo de inasistencia de cada cita confirmada. Con esa estimación, el cerebro ajustaría los recordatorios de `PLAN.md` §10.2 según el riesgo: más insistencia y más facilidad para reprogramar a quien probablemente no llegará. Así se adelantan las cancelaciones que alimentan el relleno de huecos (§10.1), en lugar de terminar en inasistencias. El jurado premia "innovación e impacto operativo" (§1), y `AGENTS.md` §13 exige que el núcleo siga siendo determinista: el modelo es un apoyo detrás de un puerto, con un respaldo por reglas.

El módulo tiene siete etapas (T0–T6). Este cambio cubre solo **T0–T2**: el entrenamiento, el dominio, la aplicación y el adaptador del modelo. **Revisión 3:** `RiesgoEstimado` ya no entra al catálogo de eventos en este cambio. En T0–T2 el caso de uso devuelve la estimación sin registrar ningún evento; el evento entra en T3, cuando realmente se publica. Así T0–T2 queda en archivos nuevos, más las exportaciones de tres `index.ts` y una línea de `.dependency-cruiser.cjs`.

**Prioridad (decisión de Christian, 2026-11-25):** este cambio va después de `idempotencia-wa` (ya en `main` `44c57f4`) y antes de los extras pendientes de §11: relleno de huecos (§10.1) y recordatorios (§10.2). T0–T2 no depende de ninguno de los dos. Las funciones del plan de recordatorios quedan listas para que el cambio de recordatorios solo las llame (T5–T6).

## What Changes

- **T0, `ml/`:** datos sintéticos de citas con semilla fija, entrenamiento de una regresión logística en TypeScript sin dependencias nuevas, métricas en un conjunto de validación y exportación del modelo a un JSON versionado en el adaptador `out-modelo`.
- **T1, dominio y aplicación (`prediccion/`):**
  - en `packages/domain/src/prediccion/`: factores de riesgo sin datos personales, su vector numérico, `nivelDesde` (BAJO, MEDIO, ALTO) y la estimación por reglas que sirve de respaldo;
  - en `packages/application/src/ports/prediccion.ts`: los puertos `ModeloRiesgo`, `LecturasPrediccion` (historial de asistencia del paciente y zona horaria de la sede) y `CalendarioSede` (conversión entre UTC y la hora local de la sede);
  - en `packages/application/src/prediccion/`: el caso de uso `EstimarRiesgoInasistencia`, que devuelve un `RiesgoEstimado` sin guardar el trámite ni registrar eventos;
  - adaptadores en memoria nuevos de los tres puertos.
- **T2, adaptador y plan:**
  - adaptador nuevo `packages/adapters/out-modelo`: carga y valida el JSON del modelo, calcula la probabilidad e implementa `CalendarioSede` con `date-fns-tz`;
  - `planPorNivel` y `varianteDesde` en el dominio, y `horaEnvio` en la aplicación, listas para el cambio de recordatorios.

**Revisión 4 (2026-11-25, por las pausas de Codex ante `AGENTS.md`):**
- los puertos van en `application/src/ports/` (§5.4);
- el dominio ya no convierte zonas horarias: lo hace el puerto `CalendarioSede`, fuera del dominio (§6), con entradas y salidas en UTC;
- `LecturasPrediccion` queda con solo su adaptador en memoria hasta T3, como excepción temporal a §5.4 (design D13).
- **Ediciones de una línea:** exportar lo nuevo en `packages/domain/src/index.ts`, `packages/application/src/index.ts` y `packages/adapters/memory/src/index.ts`, y agregar `'out-modelo'` a la lista `adaptadores` de `.dependency-cruiser.cjs` (línea 1).

### Fuera de alcance

- **T3:** el evento `RiesgoEstimado` en `EVENTOS_DOMINIO` y `docs/eventos.md` (compartido), el consumidor que estima al confirmar, la versión Postgres de `LecturasPrediccion` y su conexión en `apps/api/src/main.ts` (frente A, sin proceso aparte). Va en un cambio posterior. La fila en la línea de tiempo de `/callcenter` y `/admin` ya está aceptada por el frente B sin cambios en la web.
- **T4:** esquema en `packages/contracts` (cambio compartido), ruta en la API, e insignia y lista de riesgo en `apps/web` (frente B). Se coordina al llegar.
- **T5–T6:** aplicar el plan a los recordatorios reales. Espera al cambio de recordatorios de §10.2. La devolución de llamada del nivel alto se pospone; mientras tanto el nivel alto queda solo con `REFUERZO`.
- Migraciones, cambios de vocabulario, contratos, `docs/`, `apps/api` y `apps/web`.
- Datos reales de pacientes. El modelo se entrena solo con datos sintéticos y se presenta como demostrativo.

## Capabilities

### New Capabilities
- `prediccion-riesgo`: estimación del riesgo de inasistencia de una cita confirmada, con modelo versionado, respaldo determinista y plan de recordatorios por nivel.

### Modified Capabilities
- Ninguna. «Los adaptadores no se importan entre sí» de `arquitectura-hexagonal` ya cubre a todo adaptador; la línea de `.dependency-cruiser.cjs` hace que `pnpm lint:deps` lo compruebe también en `out-modelo`.

## Impact

- Archivos nuevos:
  - `ml/`;
  - `packages/domain/src/prediccion/`, `packages/application/src/prediccion/`;
  - `packages/adapters/out-modelo/` (manifiesto, código y modelo JSON);
  - adaptadores en memoria nuevos en `packages/adapters/memory/src/`;
  - pruebas en `tests/unit/prediccion/`.
- Ediciones de una línea: los tres `index.ts` (frente A) y `.dependency-cruiser.cjs` (compartido).
- `pnpm-lock.yaml` solo agrega el importador del paquete nuevo, sin dependencias externas nuevas (`zod` ya está en el workspace).
- Sin cambios de comportamiento en el Flujo A: nada existente llama al módulo hasta T3. La prueba que cuenta 29 eventos sigue igual.
- **Cambio compartido** por la línea de `.dependency-cruiser.cjs` (`docs/trabajo-paralelo.md`): requiere el visto bueno de un responsable de cada frente. Lo implementa el frente A.
- Riesgo: un modelo entrenado con datos sintéticos solo demuestra el mecanismo, no predice a pacientes reales (design D2).
