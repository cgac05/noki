# Tasks

Requisito: CA = «Captura de identificación por el asesor» (delta de `consolas-internas`). Decisiones D1–D3.

- [x] 1.1 Diagnóstico D3 de la CURP con la API real; causa y evidencia en `implementacion.md` y `evidencias/01-curp.txt`. Si la causa está fuera de `apps/web`, detener esa parte.
- [x] 1.2 Pruebas en rojo de CA (datos visibles, selectores con claves, CURP, `/wa` sin cambios). Verificar: fallan; `evidencias/02-rojo.txt`.
- [x] 1.3 Implementar D1–D3. Verificar: pasan 1.2 y las pruebas existentes de `ModalFlow` y `/wa`.
- [x] 1.4 Punto de control: `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test` y `VITE_API=real VITE_DEMO=true corepack pnpm --filter @noki/web build` con código 0; `evidencias/03-*.txt`.
