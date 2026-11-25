# Revisión: contratos-relleno-huecos

## Vuelta 1, frente A (Claude, 2026-11-25)

- **Dictamen: PASS.**
- **Alcance revisado:** revisión 1 (hashes del `handoff.md` sin cambios), implementada por Codex en `noki-identidad`, rama `claude/project-thread-nqfp68` (`77e5281` sobre `main` `230d246`), con el diff sin commit. Tareas 1.1–3.1 de `tasks.md`.
- **Requisitos:** `contratos-canales` («Tiempo real con nombres compartidos») y `contratos-consultas` («Modelos de lectura compartidos» y «Tabla de rutas de consulta»).

### Contraste

- **D1:** `wa:mensajes` está en `EVENTOS_SOCKET` y en `ESQUEMAS_EVENTOS_SOCKET` con `{ waId, mensajes }`. Reutiliza la validación de `waId` de `SolicitudMensajeWaSchema` (10–15 dígitos), acepta de 1 a 5 `MensajeBot` y descarta campos extra. Hay pruebas para 0, 5 y 6 mensajes, para un `waId` de 5 dígitos y para un campo `pacienteId` descartado.
- **D2:** `SalaSchema` acepta `wa:<10–15 dígitos>` y rechaza `wa:55-1234` y `wa:123`. El servidor de Socket.IO lo valida sin cambios en el frente A.
- **D3:** `HuecoVista` tiene los campos y estados del spec y descarta `pacienteId`, `nombre` y `canal` en el hueco y en la oferta. `panelHuecos` usa `/api/admin/huecos`, sin `soloDemo`, y acepta como máximo 50 elementos. El recorrido de claves sensibles incluye el hueco y su oferta. La tabla tiene 12 consultas.
- **D4 y D5:** las claves de KPI solo se documentan. El único cambio en `apps/web` es `panelHuecos: []`. No se tocó ningún archivo del frente A.
- **Documentación:** `docs/contratos.md` y `AGENTS.md` §7 son coherentes con D1–D4, con `PLAN.md` §10.1 y con `docs/eventos.md`. Se quitó la frase «No hay servidor Socket.IO en esta entrega», que ya era falsa desde `api-comandos`.
- **Archivos:** `git status` coincide con `proposal.md` (Impact) más la carpeta del cambio. La carpeta `openspec/changes/relleno-huecos/` es otro cambio sin commit y no forma parte de este. `contracts` sigue dependiendo solo de `zod`.

### Controles independientes

Ejecutados uno tras otro, sin otros procesos y con la configuración por defecto de Vitest (sin `VITEST_MAX_WORKERS`):

| Control | Resultado | Evidencia |
|---|---|---|
| `corepack pnpm lint` | código 0 | `evidencias/revision-lint.txt` |
| `corepack pnpm lint:deps` | código 0 | `evidencias/revision-deps.txt` |
| `corepack pnpm test` (dos corridas) | código 0, 414/414 en ambas | `evidencias/revision-test.txt`, `evidencias/revision-test2.txt` |
| `tests/integracion/ejecutar.ts` con Postgres de prueba en 55432 y Redis en 6379 | código 0, 47/47 | `evidencias/revision-integ.txt` |

### Hallazgos

- **H-01 (informativo, sin corrección):** los primeros intentos de Codex fallaron por tiempo (`Test timed out in 5000ms` en 8 pruebas web y `Hook timed out in 15000ms` en `comandosHttp.test.ts`), porque corrían en paralelo con los otros controles. Al repetirlos de forma secuencial y con la configuración por defecto, pasaron dos veces. Los fallos fueron en pruebas que este cambio no toca, y el cambio solo agrega esquemas, así que no hay inestabilidad atribuible a él. Queda como riesgo residual del proyecto: las pruebas web están cerca del límite de 5 s cuando la máquina está cargada, así que los controles de integración deben correr sin otros procesos pesados.
- **H-02 (sugerencia, baja):** el `.refine` de la sala `wa:` repite lo que ya valida `z.templateLiteral(['wa:', WaIdSchema])`. Es inofensivo y puede quedarse.
- **H-03 (integración):** la rama publicada `feat/contratos-relleno-huecos` (`1026f07`) solo difiere de esta en `handoff.md`, porque las dos registran la autorización del frente A. Ya está resuelto. El worktree está ahora en `feat/contratos-relleno-huecos` (`1026f07`, igual que el origen), con el `handoff.md` de Luis más una línea que registra la confirmación de Christian en el hilo. El resto del diff no cambió. No hay commit.

### Pendiente

- La revisión del frente B, que va en una vuelta propia en este archivo.
- La autorización de cierre de ambos frentes.
