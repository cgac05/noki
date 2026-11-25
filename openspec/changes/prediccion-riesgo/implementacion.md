# Implementación: prediccion-riesgo

- Resumen: factores y niveles de riesgo, entrenamiento determinista, carga validada del modelo, estimación de citas confirmadas con respaldo por reglas y plan de recordatorios con calendario de sede.
- Revisión entregada: revisión 4 autorizada en `handoff.md`, sobre `44c57f4`. El árbol de trabajo contiene la implementación. El manifiesto enumera todos los archivos.
- Archivos modificados: tres índices con exportaciones, la primera línea de `.dependency-cruiser.cjs` y el importador de `out-modelo` en el lockfile. Los archivos nuevos están en `ml/`, los paquetes de dominio, aplicación y adaptadores, `tests/unit/prediccion/` y el directorio OpenSpec del cambio. Véase `evidencias/manifiesto.txt` y `evidencias/archivos-existentes.diff`.
- Tareas: 1.1–5.2 completadas (12/12).
- Decisiones: se calcula el nivel sobre la probabilidad completa y se redondea el valor devuelto a dos decimales. Si el inicio ya pasó, la anticipación es cero. Los adaptadores de calendario comparten biblioteca y casos de prueba y mantienen el aislamiento entre paquetes.
- Limitaciones: las métricas proceden de datos sintéticos. `LecturasPrediccion` usa memoria según D13 y la aprobación registrada en el handoff. La conexión a la API queda para T3, por lo que la prueba manual del demo no aplica. Los grupos de pruebas de huecos se reservan para su propio cambio.

| Validación | Comando o comprobación | Resultado | Evidencia |
|---|---|---|---|
| 1.1–4.3 | `corepack pnpm exec vitest run --project unitarios tests/unit/prediccion` | PASS, 36 pruebas | Incluidas en `evidencias/test.txt` |
| 2.2 | Dos ejecuciones de `node --import tsx ml/entrenar.ts` | PASS, SHA-256 idénticos. AUC 0.8118 vs. 0.6957. Brier 0.1309 vs. 0.1566 | `evidencias/entrenamiento.txt`, `ml/metricas.json` |
| 4.2 | `corepack pnpm lint:deps` con una importación temporal de `@noki/adapter-memory` y un enlace para resolverla | PASS, el enlace y la importación se retiraron después de verificar el fallo esperado | `evidencias/aislamiento.txt` |
| 5.1 | `corepack pnpm install --frozen-lockfile` | PASS | `evidencias/install.txt` |
| 5.1 | `corepack pnpm lint` | PASS | `evidencias/lint.txt` |
| 5.1 | `corepack pnpm lint:deps` | PASS | `evidencias/lint-deps.txt` |
| 5.1 | `corepack pnpm test` | PASS, 389 pruebas, incluida la comprobación de 29 eventos | `evidencias/test.txt` |
| 5.1 | `corepack pnpm test:integracion` con Postgres de prueba en 55432 y Redis | PASS, 47 pruebas en 17 archivos | `evidencias/integracion-final.txt` |
| 5.2 | `git diff --stat HEAD`, `git diff HEAD`, `git diff --check HEAD` y `git ls-files --others --exclude-standard` | PASS, las cinco rutas existentes coinciden con el alcance permitido | `evidencias/manifiesto.txt`, `evidencias/archivos-existentes.diff` |

Las primeras ejecuciones de integración fallaron en la preparación de la base de
pruebas. El primer reintento llegó a 44 pruebas aprobadas y tres sin ejecutar
porque quedó un esquema `comandos_http` de la ejecución anterior. La ejecución final, después de la limpieza automática, aprobó las 47 pruebas sin editar las pruebas ni las migraciones.
