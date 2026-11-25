# Validaciones de la revisión 1

| Control | Resultado |
|---|---|
| Vitest en rojo, archivos nuevos o ampliados | BLOQUEADO. Salida 1, 0 casos ejecutados. EPERM al abrir vitest.mjs. Se intentó antes de editar producto. |
| Vitest unitario en verde, núcleo, API y contratos | BLOQUEADO. Salida 1, 0 casos ejecutados. EPERM al abrir vitest.mjs. |
| Vitest de integración, identidadPostgres y comandosHttp | BLOQUEADO. Salida 1, 0 casos ejecutados. EPERM al abrir vitest.mjs. No llegó a PostgreSQL ni Redis. |
| ESLint de los seis archivos TypeScript | BLOQUEADO. Salida 1, 0 archivos analizados. EPERM al abrir eslint.js. |
| TypeScript de contracts, application y api | BLOQUEADO. 3 ejecuciones con salida 1, 0 proyectos analizados. EPERM al abrir tsc. |
| Controles de repositorio | lint, lint:deps y test, 3 salidas 1. EPERM al abrir eslint.js, dependency-cruise.mjs y tsc, respectivamente. |
| CLI OpenSpec | BLOQUEADO. PowerShell no encontró openspec. Los cuatro hashes de artefactos coincidían con el handoff antes de actualizar la casilla. |
| Comprobación manual de la ruta de demo | Pendiente. La instrucción de la tarea excluye arrancar servidores. |

## Comprobaciones directas con Node

- Se ejecutaron seis escenarios con CasosTramite y los adaptadores en memoria. Se usaron aserciones de Node y se sustituyó el módulo de zona horaria mediante una función que lanza si se invoca. Ninguno de los escenarios requirió esa función.
- Con CasosTramite de HEAD, 3 aprobados y 3 fallos esperados. El verificador alterado falló con CURP_INVALIDA, y la fecha y los nombres discordantes fallaron con CURP_NO_COINCIDE.
- Con el árbol de trabajo, 6 aprobados y 0 fallos. Los casos demo asignaron al paciente sin asociar la CURP al registro. Las tres guardas estrictas dieron los errores esperados.
- El patrón original rechazó el caso alfanumérico nuevo. El patrón actualizado aprobó 4 de 4 comprobaciones de formato. Esta comprobación no ejecutó Zod.
- La comprobación de sintaxis de Node pasó en 6 de 6 archivos TypeScript y git diff --check pasó para esos archivos. El diff de API registra una adición y cero eliminaciones por archivo.

La reproducción del estado rojo mediante Node se ejecutó después de editar producto y cargó la versión base sin modificar el checkout.
