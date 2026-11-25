# Controles de la revisión 1

Los controles se ejecutaron en serie en una copia temporal con los archivos del cambio y las dependencias del lockfile. El checkout devolvió `EPERM` al abrir el binario de Vitest. En la copia, el cargador predeterminado de Vite devolvió `Access is denied`; se usó `--configLoader native`. Un alias temporal a Corepack habilitó el `pnpm` que invoca internamente el script de lint.

| Control | Comando | Resultado |
|---|---|---|
| Lint global | `corepack pnpm lint` | Aprobado. ESLint y comprobación de tipos del workspace y las pruebas, 0 errores. |
| ESLint de archivos modificados | `corepack pnpm exec eslint <archivos TS modificados>` | Aprobado, 7 archivos, 0 errores. |
| TypeScript por paquete | `corepack pnpm exec tsc -p <paquete> --noEmit` | Aprobado en los 5 proyectos comprobados (dominio, aplicación, memoria, Postgres y pruebas). |
| Fronteras | `corepack pnpm lint:deps` | Aprobado, 255 módulos, 825 dependencias y 0 violaciones. |
| Núcleo | `corepack pnpm exec vitest run --configLoader native tests/unit/nucleo` | Aprobado, 92 pruebas en 10 archivos. |
| API y adaptador HTTP | `corepack pnpm exec vitest run --configLoader native tests/unit/api packages/adapters/in-http/test` | Aprobado, 72 pruebas en 20 archivos. |
| Integración HTTP/Postgres y puertos | `corepack pnpm exec vitest run --configLoader native --project integracion tests/integracion/llamadaRetomaTramite.test.ts tests/integracion/identidadPostgres.test.ts tests/integracion/puertosApiPostgres.test.ts` | Aprobado, 5 pruebas en 3 archivos usando `noki_test`. El escenario nuevo pasó también por separado, 1/1. |
| OpenSpec estricto | `npx --offline @fission-ai/openspec@1.14.0 validate llamada-retoma-tramite --type change --strict --no-interactive` | Omitido según la instrucción del usuario. npm devolvió `ENOTCACHED`. El mismo error impidió consultar `list`, `status` e `instructions apply` con esa versión. |
| Diff | `git diff --check` sobre los archivos versionados del alcance | Aprobado, 0 problemas. |
| Suite global | `corepack pnpm test --configLoader native` | Falló. La copia actualizada dio 487 pruebas aprobadas y 23 fallidas en 8 archivos web (80 archivos y 510 pruebas en total). La copia anterior dio 499 aprobadas y 3 fallidas en un archivo web. |
