# Implementación de api-comandos

- Resumen. Se agregó la migración `003_api` y se implementó la espera creciente del relay con avisos al cambiar de estado. Se documentó el orden de publicación para transacciones concurrentes del mismo paciente.
- Revisión entregada. Rama `feat/api-comandos` sobre `a576e79`, con cambios locales sin commit. Autorización de la revisión 2 en el mensaje de esta sesión del 24 de noviembre de 2026, para los grupos 1–6. Los hashes de propuesta, diseño, tareas y specs coincidían con el handoff antes de editar las casillas.
- Archivos modificados. `infra/migraciones/003_api.sql`, `apps/api/src/{main,iniciarRelay}.ts`, `packages/application/src/RelayOutbox.ts`, `tests/integracion/migracionPersistencia.test.ts`, `tests/unit/persistencia/{relay,relayApi}.test.ts`, `docs/persistencia.md`, `tasks.md` y este informe.
- Tareas. 1.1 y 6.1 verificadas. 6.2 parcial, con la migración, el relay y H-04 documentados. Las demás casillas siguen abiertas. El grupo 7 espera a `contratos-flujo-a` en `main`. La prueba manual 6.3 requiere las rutas de negocio. El control 6.4 queda bloqueado porque exige un checkout limpio de un commit de la revisión y el usuario pidió trabajar sin commits.
- Decisiones menores. `RelayOutbox.publicarPendientes()` devuelve un booleano para comunicar los fallos de publicación al planificador, preservando el procesamiento de las otras particiones y el registro de fallos por fila. El planificador también trata el rechazo del ciclo como fallo. No se agregaron dependencias.

## Decisiones resueltas por las revisiones 3 y 4

- D2–D3 y tareas 1.2–1.4. D3 indica que la transacción se revierte al devolver un error y exige soltar la clave. El caso existente `CasosTramite.confirmar` persiste `ReservaExpirada` con la clave del comando antes de devolver `HORARIO_NO_DISPONIBLE` (422). D2 usa la clave de la cabecera para los eventos, cuya unicidad se conserva en Postgres. La planificación debe precisar el manejo de errores con efectos persistidos y la semántica de reutilización de su clave.
- D6.3 y tarea 4.3. El diseño pide ofrecer «Cambiar horario» con una reserva activa. El dominio solo permite volver de `HORARIO_RESERVADO` a `LISTO_PARA_RESERVAR` con `expirarHold` y rechaza esa transición antes del vencimiento. Habilitar el cambio durante el hold requiere una decisión de dominio y autorización, o una revisión del comportamiento especificado para el botón.

| Validación | Comando o comprobación | Resultado real |
| --- | --- | --- |
| OpenSpec | `npx --offline --yes --package @fission-ai/openspec@1.14.0 openspec` con `list --json`, `status --change api-comandos --json` e `instructions apply --change api-comandos --json` | BLOQUEADO por `ENOTCACHED`. Se siguió con `openspec/changes/api-comandos/` según autorización. |
| 1.1 | `git diff main -- infra/migraciones/001_nucleo.sql infra/migraciones/002_persistencia.sql` y Vitest del proyecto `integracion` sobre `migracionPersistencia.test.ts` | PASS. Diff vacío y 2 pruebas en verde en `noki_test`. |
| 6.1 | `node node_modules/vitest/vitest.mjs run --project unitarios tests/unit/persistencia/relay.test.ts tests/unit/persistencia/relayApi.test.ts` | PASS. 2 pruebas, con el publicador en memoria y temporizadores controlados. |
| Lint | ESLint directo, `corepack pnpm -r exec tsc --noEmit` fuera del sandbox y `node node_modules/typescript/bin/tsc --project tests/tsconfig.json` | PASS por componentes. Corepack dentro del sandbox falló con `ENOTFOUND registry.npmjs.org`. |
| Fronteras | `node node_modules/dependency-cruiser/bin/dependency-cruise.mjs --config .dependency-cruiser.cjs packages apps` | PASS. 141 módulos, 345 dependencias, cero violaciones. |
| Unitarias y web | TypeScript de pruebas y `node node_modules/vitest/vitest.mjs run --project unitarios --project web --maxWorkers 2` | PASS. 141/141 en 26 archivos. El primer intento con paralelismo predeterminado agotó los 5 s en la prueba web del Flujo A. El reintento pasó con dos workers, sin cambiar el timeout. |
| Integración | `node --env-file=.env --import tsx tests/integracion/ejecutar.ts`, con `DATABASE_URL` ajustada a 55432 y Redis local | PASS. 31/31 en 11 archivos, contra `noki_test`. Requirió acceso al puerto local fuera del sandbox tras `EACCES`. |

## Revisión 4

