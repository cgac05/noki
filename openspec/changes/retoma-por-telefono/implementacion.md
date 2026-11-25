# Implementación de retoma-por-telefono

## Revisión 3

- **Autorización y revisión entregada.** D3 y D5 de `handoff.md`, autorizados por el usuario en esta sesión («la revisión 3 está autorizada»). Base `8233ff3` con el diff pendiente de la revisión 2.
- **Web.** «Continúa donde lo dejaste» abre «Continúa tu cita» con el teléfono de la sesión, con o sin paciente asociado. La acción envía «Hola» como texto e incluye caja de mensajes y «Volver». Se retiró `ContinuacionPendiente` del panel. La acción de entrega a WhatsApp sigue disponible desde la cotización.
- **Call Center.** «Completar la cita aquí» abre el mismo asistente en la ficha cuando existe un `AGENDAR` en proceso y el ANI pertenece a la llamada activa de esa pestaña. El asistente permanece visible para mostrar la confirmación y se cierra al volver a una nueva llamada.
- **Decisiones.** `AsistenteCita` comparte el saludo, el compositor y las acciones de `ChatWa`. El saludo se realiza una vez por apertura, incluso con doble clic o repintados, y espera si hay un envío en curso. Los pasos siguen registrándose como `whatsapp`, según D3 y D5.
- **Archivos de esta revisión.** `apps/web/src/componentes/AsistenteCita.tsx`, `apps/web/src/vistas/{Web,CallCenter,webReal.test,consolas.test}.tsx`, `tasks.md`, este informe y `evidencias/{18-r3-rojo,19-r3-verde,20-r3-vitest,21-r3-eslint,22-r3-tsc,23-r3-flow-base}.txt`. El SHA-256 de `ChatWa.tsx` se comprobó antes y después de los cambios de producto y coincide.
- **Tareas.** 4.1 y 4.2 completadas. 4.3 queda pendiente hasta que la suite web vuelva a verde. El fallo corresponde a la reapertura de un formulario en `/wa` y se reproduce con las vistas de `HEAD` en la copia temporal que conserva los cambios paralelos.

| Validación | Resultado | Evidencia |
|---|---|---|
| Vitest focalizado, antes de implementar | Tres fallos esperados por ausencia del asistente. El caso sin ANI pasó. | [Rojo](evidencias/18-r3-rojo.txt) |
| Vitest de `webReal.test.tsx` y `consolas.test.tsx` | PASS, 42 de 42. Cubre ambas sesiones web, horario apartado con botón de confirmación, mensaje manual, retorno, uso del ANI y confirmación desde la ficha. | [Verde](evidencias/19-r3-verde.txt) |
| `npx vitest run --project web --configLoader runner --maxWorkers=2` | FAIL, 238 de 239. `flow.test.tsx:121` no encuentra «Fecha de nacimiento» al reabrir el formulario tras un error. | [Suite web](evidencias/20-r3-vitest.txt), [reproducción de referencia](evidencias/23-r3-flow-base.txt) |
| `npx eslint apps/web` | PASS, código 0. | [ESLint](evidencias/21-r3-eslint.txt) |
| `npx tsc --noEmit -p apps/web` | PASS, código 0. | [TypeScript](evidencias/22-r3-tsc.txt) |
| OpenSpec estricto y `git diff --check` | PASS. OpenSpec registra 7 de 8 tareas. | Salidas de terminal |
| Demo manual | Pendiente por la instrucción de trabajar sin servidores. | — |

El sandbox devuelve `EPERM` al abrir `vitest.mjs` desde el `node_modules` del árbol original. Las pruebas, ESLint y TypeScript se ejecutaron en serie en una copia temporal con dependencias instaladas desde el lockfile. Los controles de esta revisión se limitaron a `apps/web`, según la tarea 4.3.

## Revisión 2

