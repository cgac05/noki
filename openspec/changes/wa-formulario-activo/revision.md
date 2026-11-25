# Revisión: wa-formulario-activo

## Vuelta 1 — 2026-11-25 (Claude)

**Dictamen: FAIL** (un hallazgo).

- **H-01 (alta, requisito FA y «Formulario estructurado» vigente):** `apps/web/src/vistas/flow.test.tsx` «cerrar después de un error borra los valores y elimina el reintento del historial» falla: tras un envío fallido del formulario y «Cancelar», «Abrir formulario» queda deshabilitado (`Unable to find a label with the text of: Fecha de nacimiento`). Evidencia: con el `ChatWa.tsx` de `HEAD` (stash temporal del diff) la prueba pasa 7/7; con el diff falla. Causa: `ultimoUsuario` cuenta la burbuja del usuario con `estado: 'error'` (envío no entregado y descartado), así que el Flow queda «antes» de la última respuesta. Corrección: al calcular la última entrada del usuario, ignorar las que no se entregaron (`estado === 'error'`), o las descartadas. Mantener los tres escenarios de FA y «Opciones de mensajes anteriores».
- Suite web con el árbol actual (`--maxWorkers=2`): 238/239; el único fallo es H-01.

## Vuelta 2 — 2026-11-25 (Claude)

**Dictamen: PASS.** H-01 corregido: `ultimoUsuario` ignora las burbujas con `estado === 'error'`. `flow.test.tsx` y `wa.test.tsx`: 27/27 (las corrió el revisor). Falta repetir la suite web completa junto con `app-sesion` antes de integrar.
