# Implementación de web-modo-real

## Revisión 2

Cambio pendiente de revisión sobre `0b59599`. D5 se implementó con la autorización «autorizo núcleo» de Christian (`cgac05`), registrada en [handoff.md](handoff.md). El directorio de trabajo también contiene cambios concurrentes de WhatsApp.

- Web real toma las combinaciones de servicio y sede y sus precios del catálogo. Usa los IDs de las respuestas para encadenar los comandos. Después de solicitar la continuación, lee la ficha y muestra el código, el enlace a WhatsApp y su QR. El modo simulado conserva su consulta anterior.
- El ejecutor reutiliza la clave de idempotencia y la última respuesta al reintentar un paso fallido. El bloqueo síncrono impide iniciar una segunda operación durante la primera. Si falla la lectura de la ficha, se reintenta esa lectura.
- Clínica obtiene el actor desde la sede del trámite y usa la sede del contexto cuando la cita omite el ID. Se ajustaron exclusivamente las entradas de recepción del guion simulado para que el cliente mock siga reconociendo ambos comandos.
- El adaptador de Postgres lee el canal del evento de consentimiento, con respaldo en `tramite.canal_origen`, y conserva el nivel del evento. El método es `TOKEN_CC` para Call Center y `TOKEN_WEB` para Web.

## Archivos modificados

- Núcleo y persistencia: `packages/application/src/CasosTramite.ts`, `packages/adapters/out-postgres/src/LecturasComandosPostgres.ts`, `tests/unit/nucleo/casosTramite.test.ts` y `tests/integracion/puertosApiPostgres.test.ts`.
- Web y Clínica: `apps/web/src/vistas/Web.tsx`, `apps/web/src/cliente/useAccion.ts`, `apps/web/src/vistas/Clinica.tsx` y `apps/web/src/componentes/LlegadaClinica.tsx`.
- Guion y pruebas web: `apps/web/src/cliente/mock/guionFlujoA.ts`, `apps/web/src/cliente/cliente.test.ts`, `apps/web/src/vistas/webReal.test.tsx`, `apps/web/src/vistas/clinicaAlertas.test.tsx`, `apps/web/src/vistas/consolas.test.tsx` y `apps/web/src/vistas/vistas.test.tsx`.
- Documentación y evidencia: `docs/trabajo-paralelo.md`, `tasks.md`, este informe y `evidencias/*.txt` en el cambio.

## Validación

| Tarea | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 0.1 | `corepack pnpm exec vitest run --project unitarios tests/unit/nucleo/casosTramite.test.ts` y `corepack pnpm exec vitest run --project integracion tests/integracion/puertosApiPostgres.test.ts` | Vitest bloqueado por `EPERM`. En comprobaciones directas previas al cambio, el caso de uso rechazó al paciente web y el adaptador, con Postgres en 55432, devolvió `callcenter / TOKEN_CC` para el origen web. Ambos reprodujeron el fallo funcional. | [00-rojo](evidencias/00-rojo.txt) |
| 0.2 | Node con `--experimental-transform-types` y `psql` en localhost:55432 | Pasaron las comprobaciones directas del consentimiento para ambos canales y del origen, método y nivel del token en Postgres con tablas temporales y reversión. La regresión de Call Center de Vitest sigue bloqueada. | [00-verde](evidencias/00-verde.txt) |
| 1.1–1.2 | `corepack pnpm exec vitest run --project web webReal.test.tsx`; después, con `vistas.test.tsx` | BLOQUEADO en ambas ejecuciones. Código 1, `EPERM` al abrir Vitest. La prueba quedó escrita antes del cambio de Web. | [01-rojo](evidencias/01-rojo.txt), [01-verde](evidencias/01-verde.txt) |
| 2.1 | `corepack pnpm exec vitest run --project web clinicaAlertas.test.tsx`; después, con `consolas.test.tsx vistas.test.tsx cliente.test.ts` | BLOQUEADO en ambas ejecuciones. Código 1, `EPERM` al abrir Vitest. Las pruebas verifican sede de la cita y respaldo del contexto. | [02-rojo](evidencias/02-rojo.txt), [02-verde](evidencias/02-verde.txt) |
| 3.1 | Revisión de `docs/trabajo-paralelo.md` | Registrada la coordinación como frente único desde el 2026-11-25 hasta la entrega. | [Nota](../../../docs/trabajo-paralelo.md) |
| 3.2 | `corepack pnpm lint` | BLOQUEADO. Código 1, `EPERM` al abrir ESLint. | [03-lint](evidencias/03-lint.txt) |
| 3.2 | `corepack pnpm lint:deps` | BLOQUEADO. Código 1, `EPERM` al abrir dependency-cruiser. | [03-deps](evidencias/03-deps.txt) |
| 3.2 | `corepack pnpm test` | BLOQUEADO. Código 1, `EPERM` al abrir TypeScript, antes de Vitest. | [03-test](evidencias/03-test.txt) |
| 3.2 | `corepack pnpm test:integracion` con `DATABASE_URL` ajustada a localhost:55432 | BLOQUEADO. Código 1, `ERR_MODULE_NOT_FOUND` al cargar `tsx`, antes de contactar Postgres. La sesión se preparó en modo de solo lectura porque el ejecutor reconstruye el esquema público de `noki_test`. | [03-integracion](evidencias/03-integracion.txt) |
| 3.2 | `VITE_API=real VITE_DEMO=true corepack pnpm --filter @noki/web build` | BLOQUEADO. Código 1, `EPERM` al abrir Vite. | [03-build](evidencias/03-build.txt) |
| Comprobación de los servidores existentes | GET de las rutas y módulos transformados en Vite. Cotización web anónima por HTTP, seguida de lectura de ficha. | PASS. HTTP 200 en las rutas y módulos consultados y en los cuatro comandos web. La ficha devolvió un JWS con `can=web`, `met=TOKEN_WEB` y `niv=0`. Un primer intento de comprobar el JWS usó nombres de campos incorrectos y se corrigió. El intento posterior de regresión HTTP de Call Center recibió `ECONNREFUSED` en :4000. La prueba manual visual quedó bloqueada por el host del navegador. | [03-http](evidencias/03-http.txt) |

`git diff --check` terminó con código 0. `openspec status --change web-modo-real --json` y `openspec instructions apply --change web-modo-real --json` quedaron bloqueados porque el ejecutable `openspec` no está en el PATH. El intento de obtenerlo con `corepack pnpm dlx` tampoco pudo acceder al entorno local de pnpm o al registro desde el sandbox.

## Tareas pendientes de verificación

Se marcaron 0.1 con evidencia funcional directa y 3.1 con la nota publicada en el repositorio local. Quedan abiertas 0.2, 1.1, 1.2, 2.1 y 3.2 hasta poder ejecutar las pruebas y los controles requeridos. Queda pendiente observar el recorrido visual en Web y Clínica, y la reanudación en WA desde el enlace.
