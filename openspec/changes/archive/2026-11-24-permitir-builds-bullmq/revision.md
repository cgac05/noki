# Revisión: permitir-builds-bullmq

- Dictamen: PASS
- Revisión inspeccionada: revisión 1 autorizada por ambos frentes (`handoff.md`); árbol sin commit de `feat/temporizadores` sobre `d7f7590` el 2026-11-25. `git diff pnpm-workspace.yaml`: una sola línea, `msgpackr-extract: false` en `allowBuilds`.
- Cobertura: requisito "Scripts de instalación declarados" y sus dos escenarios; design D1–D2; tareas 1.1–1.2.
- Evidencia comprobada independientemente (Claude):
  - `corepack pnpm install --frozen-lockfile` sin `pnpm_config_*`: salida 0; `pnpm-workspace.yaml` sigue con solo esa línea añadida (antes de este cambio, el mismo comando salía con 1 por `ERR_PNPM_IGNORED_BUILDS` y escribía una línea provisional).
  - `lint`, `lint:deps`, `test` (280) y `test:integracion` (45, Postgres `127.0.0.1:55432` y Redis): PASS con la línea aplicada.
  - `git diff --name-only d7f7590 origin/main` (`c9d18dd`): solo `apps/web` y `openspec/`; no toca `pnpm-workspace.yaml` ni `pnpm-lock.yaml`, así que la línea no choca con el trabajo del frente B.
- Evidencia de Codex (no repetida): "Main sin BullMQ" en una copia limpia de `origin/main` `c9d18dd` con `--frozen-lockfile --offline`, salida 0 y lockfile intacto.
- Controles no ejecutados: instalación en un clon recién creado de la rama completa; la del árbol actual reproducía el fallo antes de la línea y lo resuelve después, lo que basta para el escenario. CLI de OpenSpec: `validate --strict` pasó al preparar el cambio.

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| — | — | — | Sin hallazgos. | — |

- Condiciones para recomendar el cierre: integrar en `main` antes que `temporizadores` (design D2), con un commit que solo contenga `pnpm-workspace.yaml` y esta carpeta. Cierre autorizado por ambos frentes, porque es un cambio compartido.
- Próximo responsable: Christian (frente A) y Luis (frente B): autorizar el cierre.
