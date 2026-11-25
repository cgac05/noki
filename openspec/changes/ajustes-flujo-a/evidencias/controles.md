# Controles 4.1

Todos los comandos salieron con código 0 en la rama feat/ajustes-flujo-a.

- `corepack pnpm install --frozen-lockfile` con pnpm 11.25.0.
- `corepack pnpm lint` con ESLint y TypeScript.
- `corepack pnpm lint:deps` con 206 módulos y 621 dependencias sin violaciones.
- `corepack pnpm test` con 312 pruebas en 55 archivos.
- `corepack pnpm test:integracion` con Postgres de prueba en el puerto 55432 y Redis. Pasaron 38 pruebas en 14 archivos.
- `git diff --check` sin observaciones.

## Repetición tras la primera revisión

Se repitió el control 4.1 sobre la revisión 1, con base c9d18dd.

- `corepack pnpm install --frozen-lockfile` con código 0.
- `corepack pnpm lint` con código 0.
- `corepack pnpm lint:deps` con 206 módulos y 621 dependencias sin violaciones.
- `corepack pnpm test` con 314 pruebas aprobadas en 55 archivos.
- `corepack pnpm test:integracion` con 38 pruebas aprobadas en 14 archivos. Se usaron Postgres de prueba en el puerto 55432 y Redis.
- `git diff --check` sin observaciones.
