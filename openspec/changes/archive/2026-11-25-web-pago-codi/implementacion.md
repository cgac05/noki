# Implementación de web-identificacion

## H-02 · Enlaces de la vista sin contexto de demo

La solicitud de revisión de esta sesión autorizó el ajuste de `apps/web/src/vistas/webReal.test.tsx` y este registro. Los dos casos de «ofrece otros canales cuando no hay contexto de demo» usan `within(screen.getByRole('main'))` para comprobar los enlaces a `/wa` y `/callcenter`. El `<main>` contiene la vista y deja fuera la navegación de `Layout`. El código de producto queda intacto.

Vitest quedó bloqueado antes y después del ajuste con `EPERM` al abrir `vitest.mjs`. `corepack pnpm lint`, `corepack pnpm lint:deps` y `corepack pnpm test` también quedaron bloqueados con `EPERM` al abrir `eslint.js`, `dependency-cruise.mjs` y `tsc`, respectivamente. La CLI `openspec` devolvió `CommandNotFoundException` y se consultaron los artefactos locales.

## D13 · Pagar con CoDi

- Entrega sobre `51e4df6` con cambios locales. La autorización de esta sesión quedó registrada en [handoff.md](handoff.md).
- `apps/web/src/vistas/Web.tsx` abre un QR de demostración con `QrCita` y contenido fijo `CODI-DEMO`. Clic, Enter y Espacio reutilizan el registro de pago y el recibo de D10. «Volver» desde el QR regresa a la lista sin registrar el pago. «Volver» desde el recibo muestra el detalle como «Pagada».
- `apps/web/src/vistas/webReal.test.tsx` se ajustó antes de la vista y cubre las tres activaciones, el cierre sin pago, el recibo y la persistencia. La inspección del diff confirmó que las activaciones llaman al registro existente y que «Volver» solo limpia la selección.
- [tasks.md](tasks.md) registra la entrega de 3.4. Los resultados del pruebas automatizadas quedan pendientes por EPERM.

| Control | Resultado real |
|---|---|
| `corepack pnpm exec vitest run --project web apps/web/src/vistas/webReal.test.tsx` antes y después de implementar | BLOQUEADO en ambos intentos. Salida 1 con `EPERM: operation not permitted, open` en `vitest.mjs`, antes de cargar las pruebas. Rojo y verde sin confirmar. |
| `corepack pnpm lint` | BLOQUEADO. Salida 1 con EPERM al abrir `eslint/bin/eslint.js`. |
| `corepack pnpm lint:deps` | BLOQUEADO. Salida 1 con EPERM al abrir `dependency-cruiser/bin/dependency-cruise.mjs`. |
| `corepack pnpm test` | BLOQUEADO. Salida 1 con EPERM al abrir `typescript/bin/tsc`. |
| `git diff --check -- apps/web/src/vistas/Web.tsx apps/web/src/vistas/webReal.test.tsx` | PASS. Salida 0 con avisos de conversión CRLF a LF. |
| `openspec list --json`, `openspec status --change web-identificacion --json` y `openspec instructions apply --change web-identificacion --json` | BLOQUEADO por `CommandNotFoundException`. Se consultaron los artefactos locales. |
| Prueba manual de `/web` | Pendiente por la restricción de iniciar servidores. |

## Revisión 3 · D9–D12

Autorizada en [handoff.md](handoff.md) y reiterada en la solicitud de esta sesión para las tareas 3.1–3.3. Entrega sobre `51e4df6` con los cambios locales de los archivos siguientes.

- `apps/web/src/vistas/Web.tsx` abre con «Paga tu cita» en modo real. Tras validar de 10 a 15 dígitos, muestra solo los últimos cuatro y usa `contextoDemo` para obtener el paciente de la simulación. El teléfono capturado para este flujo se usa localmente y queda disponible al volver a la captura.
- La lista usa `citasPaciente`, filtra las citas confirmadas, formatea la hora de la sede y cruza servicio y sede con `catalogo`. Si falta el precio para una cita, se muestra un aviso y esa cita queda sin acción de pago.
- «Pagar» abre la confirmación. Al confirmar se genera un folio local con prefijo `SIM-` y se guarda por ID de trámite en `sessionStorage` con respaldo en memoria. «Volver» desde el recibo regresa al detalle de pago ya registrado. El pago es una simulación de interfaz y no envía comandos.
- La cotización previa se abre desde «¿Aún no tienes cita? Cotiza un estudio». Mantiene la captura del teléfono y el envío a WhatsApp. El cliente simulado conserva su pantalla de cotización.
- `apps/web/src/vistas/webReal.test.tsx` cubre validación sin consultas, precio por sede, fecha local, exclusión de citas canceladas, recibo, persistencia al reabrir, navegación hacia atrás, contexto ausente y modo simulado. Se retiraron las tres pruebas de identificación completa de la revisión 1 y se mantuvieron las de cotización con teléfono y continuación.
- `tasks.md` registra 3.1–3.3. Las casillas reflejan la entrega y los intentos de validación conforme a la instrucción de continuar ante EPERM. D13 (CoDi) figura en el diseño y queda pendiente fuera de las tareas y del alcance D9–D12 autorizado en el handoff.

## Validaciones de la revisión 3

