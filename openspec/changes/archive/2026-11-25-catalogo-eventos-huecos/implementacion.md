# Implementación: catalogo-eventos-huecos

- Resumen: catálogo de 41 eventos, con `RiesgoEstimado` tipado y los once eventos de huecos documentados con sus payloads existentes, pertenencia y reglas de privacidad. Las pruebas comparan los nombres del documento con el catálogo y verifican los tipos.
- Autorización: revisión 2 y autorizaciones de ambos frentes registradas en `handoff.md`; solicitud de esta sesión: `$openspec-apply-change catalogo-eventos-huecos`. Se comprobaron los cuatro hashes autorizados antes de modificar las casillas de tareas.
- Revisión entregada: rama `feat/catalogo-eventos-huecos`, HEAD `d3c2a54430f7fd8be436d02b5a71a4651021a8de`, con diff sin commit. Contiene `origin/main` `0157047babc1e009ebc6d1887d43ab824f7d4cb8`, confirmado también mediante `git ls-remote origin refs/heads/main`. El `main` local está atrasado y no se modificó. Los hashes SHA-256 de los archivos entregados se guardan en `evidencias/03-archivos-entregados.json`.
- Archivos modificados en esta sesión: `packages/domain/src/eventos.ts`, `tests/unit/dominio.test.ts`, `docs/eventos.md`, `openspec/changes/catalogo-eventos-huecos/tasks.md`, este informe y los archivos de `evidencias/` enumerados en el manifiesto. La propuesta, el diseño, el spec y el handoff tenían modificaciones previas de planificación que se conservaron; `.claude/launch.json` también era preexistente y no se modificó.
- Tareas: 1.1, 1.2, 2.1 y 3.1 completadas (4/4). El estado vigente vive en `tasks.md`.
- Decisiones y desviaciones del diseño: ninguna desviación. El payload usa `Pick<RiesgoEstimado, 'nivel' | 'probabilidad' | 'origen' | 'versionModelo'>` para reutilizar los tipos aprobados sin repetir `tramiteId` ni la hora. Las tablas tipadas se identifican por encabezados terminados en `: eventos tipados`; se comparan los nombres ordenados sin eliminar duplicados. La lectura de Markdown con `node:fs` está exclusivamente en las pruebas.
- Contrato actualizado: `EventoDominio` y `EVENTOS_DOMINIO` admiten `RiesgoEstimado`. Los once payloads de huecos, la envoltura, la API y los contratos públicos de canales permanecen iguales. No hay emisor nuevo, dependencias ni migraciones.
- Riesgos, limitaciones y bloqueos: `RiesgoEstimado` solo se declara; su emisión corresponde a T3. La prueba de documento comprueba nombres, mientras los tipos comprueban payloads; no se interpreta el texto de payloads como un esquema. La validación de probabilidad pertenece al código de predicción existente. No cambia ninguna pantalla ni el comportamiento del demo, por lo que no aplica prueba manual de interfaz. La revisión independiente y el cierre siguen pendientes de Claude y de la autorización de ambos frentes.

| Validación / tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 1.1 / CC: escenario inicial | `corepack pnpm exec vitest run --project unitarios tests/unit/dominio.test.ts` | Rojo esperado: código 1, 3 fallos y 5 pruebas aprobadas; faltaban el evento y el catálogo documental | [01-rojo.txt](evidencias/01-rojo.txt) |
| 1.1 / CC: tipos iniciales | `corepack pnpm exec tsc --project tests/tsconfig.json` | Rojo esperado: código 2, TS2344 porque el payload de RiesgoEstimado aún era `never` | [01-tipos-rojo.txt](evidencias/01-tipos-rojo.txt) |
| 1.2 / D3 | `corepack pnpm exec vitest run --project unitarios tests/unit/dominio.test.ts` | 6 pruebas aprobadas; solo fallaban las dos comprobaciones del documento, código 1 esperado | [02-dominio-parcial.txt](evidencias/02-dominio-parcial.txt) |
| 1.2 / compilación | `corepack pnpm -r exec tsc --noEmit` | PASS, código 0 | [02-tsc.txt](evidencias/02-tsc.txt) |
| 1.2 / payloads y privacidad por tipos | `corepack pnpm exec tsc --project tests/tsconfig.json` | PASS, código 0; se verifican `expectTypeOf` y los dos rechazos con `@ts-expect-error` | [02-tipos-pruebas.txt](evidencias/02-tipos-pruebas.txt) |
| 2.1 / D1–D4 y CC | `corepack pnpm exec vitest run --project unitarios tests/unit/dominio.test.ts`; cotejo del texto con `eventos.ts`, `PLAN.md` §6, §7 y §10.1, `docs/contratos.md` y D2 de `relleno-huecos` | PASS, código 0: 8 pruebas aprobadas; los once payloads existentes y su pertenencia coinciden con lo documentado | [02-verde.txt](evidencias/02-verde.txt) y diff de `docs/eventos.md` |
| 3.1 / lint y tipos | `corepack pnpm lint` | PASS, código 0 | [03-lint.txt](evidencias/03-lint.txt) |
| 3.1 / fronteras | `corepack pnpm lint:deps` | PASS, código 0: sin violaciones, 250 módulos y 778 dependencias | [03-deps.txt](evidencias/03-deps.txt) |
| 3.1 / unitarias y web | `corepack pnpm test` | PASS, código 0: 447 pruebas en 75 archivos | [03-test.txt](evidencias/03-test.txt) |
| 3.1 / integración | `corepack pnpm test:integracion` | PASS, código 0: 52 pruebas en 18 archivos, con PostgreSQL y Redis; incluye reserva concurrente, Streams, oleada y saga de huecos | [03-integracion.txt](evidencias/03-integracion.txt) |
| 3.1 / alcance y revisión entregada | Rutas del diff y archivos nuevos frente a la lista autorizada; SHA-256 de cada archivo entregado | PASS; el único archivo ajeno es `.claude/launch.json`, preexistente y sin modificar | [03-archivos-entregados.json](evidencias/03-archivos-entregados.json) |
| Estructura OpenSpec | `openspec validate catalogo-eventos-huecos --type change --strict --no-interactive` | PASS, código 0 | [03-openspec.txt](evidencias/03-openspec.txt) |
| Integridad del diff | `git diff --check` | PASS, código 0 | [03-diff-check.txt](evidencias/03-diff-check.txt) |

- Entorno: Docker informó PostgreSQL y Redis saludables. El sandbox inicial no podía acceder a Docker ni a la caché de pnpm; las ejecuciones posteriores con permisos ampliados resolvieron esas restricciones, sin cambiar archivos del proyecto ni las pruebas.
- Correcciones: no existía `revision.md` al iniciar. No se creó un dictamen propio ni se hicieron commits, publicación, sincronización de specs o archivado.
- Los códigos de salida de los cuatro controles finales también constan en [03-resultados.json](evidencias/03-resultados.json).
- Próximo responsable: Claude, para la revisión independiente del diff y de la evidencia con `/opsx:verify catalogo-eventos-huecos`.
