# Tasks

Requisito: IA = `navegacion-canales` «Identificación en la app de demo».

- [x] 1.1 En rojo: los cuatro escenarios de IA en pruebas de `/app` (cliente simulado y modo real si aplica). Evidencia en `evidencias/01-rojo.txt`.
- [x] 1.2 Extraer el formulario de identificación de `Web.tsx` a un componente compartido (sin cambiar el comportamiento de `/web`) y usarlo en `App.tsx`; `App.tsx` usa el `pacienteId` de `sesionWebDemo` en lugar de `contextoDemo`. Verificación: 1.1 en verde y las pruebas de `/web` y `/app` existentes en verde (ajustar las de `/app` que dependían del contexto de demo).
- [x] 1.3 Controles en serie: `vitest run --project web` (con `--maxWorkers=2` si hay timeouts), `eslint` y `tsc --noEmit` de `apps/web`.

Evidencia de 1.2 y 1.3: [Vitest](evidencias/02-vitest.txt), [ESLint](evidencias/03-eslint.txt) y [TypeScript](evidencias/04-tsc.txt).
