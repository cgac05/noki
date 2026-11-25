# Transferencia: marca-salud-digna-360

- Responsable: frente B (`LuisMaster119`). Solo toca `apps/web` y `pnpm-lock.yaml` (por la dependencia de la fuente). No toca archivos compartidos ni del frente A. Implementa Codex del frente B.
- Objetivo: presentar el prototipo como «Salud Digna 360» con la paleta y la tipografía de Salud Digna; ver `proposal.md` (Why).
- Alcance original de revisión 1: `proposal.md` (What Changes) y design D1–D4, sin lo listado en «Non-Goals» ni en «Fuera del cambio» de `proposal.md` (Impact). Alcance vigente de la barra: D5 y «Ajuste 3 vigente» al final de este archivo.
- Decisiones previas del usuario (2026-11-25, chat de Claude Code): «Solo lo visible» y «Como su sitio».
- Autorización de implementación del frente B: otorgada por `LuisMaster119` en el chat de Claude Code el 2026-11-25, en respuesta a "¿Autorizas por el frente B marca-salud-digna-360 con la revisión 1?". Cita: "Autorizo por B". Cubre la revisión 1 (hashes de abajo, comprobados sin cambios al registrarla) y que la implemente Codex del frente B. No autoriza commits.
- Estado de la revisión 1: autorizada; Codex implementó 1.1–4.1 (pendiente de revisión de Claude).
- Revisión 2 (2026-11-25): agrega el rediseño de la barra de demo (D5), a pedido de `LuisMaster119` («no se nota la separación entre los botones y tampoco entre la barra de simulación»), con el diseño aceptado en el chat («bueno»). Cambian:
  - `design.md`: Non-Goals y D5;
  - `specs/navegacion-canales/spec.md`: un párrafo y el escenario «Barra de demo con grupos separados»;
  - `tasks.md`: las tareas 5.1–5.3, y 4.1 se desmarca para repetirla al final.

  `proposal.md` no cambia. SHA-256 (12 primeros caracteres): `proposal.md` ce776578705c · `design.md` 8356480341ee · `tasks.md` 413176998ab6 · `specs/navegacion-canales/spec.md` 92097ef93c1d. `openspec validate --strict` → válido.
- Autorización de la revisión 2 del frente B: otorgada por `LuisMaster119` en el chat de Claude Code el 2026-11-25, en respuesta a "¿Autorizas por el frente B marca-salud-digna-360 con la revisión 2?". Cita: "Autorizo por B". Cubre la revisión 2 (hashes de arriba, comprobados sin cambios al registrarla), que Codex del frente B implemente 5.1–5.3 y que repita 4.1. No autoriza commits.
- Referencia de ejecución en Codex (2026-11-25): instrucción del responsable en esta sesión, «Implementa solo la revisión 2 autorizada en handoff.md: el grupo 5 de tasks.md (5.1–5.3, decisión D5 de design.md) y después repite 4.1». Se comprobaron los cuatro hashes de revisión 2 antes de modificar archivos. Se conserva el alcance de esa autorización, sin commits.
- Revisión presentada: revisión 1 en la rama `feat/marca-salud-digna-360`, sobre `main` `0b59599`. SHA-256 (12 primeros caracteres): `proposal.md` ce776578705c · `design.md` 83bcc2e93d2c · `tasks.md` df228f18212c · `specs/navegacion-canales/spec.md` c6cece683953. `openspec validate marca-salud-digna-360 --type change --strict --no-interactive` → válido.
- Artefactos a leer:
  - `proposal.md`, el spec, `design.md` y `tasks.md`;
  - `openspec/specs/navegacion-canales/spec.md` («Diseño móvil primero» y «Contenido mínimo por vista»);
  - `docs/trabajo-paralelo.md` (regla de `pnpm-lock.yaml`).
- Estado vigente de tareas: `tasks.md`; los grupos 1–3 son de revisión 1 y el grupo 5 incorpora el ajuste autorizado en esta sesión. 4.1 se repite después del grupo 5.
- Restricciones:
  - Solo `apps/web`, `pnpm-lock.yaml` y la carpeta del cambio.
  - No renombrar `@noki/*`, bases, claves de `sessionStorage` ni el repositorio.
  - No incluir el logo ni otros archivos gráficos de Salud Digna.
  - Ninguna petición a terceros desde la web.
  - No cambiar la disposición, los textos ni el comportamiento de las vistas más allá del nombre, salvo la presentación de la barra autorizada en D5 y su ajuste vigente.
  - Evidencia en la carpeta del cambio. No crear commits sin autorización.