- **Revisión entregada.** Revisión 2 de `handoff.md` sobre `8233ff3`, con diff local. Autorización referenciada por la instrucción de continuar desde 1.1 en esta sesión.
- **WhatsApp.** Cuando llega texto a una conversación sin trámite activo, el código explícito y la continuación vigente de un asesor conservan su prioridad. Sin ambos, la búsqueda por los últimos diez dígitos considera contactos de WhatsApp, Call Center y Web y retoma el `AGENDAR` en proceso prioritario. Conserva el bloqueo por intentos. El aviso muestra datos N1, el evento usa `MISMO_NUMERO` y no se crea vínculo de identidad por esta vía. La llamada entrante reutiliza la selección.
- **Web.** La ruta de demo reúne la lectura de identidad de memoria o Postgres con la búsqueda compartida de trámites. La consulta no escribe eventos. El panel elimina duplicados y usa `SolicitarContinuacion` para generar el enlace al trámite seleccionado. La prueba consume el enlace desde WhatsApp y comprueba el cambio de canal. El panel permite iniciar otro trámite sin asignación si la sesión carece de paciente.
- **Decisión de implementación.** Las lecturas de memoria y Postgres conservan la búsqueda de identidad. La ruta compone esa lectura con el mismo caso de uso que emplea WhatsApp, conectado desde ambas composiciones de la API. Se evita repetir la selección en los adaptadores de persistencia.
- **Tareas.** 0.1, 1.1, 1.2, 2.1 y 3.1 con evidencia. La integración se ejecutó por Vitest directamente con `--project integracion` y el filtro del archivo tocado.
- **Archivos modificados.** `AGENTS.md`, `PLAN.md`, `docs/{contratos,eventos}.md`, `apps/api/src/{componerComandos,pruebas}.ts`, `apps/web/src/cliente/{cliente.test.ts,mock/ClienteMock.ts}`, `apps/web/src/vistas/{Web,webReal.test}.tsx`, `packages/adapters/in-http/src/{ConversacionWa,rutasConsultas,textosWa}.ts`, `packages/adapters/memory/src/ContactosMemoria.ts`, `packages/adapters/out-postgres/src/ContactosPostgres.ts`, `packages/application/src/CasosTramite.ts`, `packages/contracts/src/consultas.ts`, `packages/domain/src/vocabulario.ts`, `tests/integracion/idempotenciaWa.test.ts`, `tests/unit/api/{llamadaCortadaWa,sesionWebMemoria}.test.ts`, `tasks.md` y `evidencias/`. La prueba H-01 en `tests/unit/nucleo/casosTramite.test.ts` ya estaba corregida al iniciar la revisión 2.

| Validación | Resultado | Evidencia |
|---|---|---|
| Rojo de WhatsApp | Cinco fallos esperados antes de implementar y cinco pruebas aprobadas. | [01-rojo.txt](evidencias/01-rojo.txt) |
| Verde de WhatsApp y regresiones del núcleo | 54 pruebas aprobadas. | [02-whatsapp.txt](evidencias/02-whatsapp.txt) |
| Rojo web | Los escenarios nuevos de API y panel fallaron antes del cambio. | [03-web-rojo.txt](evidencias/03-web-rojo.txt) |
| Vitest unitarios y web | 531 pruebas aprobadas en la primera ejecución completa. | [04-vitest.txt](evidencias/04-vitest.txt) |
| Integración Postgres/Redis | PASS en ejecución directa. El ejecutor habitual quedó bloqueado. `node --import tsx tests/integracion/ejecutar.ts tests/integracion/idempotenciaWa.test.ts` se detuvo en `uv_os_get_passwd` con `ENOMEM` antes de cargar el runner. La ejecución directa de Vitest con la base de prueba falló en la aserción esperada con el manejador original y aprobó con el diff final, incluida la prueba de idempotencia existente. | [05-integracion.txt](evidencias/05-integracion.txt), [16-postgres-rojo.txt](evidencias/16-postgres-rojo.txt), [17-postgres-verde.txt](evidencias/17-postgres-verde.txt) |
| `pnpm test --configLoader runner` | PASS. TypeScript de pruebas y 532 pruebas en 81 archivos. Incluye H-01. | [09-pnpm-test.txt](evidencias/09-pnpm-test.txt) |
| ESLint de archivos tocados y `pnpm lint` | PASS. ESLint y TypeScript de todos los paquetes y pruebas, tras corregir el error de tipado del cliente simulado detectado en la primera pasada. | [06-eslint.txt](evidencias/06-eslint.txt), [10-pnpm-lint.txt](evidencias/10-pnpm-lint.txt) |
| `pnpm lint:deps` | PASS. 255 módulos, 828 dependencias y cero violaciones. | [08-lint-deps.txt](evidencias/08-lint-deps.txt) |
| `git diff --check` | PASS. | Salida de terminal |
| OpenSpec 1.14.0 | PASS. Artefactos válidos en modo estricto. | [14-openspec-validate.txt](evidencias/14-openspec-validate.txt) |
| Demo manual | Pendiente según la restricción de no levantar servidores. | — |

En el árbol original se obtuvo `EPERM` al cargar Vitest desde `node_modules`. Los controles ejecutables se corrieron en una copia temporal del checkout con dependencias instaladas desde el lockfile. Vitest usó `--configLoader runner` porque el empaquetado de la configuración tampoco pudo leer un directorio padre en ese entorno.
