# Implementación de wa-numero-continuacion

El enlace «Abrir WhatsApp» y su QR incluyen el ANI enviado en `IniciarTramite` cuando la llamada se inició en la pestaña y corresponde al hilo mostrado. WhatsApp valida el número del enlace, lo activa antes de enviar la continuación y reemplaza la URL por `/wa`. Si el número es inválido, conserva el número actual. El historial existente evita reenvíos del mismo código en la conversación.

## Revisión entregada

- Revisión 1, autorizada en [handoff.md](handoff.md) y confirmada en la instrucción de implementación. Base Git `f5260a8` con cambios de `web-sesion` en el árbol de trabajo.
- Tareas 1.1–1.3 completadas. [tasks.md](tasks.md)
- El ANI se toma de las variables de la mutación exitosa y se compara el hilo de su respuesta con el hilo visible. La prueba del call center usa un ANI de prueba distinto del de demo y adapta el comando al guion fijo de `ClienteMock` después de capturar lo enviado por la vista.

| Archivo bajo `apps/web/src/vistas/` | SHA-256 abreviado de la versión probada |
|---|---|
| `CallCenter.tsx` | `1335d3f033f1` |
| `Wa.tsx` | `49116d5e7ca2` |
| `consolas.test.tsx` | `6c978f028da5` |
| `wa.test.tsx` | `538b12fe8c64` |

También se actualizaron `tasks.md` y este informe, y se agregaron las salidas de `evidencias/` enlazadas abajo.

## Validación

El checkout devolvió `EPERM` al abrir el ejecutable local de Vitest. Los controles se ejecutaron en una copia temporal del árbol de trabajo con dependencias instaladas desde el lockfile. Los cuatro archivos probados coinciden por SHA-256 con el checkout. En esa copia, el cargador predeterminado de Vitest falló por permisos y se usó `--configLoader runner` para cargar la misma configuración sin empaquetarla. Esta fue una desviación del comando de validación. El diseño D1–D2 se aplicó según lo aprobado.

| Tarea o control | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 1.1, rojo antes de implementar | `npx vitest run --configLoader runner --project web apps/web/src/vistas/consolas.test.tsx apps/web/src/vistas/wa.test.tsx -t 'incluye el número de la llamada\|Enlace con número\|Número inválido en el enlace'` | 2 fallos esperados: enlace sin ANI y envío desde el número de demo. El número inválido ya se ignoraba y ese caso pasó. | [01-rojo.txt](evidencias/01-rojo.txt) |
| 1.2, CI y SW | `npx vitest run --configLoader runner --project web apps/web/src/vistas/consolas.test.tsx apps/web/src/vistas/wa.test.tsx` | PASS, 37 pruebas | [02-vistas.txt](evidencias/02-vistas.txt) |
| 1.3, Vitest web | `npx vitest run --project web` | BLOQUEADO por permisos al cargar la configuración con esbuild | [03-vitest.txt](evidencias/03-vitest.txt) |
| 1.3, Vitest web con cargador alternativo | `npx vitest run --project web --configLoader runner` | PASS, 233 pruebas en 28 archivos | [03-vitest-runner.txt](evidencias/03-vitest-runner.txt) |
| 1.3, ESLint web | `npx eslint apps/web` | PASS, salida 0 | [04-eslint.txt](evidencias/04-eslint.txt) |
| 1.3, TypeScript web | `npx tsc --noEmit -p apps/web` | PASS, salida 0 | [05-tsc.txt](evidencias/05-tsc.txt) |
| Lint del repositorio | `npx --yes --package pnpm@11.25.0 pnpm lint` | FAIL, TS2353 en `tests/unit/nucleo/casosTramite.test.ts:655`. El literal tiene una propiedad `sexo` que `DatosDeclarados` no admite. | [06-pnpm-lint.txt](evidencias/06-pnpm-lint.txt) |
| Fronteras del repositorio | `npx --yes --package pnpm@11.25.0 pnpm lint:deps` | PASS, 255 módulos y 828 dependencias | [07-pnpm-deps.txt](evidencias/07-pnpm-deps.txt) |
| Pruebas del repositorio | `npx --yes --package pnpm@11.25.0 pnpm test` | FAIL, mismo TS2353 antes de iniciar Vitest | [08-pnpm-test.txt](evidencias/08-pnpm-test.txt) |

La prueba manual de la demo quedó pendiente por la restricción de ejecutar el cambio sin levantar servidores. Se entrega para revisión independiente de Claude.
