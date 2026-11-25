# Tasks

Requisitos: CI = `consolas-internas` «Continuar por WhatsApp con consentimiento»; SW = `simulador-whatsapp` «Continuación por enlace». Decisiones D1–D2.

- [x] 1.1 Escribir en rojo los escenarios «Enlace con el número de la llamada» (CI, en `apps/web/src/vistas/consolas.test.tsx`), «Enlace con número» y «Número inválido en el enlace» (SW, en `apps/web/src/vistas/wa.test.tsx`). Evidencia del rojo en `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar D1 en `CallCenter.tsx` y D2 en `Wa.tsx` sin revertir los cambios sin commit de `web-sesion`. Verificación: 1.1 en verde y las pruebas existentes de `/wa` y call center en verde.
- [x] 1.3 Controles en serie: `vitest run --project web`, `eslint` y `tsc --noEmit` de `apps/web`. Evidencia en `evidencias/`.
