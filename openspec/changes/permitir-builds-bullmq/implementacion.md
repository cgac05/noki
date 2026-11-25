# Implementación de permitir-builds-bullmq

La revisión 1 autorizada por ambos frentes agrega `msgpackr-extract: false` a `allowBuilds` en `pnpm-workspace.yaml`. Se aplicó sobre `feat/temporizadores` en `d7f7590`, con el trabajo previo sin commit. Los cuatro hashes iniciales coincidieron con el handoff. El diff de configuración contiene una sola línea. Se completaron 1.1 y 1.2.

| Validación | Comando | Resultado y evidencia |
|---|---|---|
| Instalación con BullMQ | `corepack pnpm install --frozen-lockfile` | PASS. Salida 0 con pnpm 11.25.0, sin `pnpm_config_strict_dep_builds` ni `pnpm_config_verify_deps_before_run`. La entrada en `allowBuilds` excluye la compilación nativa. |
| Main sin BullMQ (1.2) | `git archive origin/main`, extracción a un directorio temporal y `corepack pnpm install --frozen-lockfile --offline` con la misma línea | PASS. `origin/main` en `c9d18dd`, salida 0. Se reutilizaron 398 paquetes. Coincidieron las huellas del lockfile y del YAML antes y después de instalar. Se eliminó la copia temporal. |
| Controles estáticos | `corepack pnpm lint` y `corepack pnpm lint:deps` | PASS. Ambos terminaron con salida 0. Se verificaron 202 módulos y 582 dependencias sin violaciones. |
| Pruebas unitarias y web | `corepack pnpm test` | PASS. 280 pruebas en 51 archivos. |
| Integración | `corepack pnpm test:integracion` | PASS. 45 pruebas en 15 archivos, incluidas las cuatro de BullMQ, contra Postgres en `127.0.0.1:55432` y Redis local. |
| OpenSpec CLI | OpenSpec 1.14.0 mediante `npx --offline` | BLOQUEADO por `ENOTCACHED`. Se verificaron los hashes y los artefactos locales del cambio. |

Las huellas del YAML y del lockfile del árbol de trabajo coincidieron antes y después de los controles. La instalación con BullMQ se comprobó en el árbol actual, que ya tenía dependencias instaladas. La copia limpia temporal correspondió a `origin/main`. La comprobación de H-01 corresponde a este diff y queda lista para revisión independiente antes de la integración en el orden de D2.