| Control | Resultado real |
|---|---|
| Vitest enfocado antes de implementar | BLOQUEADO por EPERM al abrir `vitest.mjs`. [04-rojo.txt](evidencias/04-rojo.txt) |
| `corepack pnpm exec vitest run --project unitarios --project web --testTimeout=30000` | BLOQUEADO. Salida 1. EPERM al abrir `el ejecutable`. |
| `corepack pnpm exec eslint .` | BLOQUEADO. Salida 1. EPERM al abrir `el ejecutable`. |
| `corepack pnpm -r exec tsc --noEmit` | BLOQUEADO. Salida 1. EPERM al abrir `el ejecutable`. |
| `corepack pnpm lint:deps` | BLOQUEADO. Salida 1. EPERM al abrir `el ejecutable`. |
| `corepack pnpm lint` | BLOQUEADO. Salida 1. EPERM al abrir `el ejecutable`. |
| `corepack pnpm test` | BLOQUEADO. Salida 1. EPERM al abrir `el ejecutable`. |
| `git diff --check -- apps/web/src/vistas/Web.tsx apps/web/src/vistas/webReal.test.tsx` | PASS. Salida 0. |
| Prueba manual en servidor | Pendiente por la restricción de iniciar servidores. |
| CLI de OpenSpec | BLOQUEADO por `CommandNotFoundException` para `status` e `instructions apply`. Se consultaron los artefactos locales. |

## Registro anterior · Revisión 1

En modo real, `/web` valida el teléfono antes de cotizar y lo envía como `IniciarTramite.payload.contacto`. El campo empieza vacío, admite de 10 a 15 dígitos y se bloquea durante el envío y mientras está disponible el reintento de esa misma cotización.

La entrega corresponde a `51e4df6` más el diff pendiente de los archivos indicados aquí. La autorización está registrada en `handoff.md` y se reiteró en la solicitud de implementar las tareas 1.1–1.3 de esta sesión.

### Archivos

- `apps/web/src/vistas/Web.tsx` incorpora la captura y validación del teléfono (D1).
- `apps/web/src/vistas/webReal.test.tsx` cubre teléfono, fecha, CURP y registro sin CURP con selectores mediante `ClienteReal` y un `fetch` falso.
- `apps/web/src/vistas/identidadAsesor.test.tsx` verifica que los pasos del asesor siguen enviando `callcenter` y `asesor:asesor1`.
- En este cambio se actualizaron `tasks.md` y este informe, y se agregaron `evidencias/01-rojo.txt` y los cuatro archivos `evidencias/02-*.txt`.

### Estado y bloqueos

- **1.1** Pruebas escritas antes del código de producto. La casilla registra la entrega de las pruebas con la excepción de ejecución por EPERM indicada en la sesión. El rojo queda sin confirmar.
- **1.2** D1 implementada. D2–D4 quedan pendientes. En `packages/domain/src/tipos/agendar.ts`, la prioridad remota de `web` coloca `horario` antes de `paciente`. Tras seleccionar sede, el dominio pregunta por el horario y aún puede faltar el paciente. Aplicar el criterio alternativo de D4 en ese punto expondría la continuación antes de cumplir el requisito IW.
- **1.2** En `packages/adapters/in-http/src/rutasComandos.ts`, `IdentificarPaciente` con actor `paciente` exige una credencial de contexto válida y vinculada al hilo, incluso en demo. `IniciarTramite` devuelve el trámite, la pregunta y los eventos, y `ClienteReal` carece de un flujo para obtener esa credencial. Con la API actual, el envío desde la web recibiría `STEP_UP_REQUERIDO`. Resolver ambos bloqueos requiere revisión del alcance.
- **1.3** Punto de control intentado sobre esta entrega parcial. Queda pendiente validarlo sobre el cambio completo. La prueba manual queda pendiente por la restricción de iniciar servidores.

### Validaciones

| Comando o comprobación | Resultado real | Evidencia |
|---|---|---|
| `corepack pnpm exec vitest run --project web apps/web/src/vistas/webReal.test.tsx apps/web/src/vistas/identidadAsesor.test.tsx --testTimeout=30000` | BLOQUEADO | [01-rojo.txt](evidencias/01-rojo.txt) |
| `corepack pnpm exec vitest run --project unitarios --project web --testTimeout=30000` | BLOQUEADO | [02-vitest.txt](evidencias/02-vitest.txt) |
| `corepack pnpm exec eslint .` | BLOQUEADO | [02-eslint.txt](evidencias/02-eslint.txt) |
| `corepack pnpm -r exec tsc --noEmit` | BLOQUEADO | [02-tsc.txt](evidencias/02-tsc.txt) |
| `corepack pnpm lint:deps` | BLOQUEADO | [02-lint-deps.txt](evidencias/02-lint-deps.txt) |
| `corepack pnpm lint` | BLOQUEADO | Salida 1. EPERM en `eslint/bin/eslint.js`, antes de comprobar tipos. |
| `corepack pnpm test` | BLOQUEADO | Salida 1. EPERM en `typescript/bin/tsc`, antes de Vitest. |
| `git diff --check -- apps/web/src/vistas/Web.tsx apps/web/src/vistas/webReal.test.tsx apps/web/src/vistas/identidadAsesor.test.tsx` | PASS | Salida 0 sin diagnósticos. |
| `openspec status --change web-identificacion --json` y `openspec instructions apply --change web-identificacion --json` | BLOQUEADO | PowerShell devolvió `CommandNotFoundException` y `corepack pnpm exec openspec list --json` devolvió `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`. Se leyeron los artefactos directamente. |
