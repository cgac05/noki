# Controles de la revisión 2

Base Git: e3d49ea en feat/clinica-alertas, con el diff descrito en manifiesto.md.

| Comando | Resultado |
|---|---|
| corepack pnpm lint | PASS. ESLint y TypeScript terminaron con código 0. |
| corepack pnpm lint:deps | PASS. 215 módulos y 649 dependencias, sin violaciones. |
| corepack pnpm test | PASS. 59 archivos y 339 pruebas. |
| corepack pnpm test:integracion | PASS. 16 archivos y 46 pruebas. |
| git diff --check | PASS. Sin errores de espacios en blanco. |

La integración usó PostgreSQL de prueba en 127.0.0.1:55432 (noki_test) y Redis local en 127.0.0.1:6379. La batería compartida comprobó posiciones, ausencia de intentos y límite de 50 en memoria y Postgres.
