# Revisión: llamada-cortada

**Dictamen: PASS con riesgos residuales.** Base `main` `51e4df6`, árbol local de `noki` el 2026-11-25.

| Control | Resultado |
|---|---|
| Diff contra D1–D4 | Conforme. Botón en `/callcenter`; `continuacionPorAni` solo usa continuaciones emitidas por asesor (`soloAsesor`), vigentes y sin usar. |
| H-01 (alta): ANI de 10 dígitos contra `waId` 521… no coincidía | Corregido con `normalizarTelefono` en ambos lados; pruebas nuevas en `llamadaCortadaWa.test.ts`. |
| `vitest` `tests/unit/api` | 57 verdes. |
| `eslint` de `apps/web`, `apps/api` y `packages/adapters`; `lint:deps` | Código 0. |
| `tsc -r` | Falla solo en `ContactosPostgres.ts` por el cambio en curso `llamada-retoma-tramite` de otro hilo, no por este. |
| Recorrido real | Pendiente en la demo tras integrar. |
