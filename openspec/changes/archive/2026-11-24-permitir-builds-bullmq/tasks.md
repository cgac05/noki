# Tasks

## 1. Declaración y verificación

- [x] 1.1 Agregar `msgpackr-extract: false` en `allowBuilds` de `pnpm-workspace.yaml` (design D1) en el árbol actual de `C:\Users\guill\Documents\GitHub\noki` (rama `feat/temporizadores`, con su trabajo sin commit). Verificar "Extensión nativa opcional de BullMQ": `corepack pnpm install --frozen-lockfile` con salida 0 sin `pnpm_config_strict_dep_builds` ni `pnpm_config_verify_deps_before_run`, y `git diff pnpm-workspace.yaml` muestra solo esa línea (sin la provisional). Después `pnpm lint && pnpm lint:deps && pnpm test && pnpm test:integracion` en verde. Registrar salidas en `implementacion.md`.
- [x] 1.2 Verificar "Main sin BullMQ" sin cambiar de rama en este árbol: en un directorio temporal fuera del repositorio, `git archive origin/main | tar -x`, aplicar la misma línea y ejecutar `corepack pnpm install --frozen-lockfile --offline`; debe salir con 0 sin modificar `pnpm-lock.yaml`. Si la caché no permite `--offline`, registrar BLOQUEADO con el error real. Borrar el directorio temporal al terminar.
