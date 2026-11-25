# Transferencia: callcenter-captura-visible

- Responsable: frente único por decisión de Christian (`cgac05`), 2026-11-25.
- Autorización de implementación: Christian, en el hilo del proyecto el 2026-11-25 a las 12:15 UTC: «no pasa la curp en el call center y si lo pongo por nombre pasa esto, para datos que son capturados como empleados y que no sn pin es necesario poder observarlos siempre y no que se sensuren durante la captura», con su pedido previo de orquestar a Codex. No autoriza commits.
- Alcance: `proposal.md`, D1–D3. Tareas 1.1–1.4.
- Restricciones: solo `apps/web/**` (sin `Wa.tsx`, `ChatWa.tsx`, `useConversacionWa.ts` ni archivos del flujo `/wa`) y esta carpeta. No tocar `packages/**`, `apps/api`, `openspec/changes/wa-una-pregunta/` ni `openspec/changes/web-modo-real/`. No reiniciar servidores ni borrar datos. `corepack pnpm`. Sin commits.
- Autorización de cierre: Christian, en el hilo del proyecto el 2026-11-25 a las 12:38 UTC, en respuesta a «responde autorizo cierre de web-modo-real y callcenter-captura-visible»: «autorizo cierre». Cubre el commit, la integración en `main`, la sincronización de specs y el archivado.
