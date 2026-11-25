# Implementación de contratos-clinica-alertas

- **Entrega**. Los contratos compartidos aceptan `ComprobarIdentidad` y `CerrarAtencion`, validan la posición opcional de una llegada registrada y publican la consulta `alertasSeguridad` con un máximo de 50 elementos.
- **Autorización y revisión**. Revisión 1 aprobada por los frentes A y B según [handoff.md](handoff.md) y ratificada en la solicitud de implementación. Diff de trabajo sobre `8ea1e23`, rebasado con autorización del usuario sobre `origin/main` `0b06351`. La implementación queda sin commit. La confirmación directa del frente A en el handoff era un cambio local previo y se conservó.
- **Archivos de producto y pruebas**. `packages/contracts/src/comandos.ts`, `packages/contracts/src/consultas.ts`, `packages/adapters/in-http/src/rutasComandos.ts`, `apps/web/src/cliente/mock/guionFlujoA.ts`, `tests/unit/contratos.test.ts`, `tests/unit/consultas.test.ts`, `docs/contratos.md` y `AGENTS.md` §7. El [manifiesto](evidencias/03-archivos-entregados.json) incluye los artefactos y la evidencia.
- **Decisiones de implementación**. Las exportaciones existentes de `index.ts` ya publican los tipos nuevos. La prueba HTTP usa Fastify y los adaptadores en memoria desde `tests/unit/contratos.test.ts`, dentro del alcance de Impact.
- **Disponibilidad**. El adaptador devuelve 404 para los dos comandos sin modificar el trámite ni sus eventos. La consulta de alertas también devuelve 404 hasta que el núcleo registre la ruta y el cliente simulado devuelve una lista vacía. La lógica de atención y las pantallas corresponden a los cambios de cada frente. La prueba manual de pantallas no aplica porque el demo visible no cambia.
- **Tareas**. 1.1, 1.2, 2.1, 2.2 y 3.1 verificadas. Entrega para revisión independiente de Claude.

| Tarea | Validación | Resultado | Evidencia |
|---|---|---|---|
| 1.1 | `corepack pnpm exec vitest run --project unitarios tests/unit/contratos.test.ts tests/unit/consultas.test.ts` antes de implementar | 7 fallos esperados, 30 pruebas aprobadas, salida 1 | [01-rojo.txt](evidencias/01-rojo.txt) |
| 1.2 | Mismo comando después de implementar los esquemas | 37 pruebas aprobadas, salida 0. El manifiesto de `contracts` mantiene solo `zod` | Ejecución focalizada y regresión en [03-test.txt](evidencias/03-test.txt) |
| 2.1 | `corepack pnpm -r exec tsc --noEmit` y Vitest con los proyectos `unitarios` y `web` | Salida 0, 327 pruebas aprobadas antes del rebase, incluida la prueba HTTP | [02-tsc.txt](evidencias/02-tsc.txt), [02-http-web.txt](evidencias/02-http-web.txt) |
| 2.2 | Comparación con D1–D4 y `docs/eventos.md` | Los comandos, la posición y la consulta documentados coinciden con el contrato y conservan el catálogo de eventos | `docs/contratos.md`, `AGENTS.md` §7 |
| 3.1 | `corepack pnpm lint` y `corepack pnpm lint:deps` | Salida 0 en ambos. Cero violaciones de dependencias | [03-lint.txt](evidencias/03-lint.txt), [03-deps.txt](evidencias/03-deps.txt) |
| 3.1 | `corepack pnpm test` | 333 pruebas en 58 archivos, salida 0 | [03-test.txt](evidencias/03-test.txt) |
| 3.1 | `corepack pnpm test:integracion` contra PostgreSQL de prueba en `127.0.0.1:55432` y Redis local | 45 pruebas en 15 archivos, salida 0 | [03-integracion.txt](evidencias/03-integracion.txt) |
| 3.1 | `git diff --check origin/main` y validación estricta de OpenSpec | Salida 0. Archivos dentro de Impact y de la carpeta del cambio | [03-archivos-entregados.json](evidencias/03-archivos-entregados.json) |
