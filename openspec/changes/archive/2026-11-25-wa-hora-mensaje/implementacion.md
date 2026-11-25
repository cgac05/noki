# Implementación de wa-hora-mensaje

- Autorización de implementación registrada en [handoff.md](handoff.md) y confirmada en la sesión por el usuario al solicitar «revisión 1, autorizada».
- Revisión entregada sobre `a23d002`, con cambios locales. Las tareas 1.1–1.3 están completas.
- `apps/web/src/cliente/historialWa.ts` guarda el instante ISO en el historial de sesión. El usuario conserva la hora original al reintentar. Las burbujas nuevas del bot reciben la hora de llegada, tanto en respuestas como en avisos.
- `apps/web/src/componentes/ChatWa.tsx` usa `<time dateTime>` y el ciclo de 00 a 23 en la zona local. `apps/web/src/styles.css` sitúa la hora abajo a la derecha con el color secundario de la interfaz. Las entradas antiguas sin fecha siguen mostrándose sin hora.
- `apps/web/src/cliente/historialWa.test.tsx` cubre los cuatro escenarios del requisito, incluido el reintento y la recepción de avisos.
- El cambio actualiza `tasks.md` y adjunta la evidencia en `evidencias/`. Al actualizar una burbuja de aviso ya existente por la deduplicación del historial, se conserva su marca de tiempo.

| Validación | Comando | Resultado | Evidencia |
|---|---|---|---|
| 1.1, fase roja | `npx vitest run --project web --maxWorkers=2 --configLoader runner apps/web/src/cliente/historialWa.test.tsx` | Fallaron las cuatro pruebas nuevas por ausencia de la hora. Pasaron las 11 existentes. | [01-rojo.txt](evidencias/01-rojo.txt) |
| 1.2 y 1.3, fase verde | `npx vitest run --project web --maxWorkers=2 --configLoader runner` | 297 pruebas aprobadas en 34 archivos, incluidas las de WhatsApp, Flow y los asistentes. | [02-controles.txt](evidencias/02-controles.txt) |
| 1.3, ESLint | `npx eslint apps/web` | Código 0. | [02-controles.txt](evidencias/02-controles.txt) |
| 1.3, TypeScript | `npx tsc --noEmit -p apps/web` | Código 0. | [02-controles.txt](evidencias/02-controles.txt) |
| Artefactos y diff | `openspec validate wa-hora-mensaje --type change --strict --no-interactive` y `git diff --check` | Cambio válido. Diff sin errores de espacios. | OpenSpec informa 3 de 3 tareas completas. |

Los controles se ejecutaron en serie sobre una copia temporal de la base con los archivos modificados. En el directorio de trabajo, Vitest falló con `EPERM` al abrir `vitest.mjs`. La copia con dependencias instaladas desde el lockfile requirió `--configLoader runner` porque esbuild recibió `Access is denied` al cargar la configuración.

La validación se limitó a los controles de `apps/web` solicitados. Queda pendiente la comprobación visual en una ruta servida, conforme a la restricción de trabajar sin servidores. La implementación queda disponible para la revisión independiente de Claude.
