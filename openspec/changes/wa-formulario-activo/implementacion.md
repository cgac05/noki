# Implementación de wa-formulario-activo

- Autorización de la revisión 1 en [handoff.md](handoff.md) y en la instrucción del usuario «Implementa `openspec/changes/wa-formulario-activo` (revisión 1, autorizada…)». Los hashes iniciales de propuesta, tareas y especificación coincidieron con el handoff.
- Revisión entregada sobre `8233ff3` con cambios locales. SHA-256 de `apps/web/src/componentes/ChatWa.tsx`: `B450C3732F49FC16F9735F9EC10E58533850AD5E979526F8CA966F20C9FB86E9`. SHA-256 de `apps/web/src/vistas/wa.test.tsx`: `C091805B53E155C7C0735DA5E11F45D509D6B43B9FE2E4E3B9D67890D4E795EE`.
- `ChatWa.tsx` localiza la última entrada del usuario. Los controles del bot posteriores a esa entrada quedan activos salvo durante un envío. Si todavía no hay una entrada del usuario, se aplica la misma regla a todas las entradas del bot.
- `wa.test.tsx` comprueba que los formularios de CURP y apellido materno abren y envían el `flowResponse` junto a una alternativa activa, y que un formulario y sus botones anteriores quedan deshabilitados.
- Tareas 1.1–1.3 completadas en [tasks.md](tasks.md). La evidencia se guarda en `evidencias/`.

| Validación | Comando | Resultado | Evidencia |
|---|---|---|---|
| 1.1, rojo | `npx vitest run --project web apps/web/src/vistas/wa.test.tsx --configLoader runner` | Fallaron los tres escenarios de regresión con el código original. Pasaron 17 pruebas. | [01-rojo.txt](evidencias/01-rojo.txt) |
| 1.2 y 1.3, verde | `npx vitest run --project web apps/web/src/vistas/wa.test.tsx --configLoader runner` | Pasaron las 20 pruebas. | [02-verde.txt](evidencias/02-verde.txt) |
| 1.3, ESLint | `npx eslint apps/web/src/componentes/ChatWa.tsx apps/web/src/vistas/wa.test.tsx` | PASS, código 0. | [03-eslint.txt](evidencias/03-eslint.txt) |
| 1.3, TypeScript | `npx tsc --noEmit -p apps/web` | PASS, código 0. | [04-tsc.txt](evidencias/04-tsc.txt) |

La primera ejecución de Vitest en el workspace falló con `EPERM` al abrir `vitest.mjs`. Las validaciones registradas se ejecutaron en una copia temporal del árbol de trabajo con dependencias del lockfile. Se usó `--configLoader runner` porque esbuild recibió «Access is denied» al cargar la configuración en esa copia. La comprobación manual con servidor y los controles globales se omitieron por el alcance de validación solicitado. Queda pendiente la revisión independiente de Claude.

## Corrección de H-01 de la vuelta 1

- Autorización en el mensaje del usuario «Corrige el hallazgo H-01» de la revisión `wa-formulario-activo`.
- `ChatWa.tsx` omite las burbujas con `estado === 'error'` al buscar la última entrada del usuario. Tras «Cancelar» un envío fallido, el formulario de la última respuesta se puede volver a abrir con sus campos vacíos. La prueba existente cubre la regresión.
- SHA-256 de `ChatWa.tsx` corregido: `ABC7513903149C5AD4AC50522F3D4509EABC7F69E2BE77AB9799A2E34416333E`.

| Validación | Comando ejecutado | Resultado |
|---|---|---|
| Vitest antes de corregir | `npx.cmd vitest run --project web src/vistas/flow.test.tsx src/vistas/wa.test.tsx --configLoader runner --reporter verbose` | 26 de 27. Falló «cerrar después de un error…» al intentar encontrar el campo de fecha tras reabrir. |
| Vitest después de corregir | Mismo comando | 27 de 27, incluidos H-01 y los tres escenarios de FA (CURP, apellido materno y opciones anteriores). |
| ESLint | `npx.cmd eslint apps/web/src/componentes/ChatWa.tsx` | Código 0. |
| TypeScript | `npx.cmd tsc --noEmit -p apps/web` | Código 0. |

Vitest devolvió `EPERM` al abrir `vitest.mjs` en el workspace. Las comprobaciones de la tabla se ejecutaron en la copia temporal sincronizada con el árbol de trabajo. La validación se limitó a los controles solicitados, sin servidores ni commits. Queda pendiente la nueva revisión independiente de Claude.