- Criterios de aceptación: el requisito y los escenarios del delta de `navegacion-canales`; el requisito «Diseño móvil primero» se sigue cumpliendo; los guiones simulados y el modo real funcionan igual; `main` sigue en verde.
- Validaciones requeridas: 1.1 en rojo, el recorrido 3.2 y el control final 4.1. `pnpm test:integracion` no aplica.
- Detener la parte afectada si:
  - un color de D1 no alcanza el contraste exigido en un uso concreto: avisar en lugar de rebajar el requisito;
  - la fuente no se puede servir desde la aplicación sin pedir recursos a terceros.
- Autorización de cierre: PENDIENTE (frente B).

## Ajuste 3 vigente — autorizado en Codex (2026-11-25)

- El responsable pidió en esta sesión: «en la barra no marques los botones […] toda la barra del mismo color azul bajito […] pequeñas líneas verticales […] resalte de otro color diferente al seleccionar una opción».
- Ante la consulta explícita sobre una excepción a AGENTS.md §0 para actualizar aquí D5, las pruebas y la implementación, respondió: «Autorizo actualizarlo aquí». Esta autorización permite a Codex actualizar estos artefactos y aplicar esa variante; no es un mensaje ni una aprobación de Claude.
- Alcance vigente: solo la presentación de D5 y sus pruebas/evidencia (5.1–5.3), repitiendo 4.1. El fondo usa `--sd-fondo-suave`, los divisores `--borde-control`, el actual `--sd-accion` con texto blanco. Se conservan las acciones y el progreso accesible. Solo `apps/web` y esta carpeta; sin commits.
- Se actualizan propuesta, D5, delta y tareas para mantenerlos coherentes. Las tareas del grupo 5 se reabren para repetir rojo, implementación y recorrido. La evidencia anterior se conserva en `evidencias/revision-2/`; `05-*` contendrá el ajuste vigente.
- El resto de la revisión 2 conserva su autorización. El cierre y la revisión independiente siguen pendientes.
- Hashes del ajuste 3 antes de implementar (SHA-256, 12 primeros): proposal.md d76c53ff1661 · design.md 2ad8fe75595a · tasks.md 5d9dfb224a5b · specs/navegacion-canales/spec.md c139dccf175a. OpenSpec estricto: válido.

## Ajuste 4: presentación para exposiciones (2026-11-25, preparado por Claude)

- Origen: Claude recorrió las 8 rutas a 1280 × 800 y a 375 × 812 px y propuso las mejoras M1–M4 y G1–G7, solo de diseño. `LuisMaster119` había pedido «muéstrame esas mejoras y, dependiendo de cuáles te autorice, las realices; únicamente diseño, nada de funciones».
- Autorización del frente B: `LuisMaster119` eligió en el chat de Claude Code M1+M2, M3, M4, G1+G3, G2, G4 y G5, con la condición «no busco destruir la sinergia del diseño, pero tampoco busco que quede muy fuera de lugar», y pidió las instrucciones para Codex. G6 y G7 no se autorizaron. Cubre los artefactos con los hashes de abajo y que Codex del frente B implemente 6.1–6.3 y repita 4.1. No autoriza commits.
- Cambian:
  - `proposal.md`: What Changes e Impact;
  - `design.md`: D6;
  - `specs/navegacion-canales/spec.md`: el párrafo «Presentación para exposiciones» y los escenarios «Celular compacto», «Título visible al navegar», «Indicadores en tarjetas» y «Estado vacío»;
  - `tasks.md`: el grupo 6, y 4.1 se desmarca para repetirla.
- Hashes (SHA-256, 12 primeros): proposal.md 296f31d275fc · design.md 22e20a797204 · tasks.md 697974348dc1 · specs/navegacion-canales/spec.md a95704785abc. OpenSpec estricto: válido.
- Restricciones del ajuste: solo presentación (CSS y clases); sin cambiar textos, controles, consultas ni comportamiento; sin colores, sombras, íconos ni fuentes nuevas; solo `apps/web` y esta carpeta.
- Referencia de ejecución del ajuste 4 en Codex (2026-11-25): el responsable indicó en esta sesión «Implementa solo el ajuste 4 autorizado en handoff.md: el grupo 6 de tasks.md (6.1–6.3, decisión D6 de design.md) y después repite 4.1». Se comprobaron los cuatro hashes anteriores antes de modificar el producto. No se amplía el alcance ni se autorizan commits.
- Base de ejecución de 4.1: se rebasó en origin/main 51e4df6222fdcec0c099d1a0e053f3f80ca7e9fa conservando el trabajo previo. La resolución de Clínica retiene la guarda y sedeContextoId de main; el único cambio propio allí sigue siendo la clase estado-vacio. Se repitieron rojo, web y capturas antes/después en esta base. No se crearon commits de producto.

## Ajuste 5: acento verde de identidad (2026-11-25, preparado por Claude)

