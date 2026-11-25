# Revisión: wa-numero-continuacion

## Vuelta 1 — 2026-11-25 (Claude)

**Dictamen: PASS.** Tareas 1.1–1.3 hechas por Codex con evidencia en `evidencias/`.

- `CallCenter.tsx`: el ANI sale del `IniciarTramite` de la pestaña solo si su respuesta es del mismo hilo (D1); el enlace y el QR usan la misma `rutaContinuacion` con `&numero=` codificado.
- `Wa.tsx`: valida `numero` con `^\d{10,15}$`, cambia de número antes de enviar y envía `CONTINUAR` con `historial.continuar(numero, codigo)` (lo mismo que hacía `conversacion.continuar`), luego reemplaza la URL por `/wa` (D2). Un número inválido se ignora.
- Controles del revisor: `vitest --project web` 233/233 (en serie), `eslint`, `tsc` de paquetes sin errores. El error de `tsc` en pruebas del núcleo es H-01 de `web-sesion` (externo).
- Pendiente: prueba manual en la demo tras integrar.
