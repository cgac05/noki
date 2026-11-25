# Transferencia: web-modo-real

- Responsable: frente único, por decisión de Christian (`cgac05`) en el hilo del proyecto el 2026-11-25: «por los tiempos se decide un unico frente porque ya no estamos en construccion sino en definicion y tenemos 1 hora para lograr embonar todo». `LuisMaster119` no autorizó este cambio por escrito; queda como riesgo de gobierno registrado.
- Objetivo y alcance: `proposal.md` (What Changes, sin «Fuera de alcance»); design D1–D4.
- Autorización de implementación: Christian, en el mismo hilo, el 2026-11-25: «para ambos casos orquesta tu como agente de programacion a codex para resolverlo», más la decisión de frente único citada arriba. No autoriza commits.
- Autorización de la revisión 2 (núcleo, D5): Christian, en el hilo, el 2026-11-25 a las 12:04 UTC, en respuesta a «Necesito tu OK para tocar el núcleo»: «autorizo núcleo». Cubre solo los dos puntos de D5. No autoriza commits.
- Tareas pendientes: 0.1–3.2 de `tasks.md`.
- Restricciones: solo `apps/web/**`, `packages/application/src/CasosTramite.ts`, `packages/adapters/out-postgres/src/LecturasComandosPostgres.ts` y sus pruebas, `docs/trabajo-paralelo.md` y esta carpeta. No tocar `packages/contracts`, otros archivos de `packages/`, `apps/api`, ni `openspec/changes/wa-una-pregunta/` ni archivos del flujo `/wa`. No reiniciar servidores en marcha. Usar `corepack pnpm`. No crear commits.
- Detener si hace falta cambiar contratos o API.
- Autorización de cierre: Christian, en el hilo del proyecto el 2026-11-25 a las 12:38 UTC, en respuesta a «responde autorizo cierre de web-modo-real y callcenter-captura-visible»: «autorizo cierre». Cubre el commit, la integración en `main`, la sincronización de specs y el archivado.