- Origen: `LuisMaster119` preguntó si cambiar a verde o conservar el azul. Claude recomendó conservar el azul para todo lo que se pulsa y sumar el verde en una línea de marca, en los mensajes de éxito y en las tarjetas de logro de Admin, con dos variables nuevas derivadas del logo.
- Autorización del frente B: `LuisMaster119` respondió en el chat de Claude Code: «si ves que no se rompe la interfaz que tengo, me gustaría implementar los cambios; primero dame las indicaciones para Codex». Cubre D7 tal como está escrito (hashes de abajo) y que Codex del frente B implemente 7.1–7.3 y repita 4.1, con la condición de no romper la interfaz de los ajustes 1–4. No autoriza commits.
- Cambian:
  - `proposal.md`: What Changes;
  - `design.md`: D7;
  - `specs/navegacion-canales/spec.md`: el párrafo «Acento verde de identidad» y su escenario;
  - `tasks.md`: el grupo 7, y 4.1 se desmarca para repetirla.
- Hashes (SHA-256, 12 primeros): proposal.md 6a65e5eb589c · design.md ea0c82919681 · tasks.md e4212cc46936 · specs/navegacion-canales/spec.md 4d99af95cdec · OpenSpec estricto: válido.
- Restricciones: solo presentación; el azul sigue en todos los controles; el verde nunca va en botones, enlaces ni controles; sin cambiar textos ni comportamiento; solo `apps/web` y esta carpeta.
- Aclaración del ajuste 5 en Codex (2026-11-25): ante la contradicción de que la marca ya es un enlace verde, el responsable eligió «Conservar marca verde como excepción». Solo .marca mantiene esa excepción de identidad; los demás enlaces, botones y controles siguen sin verde. Se verificaron los cuatro hashes del ajuste 5 antes de escribir y se actualizó la base a origin/main eedd179 sin crear commits.
- Referencia de ejecución del ajuste 5 (2026-11-25): el responsable indicó en esta sesión «Implementa solo el ajuste 5 autorizado en handoff.md: el grupo 7 de tasks.md (7.1–7.3, decisión D7 de design.md) y después repite 4.1». Durante el cierre, origin/main avanzó a f5260a8974a7f49ccc97a15a6b24938f3435bfe0 y se incorporó por avance rápido, sin cambios en apps/web ni conflictos. Se repite 4.1 en esa base; las evidencias anteriores se conservan. La autorización sigue limitada al ajuste 5, sin commits ni cierre.
- Pendiente de 4.1 en ajuste 5: lint y test fallan por TS2353 en `tests/unit/nucleo/casosTramite.test.ts:655`, ya presente en origin/main f5260a8 y fuera del alcance de D7. Lint:deps pasa. Ante el bloqueo, el responsable indicó «deja eso pendiente, después de esto voy a jalar los cambios hechos». 4.1 permanece sin marcar; repetir los tres controles después de incorporar la corrección de main. No se autorizaron cambios fuera del alcance ni commits.

## Autorización de subida a main (2026-11-25)

- Responsable del frente B: `LuisMaster119`. Cita comunicada por el usuario en esta sesión: «dile a codex que suba mis cambios». El usuario instruyó explícitamente crear el commit en `feat/marca-salud-digna-360`, integrar con `--no-ff` en main y publicar tanto main como la rama en origin.
- Esta autorización posterior permite el commit y los pushes indicados; comprende únicamente `apps/web`, `pnpm-lock.yaml` y `openspec/changes/marca-salud-digna-360/`. Se excluye `.claude/launch.json` y cualquier otra ruta. No permite cambiar comportamiento.
- `git fetch origin` confirmó que origin/main sigue en `f5260a8974a7f49ccc97a15a6b24938f3435bfe0`; no fue necesario stash ni actualizar la base de la rama. El stash de respaldo anterior se conserva intacto.
- Controles de subida autorizados: `corepack pnpm exec vitest run --project web`, `corepack pnpm exec eslint .` y `corepack pnpm lint:deps`, todos con código 0. Evidencia en `evidencias/08-subida-{web,eslint,deps}.txt` y `08-subida-resultados.json`.
- El TS2353 de `tests/unit/nucleo/casosTramite.test.ts:655` procede de main, frente A, y permanece externo y sin corregir. El usuario autorizó esta subida manteniendo ese pendiente; 4.1 continúa sin marcar y no se presenta como aprobado.
- **No es autorización de cierre.** El cambio sigue activo en `openspec/changes/marca-salud-digna-360/`, sin sincronizar ni archivar. La revisión independiente de Claude y la autorización de cierre del responsable siguen pendientes.
- Continuación autorizada (2026-11-25): tras informar de que `git diff --cached --check` detectaba espacios finales únicamente en logs y parches históricos de evidencia, el responsable indicó «continua y subelos». Se conservan esas salidas originales y se continúa con el commit y los pushes ya autorizados. Los tres controles de subida pasaron; no hay cambios de producto posteriores.
