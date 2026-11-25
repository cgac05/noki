# Revisión: wa-hora-mensaje

## Vuelta 1 — 2026-11-25 (Claude)

**Dictamen: PASS.** Tareas 1.1–1.3 con evidencia. `enviadoEn` es opcional en `EntradaSchema`: los historiales viejos cargan sin hora. Se asigna al crear la burbuja del usuario y cada mensaje del bot, y el reintento la conserva. `ChatWa` la muestra con `<time dateTime>` en formato HH:MM. El revisor repitió los controles: `tsc` de paquetes sin errores, `eslint apps/web` sin errores, `vitest --project web` 297/297. Pendiente: prueba visual en la demo.