- Base `91de578`, rama `feat/api-comandos`; autorización en el handoff vigente.
- OpenSpec devolvió `ENOTCACHED` al intentar `list --json`. Se usaron los artefactos locales conforme a la instrucción explícita.
- 1.1. Se renombró la migración a `004_api.sql` y se agregó `token_emitido`. Se recuperó del stash solo el escenario de API, conservando las pruebas de identidad. Las tres pruebas de `migracionPersistencia.test.ts` pasaron en Postgres de prueba 55432, incluida reaplicación sin cambios. Las migraciones 001–003 tienen diff vacío frente a main. Se conservó `stash@{0}`.
- 7.1. Se comparó D12 con los contratos de la base. Existen `IniciarTramite.contacto`, `SolicitarContinuacion`, la ficha con datos nullables y los campos `codigoContinuacion` y `soloLectura`, la vista con `horario`, `INTERNO`, `sala:unirse` y `contextoDemo` marcado solo para demo.

### Avance verificable de la revisión 4

- Tareas cerradas en esta ejecución: 1.1, 1.2, 3.1, 4.1 y 7.1. 6.1 ya estaba completada. Las casillas restantes están abiertas.
- 1.2: puertos de API en `packages/application/src/ports/api.ts`, adaptadores en `memory/src/api.ts` y `out-postgres/src/api.ts`, y batería común en `tests/unit/api/bateriaPuertosApi.ts` con ejecución en memoria y Postgres. La migración permite persistir una respuesta de error con efectos, como requiere D3, y la batería verifica su lectura con código 422.
- 3.1: `TokensJose` implementa JWS HS256, expiración con el reloj inyectado, uso comprobado antes del consumo y contexto reutilizable. Las pruebas verifican firma alterada, expiración, uso equivocado y dos verificaciones simultáneas sobre Postgres con un ganador. Dependencias nuevas: `jose@6.1.3` en `out-security` y `fastify@5.6.2` en `in-http`, con versiones exactas y lockfile actualizado.
- 4.1: el puerto de agenda devuelve horarios por sede, servicio y fecha. La agenda simulada rechaza reactivar una reserva cancelada y su adaptador sale en el primer 4xx.
- Avance parcial: `idempotencia.ts` implementa la huella y el tratamiento de respuestas con y sin efectos. `identificacionWa.ts` traduce pistas al contrato de WhatsApp y valida el payload según `IdentificarPacienteSchema`. Sus conexiones a las rutas y al caso de uso siguen pendientes, así como lecturas, composición, Socket.IO y Flujo A real. La prueba manual 6.3 queda pendiente. El control 6.4 requiere un checkout limpio de un commit y permanece abierto.
- Decisión pendiente de D2/D5: la ruta de comandos permite actor paciente sin credencial y obtiene el teléfono del propio trámite. Presentar un identificador de trámite sería suficiente para pedir candidatos enmascarados de su teléfono. Se solicitó decidir si `IdentificarPaciente` por HTTP exige una credencial vinculada al trámite para ese actor. No se tomó una decisión de acceso en el código.

