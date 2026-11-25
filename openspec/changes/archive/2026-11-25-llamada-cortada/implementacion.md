# Implementación de llamada-cortada

- Autorización: handoff de Christian (2026-11-25), reiterada en la instrucción de implementar las tareas 1.1–1.4.
- Revisión entregada: diff de trabajo sobre `51e4df6`. Tareas 1.1–1.4 registradas en `tasks.md`. Las casillas del punto de control registran el intento y sus resultados.
- Call Center solicita la continuación una sola vez al pulsar «Cerrar atención (llamada cortada)», muestra «Llamada cerrada» al éxito y usa la ficha existente para el enlace y QR.
- WhatsApp busca antes del flujo por vínculo cuando llega texto a una conversación sin trámite. Compara el ANI y el número de WhatsApp con la misma normalización telefónica que usa la búsqueda y exige una continuación vigente de asesor. Si encuentra más de un hilo elegible, mantiene el flujo ordinario. La misma firma y el mismo registro de uso único se emplean para la ficha y WhatsApp.
- El aviso muestra los datos de servicio, sede y horario disponibles. Cuando hay paciente asignado, muestra una máscara fija, sin nombres ni identificadores. La pregunta pendiente conserva su propio mensaje.
- Alcance de la comprobación manual: pendiente en las rutas de la demo. El CLI de OpenSpec no estaba en PATH. Se comprobaron los artefactos en disco.

## Archivos

- `apps/web/src/vistas/CallCenter.tsx` y `apps/web/src/vistas/consolas.test.tsx`
- `packages/adapters/in-http/src/ConversacionWa.ts` y `packages/adapters/in-http/src/textosWa.ts`
- `packages/adapters/out-postgres/src/LecturasComandosPostgres.ts` y `packages/adapters/memory/src/LecturasMemoria.ts`
- `apps/api/src/componerComandos.ts` y `apps/api/src/pruebas.ts`
- `tests/unit/api/llamadaCortadaWa.test.ts`
- `tasks.md`, `implementacion.md` y `evidencias/` de este cambio

## Controles

| Comando | Resultado | Evidencia |
|---|---|---|
| `corepack pnpm exec vitest run --project unitarios --project web --testTimeout=30000 tests/unit/api/llamadaCortadaWa.test.ts apps/web/src/vistas/consolas.test.tsx` | BLOQUEADO antes de implementar por EPERM al abrir vitest.mjs | [01-rojo](evidencias/01-rojo.txt) |
| `corepack pnpm exec vitest run --project unitarios --project web --testTimeout=30000` | BLOQUEADO por EPERM al abrir vitest.mjs | [02-vitest](evidencias/02-vitest.txt) |
| `corepack pnpm exec eslint .` | BLOQUEADO por EPERM al abrir eslint.js | [02-eslint](evidencias/02-eslint.txt) |
| `corepack pnpm -r exec tsc --noEmit` | BLOQUEADO por EPERM al abrir tsc | [02-tsc](evidencias/02-tsc.txt) |
| `corepack pnpm lint:deps` | BLOQUEADO por EPERM al abrir dependency-cruise.mjs | [02-deps](evidencias/02-deps.txt) |
| `corepack pnpm lint` | BLOQUEADO por EPERM al abrir eslint.js | [02-lint](evidencias/02-lint.txt) |
| `corepack pnpm test` | BLOQUEADO por EPERM al abrir tsc | [02-test](evidencias/02-test.txt) |
| `git diff --check` | PASS, salida 0 | [02-diff](evidencias/02-diff.txt) |

## Corrección H-01

- Autorización del alcance en el mensaje del usuario «Corrige un hallazgo de revisión en `openspec/changes/llamada-cortada/`».
- `ConversacionWa.ts` aplica `normalizarTelefono` de `@noki/domain` al ANI y al `waId` antes de comparar. La coincidencia requiere los mismos últimos diez dígitos.
- `llamadaCortadaWa.test.ts` cubre ambos números con prefijo, cada combinación con el prefijo ausente de un lado y el rechazo de otro número. Conserva los casos de token usado, token vencido y ausencia de solicitud.

| Comando | Resultado |
|---|---|
| `corepack pnpm exec vitest run --project unitarios tests/unit/api/llamadaCortadaWa.test.ts` | BLOQUEADO antes y después de la corrección. `EPERM` al abrir `vitest.mjs`. |
| `corepack pnpm lint` | BLOQUEADO por `EPERM` al abrir `eslint.js`. |
| `corepack pnpm lint:deps` | BLOQUEADO por `EPERM` al abrir `dependency-cruise.mjs`. |
| `corepack pnpm test` | BLOQUEADO por `EPERM` al abrir `typescript/bin/tsc`. |
| `node --check` sobre los dos archivos TypeScript y `git diff --check` | PASS. |
| `openspec status --change llamada-cortada --json` y `openspec instructions apply --change llamada-cortada --json` | BLOQUEADO. El comando `openspec` no está en PATH. Se leyeron los artefactos en disco. |

La comprobación manual queda pendiente por la restricción de no iniciar servidores. La corrección queda disponible para revisión independiente.
