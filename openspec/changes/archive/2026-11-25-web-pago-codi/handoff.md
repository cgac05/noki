# Transferencia: web-identificacion

- Responsable: frente único por decisión de Christian (`cgac05`), 2026-11-25.
- Autorización de implementación: pedido de Christian en el hilo del proyecto, 2026-11-25 12:44 UTC (cita en `proposal.md`). No autoriza commits.
- Alcance: `proposal.md`, D1–D4, tareas 1.1–1.3.
- Restricciones: solo `apps/web/**` (sin `CallCenter.tsx`, que edita `llamada-cortada` en paralelo, ni archivos del flujo `/wa`) y esta carpeta. No tocar `packages/**`, `apps/api`, otras carpetas de `openspec/changes` ni `../noki-identidad`. No iniciar servidores. `corepack pnpm`. Sin commits.
- Revisión 2 (D5–D8): decisión y autorización de Christian en el hilo, 2026-11-25 12:53 UTC (cita en `design.md`), confirmada por el coordinador. Amplía el alcance a `packages/adapters/in-http/src/rutasComandos.ts`, `packages/domain/src/tipos/agendar.ts` y sus pruebas.
- Revisión 3 (D9–D12): decisión de Christian 2026-11-25 12:55 UTC, autorizada por el coordinador. Solo `apps/web/**`; la revisión 2 queda sin implementar.
- D13: autorización explícita en la solicitud de esta sesión, 2026-11-25 («implementa SOLO D13 de design.md»). Abarca D13 de `design.md`, la tarea 3.4 y únicamente `Web.tsx`, `webReal.test.tsx` y esta carpeta. Incluye activación con Espacio y continuar si Vitest devuelve EPERM. Sin servidores, commits, push ni cambio de rama.
- Autorización de cierre: Christian, en el hilo del proyecto el 2026-11-25 a las 13:11 UTC, en respuesta a «responde autorizo cierre de llamada-cortada y web-pago»: «autorizo cierre». Cubre commit, integración en `main`, push, sincronización de specs y archivado.