| Control de la revisión 4 | Resultado |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm lint:deps` | PASS, 168 módulos y 438 dependencias |
| `pnpm test` | PASS, 222 pruebas en 41 archivos |
| `pnpm test:integracion` | PASS, 36 pruebas en 13 archivos, Postgres 55432 y Redis local |

Las suites se ejecutaron en secuencia. El stash y las migraciones 001–003 se conservaron. Los cambios de la revisión 4 quedan locales, sin commit.

## Revisión 5

- **Base y autorización**. `feat/api-comandos` sobre `91de578`; autorización de revisión 5 registrada en `handoff.md` y reiterada por el usuario. OpenSpec devolvió `ENOTCACHED`; el seguimiento y la verificación de casillas se realizaron con los artefactos locales. El diseño y el spec cambiados conservan los hashes del handoff.
- **Comandos e identidad**. `rutasComandos`, `respuestaError`, `vistaTramite`, composición real y subruta de pruebas en memoria. Para actor `paciente`, se valida el uso CONTEXTO y el hilo del trámite antes de ejecutar `IdentificarPaciente` o devolver una respuesta idempotente. Ausencia, invalidez u otro hilo producen 403. WhatsApp e internos llaman al mismo caso de uso existente y conservan su acceso según revisión 5.
- **Consultas y continuación**. `LecturasPort`, adaptadores de memoria y Postgres, y los diez GET del contrato (incluido contexto demo). Se agregó la persistencia atómica del consentimiento y el `jti` al event store y a `token_emitido`; la ficha firma nuevamente el código mientras esté vigente y sin usar. El QR de llegada está firmado, es estable y usa `reservaId` como `jti`.
- **WhatsApp y tiempo real**. El motor guarda por contacto las opciones opacas y el horario preferido. Valida los Flow con el contrato y delega los pasos a `CasosTramite.identificarPaciente`. El resolvedor entrega referencias internas únicamente cuando WhatsApp las pide para ofrecer varios trámites. Socket.IO valida la unión a salas y emite vistas, línea de tiempo, indicadores y fila desde Redis Streams.
- **Pruebas**. Se agregaron `rutasComandos.test.ts`, `comandosMemoria.test.ts`, `consultasWaMemoria.test.ts`, `bateriaLecturasApi.ts` y `comandosHttp.test.ts`. La prueba de varios trámites existente volvió a pasar con su expectativa exacta. Se preservaron las pruebas de salud y readiness. Se agregó documentación de arranque, idempotencia y tokens en `docs/persistencia.md`.
- **Versiones fijadas**. `fastify@5.6.2`, `jose@6.1.3`, `@fastify/cors@11.1.0`, `date-fns@4.1.0`, `date-fns-tz@3.2.0`, `socket.io@4.8.4` y `socket.io-client@4.8.4` como dependencia de desarrollo.
- **Avance**. 28 de 29 tareas verificadas. Se cerraron 7.2 y 7.5 tras confirmar el criterio de la ficha en el handoff. 6.4 queda bloqueada porque requiere un checkout limpio de un commit y la instrucción vigente es trabajar sin commits.
- **Alcance**. Se conservaron `stash@{0}`, el HEAD `91de578` y las migraciones 001–003. Sin cambios locales en `apps/web` ni en `packages/contracts`.

| Control | Resultado real |
| --- | --- |
| `pnpm lint` | En verde, incluidos ESLint y TypeScript. |
| `pnpm lint:deps` | En verde. 185 módulos y 515 dependencias, sin violaciones. |
| `pnpm test` | 236 pruebas en 44 archivos. |
| `pnpm test:integracion` | 38 pruebas en 14 archivos, contra Postgres 55432 y Redis local. |
| Regresión adicional de WhatsApp y núcleo | 78 pruebas en 12 archivos, incluidas la selección de un horario que se ocupa durante la identificación y su sustitución. |
| Flujo A por HTTP y Socket.IO | Cotización, continuidad, identificación, confirmación, QR de un solo uso y llegada a clínica. Redis Streams alimentó las vistas y descartó el evento de llegada repetido tras reiniciar el consumidor. |
| Prueba manual 6.3 | Se arrancaron directamente los puntos de entrada de desarrollo de API y sd-mock con `node --import tsx` y un esquema aislado de `noki_test`. Un cliente HTTP recibió `COTIZADO`, confirmación de WhatsApp y `EN_CLINICA`. Se inspeccionaron los logs de los dos procesos y no contenían el teléfono, la fecha de nacimiento ni el secreto de prueba. |

### Cierre del grupo 7

- **7.2**. En `tests/integracion/comandosHttp.test.ts`, el inicio con el ANI de Ana verifica `telefonoEnmascarado: "•••• 0001"` y `nombrePila: null`. Después de identificarla en el mismo trámite por WhatsApp, la ficha devuelve `nombrePila: "Ana"`. Se reutilizó la evidencia del Flujo A por HTTP aprobada en los controles de la revisión 5.
- **7.5**. Se cerró con los controles ya registrados en verde para esta implementación: `pnpm lint`, `pnpm lint:deps`, `pnpm test` (236 pruebas) y `pnpm test:integracion` (38 pruebas en Postgres 55432 y Redis). En este cierre se modificaron las casillas y el informe.

### Corrección H-01 de la revisión independiente

- `tests/unit/api/identificacionWaHttp.test.ts` recorre el motor con `fastify.inject` y datos sintéticos. Verifica tres fechas erróneas después de elegir «Soy Ana P.», un `IntentoVerificacionFallido` por envío y respuestas genéricas. Tras el tercer fallo, `ConversacionWa` limpia las opciones de la respuesta anterior y envía únicamente el aviso de espera.
- La fecha inexistente repite el Flow de `FECHA_NAC`. No se agrega un evento y la siguiente fecha errónea cuenta como el primer intento. La prueba de logs captura la salida del logger de Fastify en memoria y comprueba que registra la ruta y el cierre de la petición sin exponer el `waId` ni la fecha enviada.
- Validación de la corrección en secuencia: `pnpm lint` PASS, `pnpm lint:deps` PASS (186 módulos y 517 dependencias), `pnpm test` PASS (239 pruebas en 45 archivos), `pnpm test:integracion` PASS (38 pruebas en 14 archivos, Postgres 55432 y Redis), `git diff --check` PASS.
- La sugerencia opcional H-03 queda fuera de esta corrección. 6.4 sigue pendiente por requerir un checkout limpio de un commit. El HEAD y `stash@{0}` se conservaron.
