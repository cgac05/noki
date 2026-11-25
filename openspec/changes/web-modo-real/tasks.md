# Tasks

Requisitos: CN = «Continuación solicitada por el paciente desde web», CW = «Cotización web en modo real», AR = «Actor de recepción por sede» (delta de `navegacion-canales`). Decisiones D1–D4 de `design.md`.

## 0. Núcleo (revisión 2)

- [x] 0.1 Pruebas en rojo de «Continuación solicitada por el paciente desde web» en `packages/application` (guarda) y en la prueba de integración de `out-postgres` (origen y método). Verificar: fallan; `evidencias/00-rojo.txt`.
- [x] 0.2 Implementar D5. Verificar: pasan 0.1 y las pruebas previas de continuidad del Call Center.

## 1. Web en modo real

- [x] 1.1 Escribir en rojo las pruebas de CW con el cliente real y `fetch` falso: orden de comandos, doble clic con un solo envío, precio del catálogo, código y enlace `/wa?continuar=`, sin el mensaje «no disponible». Verificar: fallan; `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar D1–D3 en `Web.tsx` conservando el modo simulado. Verificar: pasan 1.1 y las pruebas previas de `/web` en modo simulado.

## 2. Clínica

- [x] 2.1 Prueba en rojo de AR y corrección D4 en `LlegadaClinica.tsx`. Verificar: la prueba pasa.

## 3. Cierre

- [x] 3.1 Nota en `docs/trabajo-paralelo.md`: frente único desde el 2026-11-25 por decisión de Christian (`cgac05`), hasta la entrega.
- [x] 3.2 Punto de control: `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test`, `corepack pnpm test:integracion` (Postgres en 55432) y `VITE_API=real VITE_DEMO=true corepack pnpm --filter @noki/web build` con código 0; `evidencias/03-*.txt`.
