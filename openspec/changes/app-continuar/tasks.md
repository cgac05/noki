# Tasks

Requisito: TA = `navegacion-canales` «Terminar en la app una cita en proceso».

- [x] 1.1 En rojo: los tres escenarios de TA en pruebas de `/app` (por ejemplo `appSesion.test.tsx`). Evidencia en `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar en `App.tsx` reutilizando `AsistenteCita` y la misma unión sin duplicados que `PanelPaciente` de `Web.tsx` (extraer la función a un módulo compartido si conviene). Verificación: 1.1 en verde y las pruebas de `/app` y `/web` existentes en verde.
- [x] 1.3 Controles en serie: `vitest run --project web --maxWorkers=2`, `eslint`, `tsc --noEmit` de `apps/web`. Si el sandbox lo bloquea, anotarlo: el revisor los corre.
