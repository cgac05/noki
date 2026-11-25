# Implementación de callcenter-captura-visible

La captura asistida muestra la CURP, el nombre y los apellidos en claro dentro del formulario. Sexo y entidad de nacimiento se muestran como selectores accesibles que envían las claves del contrato. En modo asesor los PIN y OTP siguen ocultos y carecen de control para revelarlos. Solo `IdentificacionAsesor` activa el modo nuevo.

## Causa de la CURP

La fixture sintética que cumple el patrón del contrato tiene un dígito verificador incorrecto. En la API real, `IdentificarPaciente` respondió HTTP 422 y `CURP_INVALIDA`. El rechazo se origina en `CasosTramite.identificarCurp`, que llama a `validarCurp` en el dominio. La CURP válida de semilla pasó por el mismo flujo con HTTP 200 y avanzó a la casilla servicio. El dato que ocasionó el reporte original se desconoce. La corrección de un eventual problema del núcleo queda fuera del alcance. Se conservó la normalización web existente de mayúsculas y espacios exteriores.

## Archivos y decisiones

- `apps/web/src/componentes/IdentificacionAsesor.tsx` activa el modo de captura asistida.
- `apps/web/src/componentes/ModalFlow.tsx` renderiza los controles de captura por modo e incluye los selectores en el recorrido de foco.
- `apps/web/src/cliente/entidadesNacimiento.ts` contiene las 33 etiquetas exigidas por el contrato. Ordena los estados en español y deja el extranjero al final.
- `apps/web/src/vistas/identidadAsesor.test.tsx` cubre visibilidad, selección por etiqueta, claves enviadas y normalización de la CURP válida.
- `apps/web/src/componentes/ModalFlow.test.tsx` comprueba «Mostrar/Ocultar» cuando se omite la prop, como en WhatsApp.
- `tasks.md`, este informe y `evidencias/` registran los resultados.
- Revisión de trabajo sobre `0b59599` con diff pendiente. Autorización de Christian registrada en el handoff y ratificada por la instrucción de esta sesión de implementar 1.1–1.4.

## Validaciones

| Tarea | Comando o comprobación | Resultado | Evidencia |
|---|---|---|---|
| 1.1 | POST /api/comandos con un trámite nuevo de demo y dos variantes de CURP en trámites separados | PASS. La CURP de semilla avanza. La fixture de formato se rechaza. | [01-curp.txt](evidencias/01-curp.txt) |
| 1.2 | Vitest focalizado antes de editar el formulario | BLOQUEADO. Código 1, EPERM al abrir vitest.mjs. | [02-rojo.txt](evidencias/02-rojo.txt) |
| 1.3 | Vitest focalizado tras implementar | BLOQUEADO. Código 1, EPERM al abrir vitest.mjs. | [03-web.txt](evidencias/03-web.txt) |
| 1.4 | corepack pnpm lint | BLOQUEADO. Código 1, EPERM al abrir eslint.js. | [03-lint.txt](evidencias/03-lint.txt) |
| 1.4 | corepack pnpm lint:deps | BLOQUEADO. Código 1, EPERM al abrir dependency-cruise.mjs. | [03-deps.txt](evidencias/03-deps.txt) |
| 1.4 | corepack pnpm test | BLOQUEADO. Código 1, EPERM al abrir tsc. | [03-test.txt](evidencias/03-test.txt) |
| 1.4 | VITE_API=real VITE_DEMO=true corepack pnpm --filter @noki/web build | BLOQUEADO. Código 1, EPERM al abrir vite.js. | [03-build.txt](evidencias/03-build.txt) |

`git diff --check` pasó para los cuatro archivos rastreados editados en la web. La lectura directa de vitest.mjs con PowerShell también devolvió acceso denegado. La comprobación manual de la identificación se hizo por HTTP contra la API existente. Queda pendiente comprobar visualmente la captura nueva en el navegador. Los comandos `openspec status --change callcenter-captura-visible --json` y `openspec instructions apply --change callcenter-captura-visible --json` quedaron bloqueados por ausencia del CLI en el entorno. Se consultaron los artefactos locales.

Tarea 1.1 completada. Las tareas 1.2 y 1.3 tienen pruebas y código escritos, respectivamente, y quedan pendientes junto a 1.4 hasta que puedan ejecutarse sus validaciones.
