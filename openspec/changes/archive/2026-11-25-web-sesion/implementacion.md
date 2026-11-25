# Implementación: web-sesion

## D6

- Alcance autorizado en esta sesión: «Implementa SOLO D6 y la tarea 2.1 de openspec/changes/web-sesion».
- En `apps/web/src/vistas/CallCenter.tsx`, «Volver a nueva llamada» muestra el formulario ANI, descarta la respuesta activa de la vista y reinicia el consentimiento y las acciones. El botón ejecuta cambios de estado local y queda deshabilitado mientras haya un comando pendiente. El contexto compartido permanece disponible para los demás canales.
- En `apps/web/src/vistas/consolas.test.tsx`, la prueba escrita antes del botón comprueba que se oculta la ficha, que volver no agrega comandos y que la próxima llamada arranca sin consentimiento ni error.
- La tarea 2.1 está marcada como implementada. La validación de comportamiento sigue pendiente.

| Validación | Resultado | Evidencia |
|---|---|---|
| `node_modules/.bin/vitest.cmd run --project web apps/web/src/vistas/consolas.test.tsx --testTimeout=30000` antes y después del cambio | BLOQUEADO | `EPERM: operation not permitted` al abrir `vitest.mjs`, código 1 en ambos intentos. |
| `corepack pnpm lint` | BLOQUEADO | `EPERM` al abrir `eslint/bin/eslint.js`. |
| `corepack pnpm lint:deps` | BLOQUEADO | `EPERM` al abrir `dependency-cruiser/bin/dependency-cruise.mjs`. |
| `corepack pnpm test` | BLOQUEADO | `EPERM` al abrir `typescript/bin/tsc`. |
| `git diff --check -- apps/web/src/vistas/CallCenter.tsx apps/web/src/vistas/consolas.test.tsx` | PASS | Código 0. |
| OpenSpec CLI | BLOQUEADO | `openspec` no está disponible en PATH. Se leyeron los artefactos locales. |
| Prueba manual en `/callcenter` | PENDIENTE | La sesión excluye levantar servidores. |

## D1–D5 · Sesión del paciente en /web

- Alcance autorizado en el handoff y en el pedido de implementar 1.1–1.4. Revisión de trabajo sobre `eedd179`, con cambios locales.
- La sesión usa una contraseña de demostración validada en la vista. La API busca el paciente por los últimos diez dígitos y entrega su nombre enmascarado. El panel muestra trámites pendientes, continuación por WhatsApp, citas confirmadas con pago simulado y el inicio de una cotización con el paciente ya asignado.
- Postgres ordena por último uso del vínculo y desempata por UUID de paciente ascendente. Memoria usa la lectura pública existente: si devuelve varios pacientes, acota el umbral de último uso hasta resolver el orden, con el mismo desempate. La ruta registrada en demo usa la plantilla de URL en el log para excluir el teléfono.
- La excepción HTTP de `AsignarPaciente` traduce `web/paciente` a actor interno `sistema` solo en demo. El cliente simulado usa el paciente del guion activo para el teléfono de Ana y mantiene los trámites web en memoria, separados del avance del guion. `VITE_DEMO=true` habilita el panel en los clientes real y simulado.
- 1.1–1.3 tienen implementación y pruebas escritas. 1.4 está marcada para registrar el intento de todos los controles solicitados. La ejecución y la prueba manual quedan pendientes de validación.

### Archivos

- Contrato y API: `packages/contracts/src/consultas.ts`, `packages/application/src/ports/lecturas.ts`, `packages/adapters/in-http/src/rutasConsultas.ts`, `packages/adapters/in-http/src/rutasComandos.ts`, `packages/adapters/out-postgres/src/LecturasComandosPostgres.ts`, `packages/adapters/memory/src/LecturasMemoria.ts`, `docs/contratos.md`.
- Vista y clientes: `apps/web/src/vistas/Web.tsx`, `apps/web/src/styles.css`, `apps/web/src/cliente/ClienteApi.ts`, `apps/web/src/cliente/crearCliente.ts`, `apps/web/src/cliente/real/ClienteReal.ts`, `apps/web/src/cliente/mock/ClienteMock.ts`, `apps/web/src/cliente/mock/guionFlujoA.ts`.
- Pruebas: `tests/unit/api/sesionWebMemoria.test.ts`, `tests/unit/consultas.test.ts`, `apps/web/src/vistas/webReal.test.tsx`, `apps/web/src/cliente/cliente.test.ts`.
- Seguimiento: `tasks.md`, `evidencias/01-rojo.txt`, `implementacion.md`.

