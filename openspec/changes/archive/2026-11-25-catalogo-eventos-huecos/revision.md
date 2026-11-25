# Revisión: catalogo-eventos-huecos

- Dictamen: PASS (revisión 2, tareas 1.1–3.1).
- Revisión inspeccionada: cambios sin commit en `feat/catalogo-eventos-huecos` sobre `d3c2a54` (rebasada en `origin/main` `0157047`), según `implementacion.md` y `evidencias/03-archivos-entregados.json`. Revisada por Claude el 2026-11-25.
- Cobertura: el requisito de `contratos-canales` «Eventos del relleno de huecos y de la predicción» y sus cuatro escenarios, D1–D4, las tareas 1.1–3.1 y el diff de `packages/domain/src/eventos.ts`, `tests/unit/dominio.test.ts` y `docs/eventos.md`. Dependencias contrastadas: `prediccion/nivel.ts` y D2 de `relleno-huecos` con su tabla de payloads.

## Evidencia comprobada independientemente

- **Artefactos.** `proposal.md`, `design.md` y el spec conservan los hashes autorizados. En `tasks.md` solo cambiaron las casillas: al desmarcarlas, el hash vuelve a `3177d3f044ff`. `openspec validate --strict` lo da por válido.
- **Alcance.** `git status` no muestra cambios fuera de los tres archivos autorizados y de la carpeta del cambio; solo aparece `.claude/launch.json`, que es preexistente. Los 22 hashes del manifiesto coinciden y `git diff --check` está limpio.
- **D1.** Los once payloads de huecos de `eventos.ts` quedan intactos. Las filas de `docs/eventos.md` coinciden campo por campo con ellos y con la tabla D2 de `relleno-huecos`.
- **D2.** La pertenencia documentada coincide con D2 de `relleno-huecos`. La nota de privacidad cumple `PLAN.md` §10.1.
- **D3.** `RiesgoEstimado` está en `EVENTOS_DOMINIO` (41 eventos) con `Pick<RiesgoEstimado, 'nivel' | 'probabilidad' | 'origen' | 'versionModelo'>`, que reutiliza los tipos del dominio y no duplica la envoltura.
- **D4.** La prueba lee el documento con `node:fs` solo en `tests/`. Comprobé que la prueba detecta desalineaciones: el documento produce 41 nombres únicos y, si se rompe el formato de una fila, quedan 40.
- **Escenarios cubiertos por pruebas:**
  - catálogo completo: conteo, nombres e igualdad de tipos;
  - payload de un evento nuevo: dos `@ts-expect-error` comprobados por `tsc`;
  - oferta sin datos de quien canceló: una prueba de tipos que exige `never` para `pacienteId`, `tramiteId` y `origenReservaId` en los payloads del candidato;
  - documento y código coinciden: igualdad de nombres y ausencia de los doce en «Familias reservadas».
- **Controles (Claude):**
  - `eslint .` y los dos `tsc` (paquetes y pruebas) terminan con código 0;
  - `lint:deps` no reporta violaciones (250 módulos);
  - `pnpm test`: 75 archivos y 447 pruebas en verde;
  - `pnpm test:integracion`: 18 archivos y 52 pruebas en verde, con PostgreSQL y Redis en Docker.
  - `corepack pnpm lint` no se ejecutó completo porque en este shell no hay `pnpm` en el PATH; ejecuté sus dos pasos por separado.
- **Evidencia de Codex (no repetida):** los estados en rojo de 1.1 (`01-rojo.txt`, `01-tipos-rojo.txt`) y el estado parcial de 1.2.

## Controles no ejecutados

- La prueba manual de la interfaz no aplica: no hay cambio de comportamiento ni de pantallas.

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | SUGGESTION (externo) | Fuera del alcance | `README.md:110` dice «27 eventos tipados» | El README ya estaba desfasado antes de este cambio (había 40 eventos) y ahora hay 41. Corregirlo en un cambio aparte que toque el README; no se incorpora aquí. |

No hay hallazgos CRITICAL ni WARNING.

## Riesgos residuales

- `RiesgoEstimado` está declarado, pero nadie lo emite hasta la T3.
- La prueba documental compara nombres, no campos: si se cambia un payload, hay que actualizar `docs/eventos.md` a mano (riesgo aceptado en `design.md`).
- El tipo no limita `probabilidad` al rango de 0 a 1; lo valida `nivelDesde` en el dominio.

## Condiciones para recomendar el cierre

- Recomiendo cerrar con esta revisión.
- Si otro cambio integra en `main` eventos nuevos o cambios en `tests/unit/dominio.test.ts` antes del cierre, hay que hacer rebase y repetir los controles.
- La autorización de cierre está PENDIENTE para ambos frentes, porque el cambio es compartido. Este PASS no es una autorización.

- Próximo responsable: el usuario. Debe autorizar el cierre (sincronizar el spec y archivar) por los frentes A y B, y decidir los commits.
