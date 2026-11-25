# Controles de idempotencia-wa

Revisión 1 sobre b66e393. Postgres de prueba en 127.0.0.1:55432 (noki_test) y Redis local en 127.0.0.1:6379.

| Comando | Resultado |
|---|---|
| corepack pnpm lint | PASS. ESLint y TypeScript. |
| corepack pnpm lint:deps | PASS. Sin violaciones de fronteras. |
| corepack pnpm test | PASS. 62 archivos y 353 pruebas. |
| corepack pnpm test:integracion | PASS. 17 archivos y 47 pruebas. |
| git diff --check | PASS. |

Antes de editar los adaptadores, las dos pruebas de claves duplicadas fallaron porque el guardado resolvió en lugar de rechazar. Tras activar el modo estricto, la regresión HTTP devolvió 500. La salida de esa ejecución está en 01-rojo.txt. Con la corrección, la misma prueba pasó en memoria y Postgres con HTTP 200, UUID v7 distintos, la misma correlación y ningún evento adicional al reintentar.
