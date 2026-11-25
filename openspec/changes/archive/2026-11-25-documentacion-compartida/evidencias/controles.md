# Controles de documentacion-compartida

Revisión 1 sobre main 71f01f5. Los cuatro comandos terminaron con código 0.

| Comando | Resultado |
|---|---|
| corepack pnpm lint | PASS. ESLint y TypeScript. |
| corepack pnpm lint:deps | PASS. Fronteras hexagonales sin violaciones. |
| corepack pnpm test | PASS. 59 archivos y 341 pruebas. |
| corepack pnpm test:integracion | PASS. 16 archivos y 46 pruebas. |
| git diff --check | PASS. |

Se usó Postgres de prueba en 127.0.0.1:55432 con la base noki_test y Redis local en 127.0.0.1:6379.
