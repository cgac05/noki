# Revisión: prediccion-riesgo

- Dictamen: PASS
- Revisión inspeccionada: implementación de la revisión 4 autorizada en `handoff.md`, en el árbol de trabajo de la rama local `claude/project-thread-ihe6sx` sobre `main` `44c57f4`, sin commits (primera vuelta, 2026-11-25).
- Cobertura:
  - los ocho requisitos de `specs/prediccion-riesgo/spec.md`, las decisiones D1–D13 y las tareas 1.1–5.2;
  - todo el código nuevo: `ml/`, `packages/domain/src/prediccion/`, `packages/application/src/ports/prediccion.ts`, `packages/application/src/prediccion/`, `packages/adapters/out-modelo/`, los tres adaptadores en memoria nuevos y `tests/unit/prediccion/`;
  - el diff de los cinco archivos existentes.
- Evidencia comprobada independientemente:
  - Diff de archivos existentes: `.dependency-cruiser.cjs` cambia solo la línea 1 (`'out-modelo'` al final de `adaptadores`); los tres `index.ts` agregan solo 3 líneas `export` cada uno; `pnpm-lock.yaml` agrega solo el importador `packages/adapters/out-modelo` con `zod` 4.1.13 y `date-fns-tz` 3.2.0, versiones ya presentes. Sin cambios en `EVENTOS_DOMINIO`, `docs/`, `packages/contracts`, `apps/` ni `infra/`.
  - `corepack pnpm lint`: código 0.
  - `corepack pnpm lint:deps`: sin violaciones (231 módulos, 700 dependencias).
  - `corepack pnpm test`: 67 archivos, 389 pruebas en verde, incluida la de 29 eventos.
  - Integración con Postgres de prueba en 55432 y Redis (`node --import tsx tests/integracion/ejecutar.ts`): 17 archivos, 47 pruebas en verde.
  - Entrenamiento repetido (`node --import tsx ml/entrenar.ts`): el modelo y `ml/metricas.json` quedan con el mismo SHA-256 que los entregados. Métricas: AUC 0.812 del modelo contra 0.696 de las reglas; Brier 0.131 contra 0.157; `sinteticos: true`.
  - Lectura del código:
    - el dominio no convierte zonas ni usa `Intl`; recibe hora y día locales;
    - los puertos están en `application/src/ports/`;
    - `EstimarRiesgoInasistencia` no guarda ni registra eventos; el respaldo por reglas cubre errores y `NaN` y registra solo `correlation_id` y código;
    - los factores no incluyen datos personales;
    - `out-modelo` valida forma, orden de factores, largo, finitud y desviaciones positivas.
  - Evidencia de Codex consultada, no repetida: `evidencias/aislamiento.txt` muestra el fallo esperado `adaptador-aislado-out-modelo`, y el archivo temporal ya no existe en el árbol.
- Controles no ejecutados: prueba manual del demo, NO APLICA (nada conecta el módulo a la API hasta T3).

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | SUGGESTION | PR «Estimar el riesgo de una cita confirmada» | `EstimarRiesgoInasistencia.ts`: el nivel se calcula con la probabilidad completa y la respuesta la redondea; 0.195 se mostraría como 0.2 con nivel `BAJO`, aunque `nivelDesde(0.20)` es `MEDIO` | Cumple el spec tal como está. Decidir en T3, al definir el payload del evento, si se muestra la probabilidad o solo el nivel |
| H-02 | SUGGESTION | D12 | `CalendarioSedeDateFns` y `CalendarioSedeMemoria` tienen el mismo código | Aceptable por D12 (misma biblioteca para resultados iguales); se puede simplificar en T3 |
| H-03 | SUGGESTION | 1.3, 3.1, 3.2 | Las líneas nuevas de los tres `index.ts` usan CRLF en el árbol de trabajo; Git avisa que las normaliza a LF al agregarlas | Comprobar tras el commit que el diff siga siendo de 3 líneas por archivo |

- Condiciones para recomendar el cierre: ninguna corrección pendiente. Riesgos residuales: métricas solo sintéticas (D2); `LecturasPrediccion` sin adaptador de Postgres hasta T3 (D13, excepción autorizada); sin efecto visible en el demo hasta T3.
- Próximo responsable: Christian Avila (frente A) y `LuisMaster119` (frente B, por la línea compartida de `.dependency-cruiser.cjs`): autorizar el cierre, es decir, commit, integración en `main`, sincronización de specs, archivado y push.