### Validaciones

| Control | Resultado real |
|---|---|
| Vitest de las pruebas iniciales | BLOQUEADO. Salida 1 en la carga de `vitest.mjs` por `EPERM`. Véase [01-rojo.txt](evidencias/01-rojo.txt). |
| Vitest unitarios y web con `--testTimeout=30000` | BLOQUEADO. El mismo error al abrir `vitest.mjs`. |
| ESLint y `corepack pnpm lint` | BLOQUEADO. `EPERM` al abrir `eslint/bin/eslint.js`. |
| `corepack pnpm -r exec tsc --noEmit`, TSC directo y `corepack pnpm test` | BLOQUEADO. `EPERM` al abrir `typescript/bin/tsc`. |
| `corepack pnpm lint:deps` | BLOQUEADO. `EPERM` al abrir `dependency-cruise.mjs`. |
| `git diff --check` | PASS. Código 0. |
| `node --check` en `ClienteMock.ts`, `rutasConsultas.ts` y `sesionWebMemoria.test.ts` | PASS. Comprobación de sintaxis. |
| OpenSpec `status` e `instructions apply` | BLOQUEADO. `openspec` no figura en PATH. Se consultaron los artefactos locales. |
| Prueba manual de `/web` | PENDIENTE. La sesión excluye levantar servidores. |

## Correcciones de revisión H-03 y H-04

La solicitud de esta sesión autoriza corregir ambos hallazgos de `web-sesion`. Las correcciones corresponden a D1 y a las tareas 1.1 y 1.2.

- **H-03.** El contacto de la prueba se normalizaba a `1000000001`, mientras que la consulta buscaba `0000000001`. Por eso `pacientesPorTelefono` devolvía una lista vacía y la ruta respondía 404. Se corrigió el dato de `tests/unit/api/sesionWebMemoria.test.ts` manteniendo un formato distinto al de la URL y los dos vínculos para comprobar la selección por último uso. La causa estaba en los datos de prueba.
- **H-04.** `RouteShorthandOptions` de Fastify 5.6.2 no declara `logSerializers`. En `packages/adapters/in-http/src/rutasConsultas.ts` se usa `childLoggerFactory` para conservar las opciones y los campos del logger y serializar la solicitud con la plantilla de URL. La prueba exige que aparezca la plantilla y comprueba que los logs omitan los números de las consultas exitosas, desconocidas e inválidas.

| Control | Resultado real |
|---|---|
| `corepack pnpm exec vitest run tests/unit/api/sesionWebMemoria.test.ts` | BLOQUEADO. Salida 1 por `EPERM` al abrir `vitest/vitest.mjs`. |
| `corepack pnpm --filter @noki/adapter-in-http exec tsc --noEmit` | BLOQUEADO. Salida 1 por `EPERM` al abrir `typescript/bin/tsc`. |
| `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test` | BLOQUEADOS. `EPERM` al abrir `eslint/bin/eslint.js`, `dependency-cruiser/bin/dependency-cruise.mjs` y `typescript/bin/tsc`, respectivamente. |
| Normalización con Node y la función real del dominio | PASS. Confirmada la discrepancia original y la coincidencia del dato corregido. |
| `node --check` en los dos archivos TypeScript editados y `git diff --check` | PASS. Comprobaciones de sintaxis y espacios. |
| OpenSpec CLI | BLOQUEADO. `openspec` no está en PATH. Se consultaron los artefactos locales y las evidencias [H-03](evidencias/revision-h03.txt) y [H-04](evidencias/revision-h04.txt). |
