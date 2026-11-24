# Colaboración con OpenSpec

Claude Code analiza, diseña, planifica y revisa de forma independiente. Codex implementa lo autorizado, prueba y corrige. El usuario decide el alcance y autoriza implementación y cierre. Las instrucciones permanentes están en [CLAUDE.md](../CLAUDE.md) y [AGENTS.md](../AGENTS.md); las restricciones del producto están en [PLAN.md](../PLAN.md).

La colaboración ocurre mediante archivos compartidos en este repositorio. El usuario abre cada agente y le transfiere el ID del cambio. No hay orquestación automática, mensajería entre agentes ni ejecución del otro agente al guardar un archivo. Si usan checkouts distintos, el usuario debe transferir también los archivos actuales por su mecanismo habitual; el ID por sí solo no transfiere cambios.

## Varios responsables

El proyecto se divide en frentes con un responsable cada uno; la tabla vigente está en [trabajo-paralelo.md](trabajo-paralelo.md). En este protocolo, **"el usuario" de un cambio es el responsable del frente dueño de ese cambio**, registrado en el campo `Responsable` de su `handoff.md`:

- Solo el responsable del cambio autoriza su implementación y su cierre. La autorización de otro integrante no cuenta, aunque venga del mismo repositorio o del mismo agente.
- Un cambio que modifique archivos compartidos (según [trabajo-paralelo.md](trabajo-paralelo.md)) requiere la autorización de ambos responsables, registrada por separado en el handoff.
- Si cambia el responsable de un frente, se actualiza la tabla de [trabajo-paralelo.md](trabajo-paralelo.md) y el campo `Responsable` de los cambios abiertos; las autorizaciones ya registradas conservan su alcance.
- Los agentes identifican a quién preguntar por el campo `Responsable`; si falta, o si quien escribe en el chat indica que no es ese responsable, se detienen y preguntan.

## Configuración y comandos

Configuración comprobada con **OpenSpec 1.14.0**, esquema `spec-driven`, perfil global `custom` y entrega `both`. El perfil de esta máquina selecciona los doce workflows compatibles. Claude recibe habilidades en `.claude/skills/` y comandos en `.claude/commands/opsx/`; Codex recibe habilidades en `.agents/skills/`. Codex es una integración de habilidades: no requiere comandos ni prompts bajo `.codex/`.

Los comandos siguientes se escriben **en el chat del agente**, desde este proyecto. Sustituye `<id>` por el ID real del cambio.

| Etapa | Claude Code | Codex | Responsable habitual |
|---|---|---|---|
| Exploración | `/opsx:explore` | `$openspec-explore` | Claude |
| Propuesta, especificación, diseño y tareas | `/opsx:propose <necesidad>` | `$openspec-propose <necesidad>` | Claude |
| Revisión de planificación | `/opsx:update <id>` | `$openspec-update-change <id>` | Claude |
| Implementación y correcciones | `/opsx:apply <id>` | `$openspec-apply-change <id>` | Codex |
| Verificación | `/opsx:verify <id>` | `$openspec-verify-change <id>` | Claude, independiente de Codex |
| Sincronización | `/opsx:sync <id>` | `$openspec-sync-specs <id>` | Claude, con autorización |
| Archivado | `/opsx:archive <id>` | `$openspec-archive-change <id>` | Claude, con autorización |
| Inicio de planificación paso a paso | `/opsx:new <id>` | `$openspec-new-change <id>` | Claude |
| Siguiente artefacto | `/opsx:continue <id>` | `$openspec-continue-change <id>` | Claude |
| Completar planificación | `/opsx:ff <id>` | `$openspec-ff-change <id>` | Claude |
| Archivado múltiple | `/opsx:bulk-archive` | `$openspec-bulk-archive-change` | Claude, autorización por cambio |
| Recorrido guiado opcional | `/opsx:onboard` | `$openspec-onboard` | Usuario dirige y conserva los roles |

La disponibilidad de una habilidad no cambia el rol: Claude no aplica código y Codex no aprueba ni cierra su propia implementación. `propose` genera `proposal.md`, `specs/<capacidad>/spec.md`, `design.md` cuando lo exige el esquema y `tasks.md`. Esas etapas son artefactos, no workflows inventados como `design` o `plan`. No crear requisitos ficticios para tareas sin cambio de comportamiento; seguir las opciones oficiales que indique el CLI para ese caso.

En la **terminal**, estos son comandos reales de inspección y validación:

```powershell
openspec --version
openspec config get profile
openspec config get delivery
openspec config get workflows
openspec schemas --json
openspec list --json
openspec list --specs --json
openspec status --change <id> --json
openspec instructions apply --change <id> --json
openspec validate <id> --type change --strict --no-interactive
openspec validate --all --strict --no-interactive
openspec doctor --json
```

`openspec validate` comprueba la estructura de los artefactos; no ejecuta pruebas del producto ni sustituye la revisión independiente. `verify` es un workflow del agente: no existe un subcomando de terminal `openspec verify` en esta versión. El estado de artefactos de `status` tampoco prueba corrección ni autorización.

Para reproducir o cambiar la selección en otra máquina, usa `openspec config profile`, selecciona entrega `both` y los doce workflows de la tabla; después ejecuta `openspec update` desde el proyecto. El perfil y la entrega son **globales a la máquina**, no propiedades de `openspec/config.yaml`; afectan futuras regeneraciones de otros proyectos. En esta configuración se conservaron `custom` y `both`, se amplió la lista mediante `openspec config set workflows` y se generaron las integraciones con `openspec update`. El YAML local conserva `schema`, `context`, `rules` y `operations.apply/archive.guidance`, que esta versión admite. Las orientaciones de operaciones son instrucciones consultivas, no un bloqueo técnico del CLI.

Los cinco workflows adicionales (`new`, `continue`, `ff`, `bulk-archive`, `onboard`) están habilitados. Para el hackatón, el camino habitual sigue siendo `explore → propose → apply → verify → archive`. `new → continue` permite revisar artefactos de uno en uno y `ff` completa la planificación pendiente; ninguno autoriza implementar. `bulk-archive` exige revisión y autorización para cada cambio seleccionado. `onboard` es opcional y propone trabajo real: no invocarlo para esta configuración ni para crear funcionalidades ficticias; si se usa, respetar la separación de roles y las autorizaciones de implementación y cierre. No reinstalar OpenSpec, ejecutar `init` de nuevo ni editar manualmente los archivos generados para mantener este protocolo.

## Ciclo y autorizaciones

1. El usuario comunica a Claude una necesidad real. Claude usa `explore` para analizar alternativas y restricciones.
2. Claude usa `propose` para preparar el cambio y presenta sus artefactos para revisión. Si necesitan ajustes, usa `update`, sin tocar código del producto.
3. El usuario autoriza explícitamente el ID, alcance y revisión de esos artefactos. Claude registra en `handoff.md` la referencia a esa decisión y prepara la transferencia a Codex. Si aún no existe autorización, queda `PENDIENTE` y Codex no implementa.
4. El usuario abre Codex e indica el ID autorizado. Codex lee el handoff y los artefactos resueltos por el CLI, implementa con `apply`, actualiza las tareas y ejecuta las validaciones aplicables.
5. Codex entrega `implementacion.md`. Claude revisa de forma independiente con `verify`, inspecciona el diff y la evidencia, y guarda `revision.md`.
6. Con hallazgos, Claude documenta correcciones; Codex las aplica dentro del alcance autorizado y actualiza el informe y su evidencia. Claude vuelve a verificar. Repetir hasta resolver los hallazgos de aceptación.
7. Con revisión suficiente, Claude recomienda el cierre. El usuario autoriza explícitamente cerrar el ID y la revisión verificada. Claude registra la decisión en `handoff.md`, sincroniza y archiva según corresponda, y verifica el resultado.

Una autorización explícita ya dada no se solicita de nuevo: se referencia y se respeta su alcance. Ningún agente puede emitirla por el usuario. Con varios frentes, "el usuario" es el responsable del cambio según la sección "Varios responsables", y la referencia registrada indica quién autorizó. Registrar fecha, alcance, revisión de archivos autorizada y referencia al mensaje o decisión real; no inventar enlaces ni IDs de mensajes. Una referencia puede ser una cita breve de la instrucción del usuario. Con cambios sin commit, identificar la revisión por archivos y hashes de los artefactos autorizados; con commits, puede usarse una referencia Git más el diff pendiente. No se exige crear commits para transferir trabajo.

Cambios posteriores de requisitos, criterios de aceptación, alcance o decisiones arquitectónicas aprobadas invalidan la autorización de la parte afectada hasta una nueva decisión del usuario. Actualizar casillas o añadir resultados de pruebas no invalida por sí mismo la aprobación. Las decisiones menores compatibles se documentan en el informe de Codex. Nunca modificar requisitos para convertir un hallazgo en cumplimiento.

## Transferencias persistentes

El CLI identifica la raíz del cambio; en este proyecto será normalmente `openspec/changes/<id>/`. Junto a sus artefactos se guardan hasta tres Markdown auxiliares, creados solo al llegar a la etapa correspondiente: `handoff.md`, `implementacion.md` y `revision.md`. Se archivan con el cambio y **no son artefactos nuevos del esquema**. No añadir propiedades de autorización a `.openspec.yaml` ni a `config.yaml`.

Usar los formatos siguientes como secciones breves. Referenciar los requisitos por su encabezado y los IDs de `tasks.md`, en lugar de duplicar su contenido. No crear archivos vacíos para cambios inexistentes.

### Claude → Codex: `handoff.md`

```markdown
# Transferencia: <id>

- Responsable: <frente y usuario de GitHub según trabajo-paralelo.md; segundo responsable si toca archivos compartidos>
- Objetivo: <una frase; referencia a proposal.md>
- Alcance autorizado: <referencias a secciones y exclusiones>
- Autorización de implementación: PENDIENTE | <decisión real del usuario, fecha y referencia>
- Revisión autorizada: <archivos y hashes o referencia Git con diff pendiente identificado>
- Artefactos a leer: <propuesta, specs, diseño cuando corresponda, tareas y secciones de PLAN.md>
- Tareas pendientes: <IDs de tasks.md; no copiar la lista>
- Restricciones: <referencias y condiciones específicas del cambio>
- Criterios de aceptación: <requisitos y escenarios pertinentes>
- Validaciones requeridas: <comandos y comprobaciones observables; prerrequisitos>
- Detener la parte afectada si: <contradicción, decisión no autorizada o bloqueo concreto>
- Autorización de cierre: PENDIENTE | <decisión real del usuario y revisión cubierta>
```

### Codex → Claude: `implementacion.md`

```markdown
# Implementación: <id>

- Resumen: <comportamiento entregado>
- Revisión entregada: <referencia Git y diff pendiente, o archivos con hashes>
- Archivos modificados: <rutas; incluir archivos nuevos y evidencia fuera del control de versiones>
- Tareas: <IDs completados y pendientes; el estado vive en tasks.md>
- Decisiones y desviaciones del diseño: <ninguna, o detalle y autorización si la requiere>
- Riesgos, limitaciones y bloqueos: <pendientes reales>

| Validación / tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| <referencia> | <comando exacto o pasos manuales> | <PASS / FAIL / BLOQUEADO / NO APLICA y motivo> | <archivo, salida resumida o captura sin datos personales> |

- Correcciones: <ID de hallazgo → archivos y validación actualizada, si aplica>
```

La evidencia identifica la revisión probada y conserva el error o resultado real. Puede ser una salida breve en el mismo informe; guardar logs grandes solo si ayudan a reproducir o investigar. No incluir secretos ni datos personales. Tras cambios relevantes, actualizar los resultados afectados; no presentar pruebas de una revisión anterior como evidencia actual.

### Revisión independiente de Claude: `revision.md`

```markdown
# Revisión: <id>

- Dictamen: PASS | FAIL | BLOCKED
- Revisión inspeccionada: <referencia a la revisión entregada y cambios posteriores>
- Cobertura: <requisitos, tareas, archivos y dependencias revisadas>
- Evidencia comprobada independientemente: <diff, comandos y resultados; separar evidencia de Codex>
- Controles no ejecutados: <cuáles y por qué; NO APLICA cuando corresponda>

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | <CRITICAL / WARNING / SUGGESTION> | <referencia> | <ruta:línea, prueba o salida> | <acción verificable> |

- Condiciones para recomendar el cierre: <correcciones, controles y riesgos residuales>
- Próximo responsable: <Codex, usuario o Claude; acción concreta>
```

`PASS`: cumplimiento demostrado y controles aplicables verificados, con riesgos residuales explícitos. `FAIL`: existe un incumplimiento demostrado que requiere corrección. `BLOCKED`: falta evidencia o un prerrequisito necesario para determinar el cumplimiento; si además hay fallos demostrados, usar `FAIL` y señalar también el bloqueo. `CRITICAL` bloquea el cierre; un `WARNING` que afecte la aceptación exige corrección o una decisión explícita del usuario, sin rebajar requisitos. `SUGGESTION` propone una mejora opcional. No convertir la falta de evidencia en `PASS`, ni un `PASS` en autorización del usuario.

En la siguiente vuelta conservar los IDs de hallazgos y actualizar su estado y evidencia. Si se amplía el alcance, volver a planificación y autorización para la parte afectada. Un hallazgo externo se informa al usuario sin incorporarlo automáticamente al cambio activo.

## Validación y cierre

En cambios de producto se ejecutan los controles de `AGENTS.md`: `pnpm lint`, `pnpm lint:deps`, `pnpm test`, las pruebas de integración aplicables y la prueba manual si cambia el demo. Si falta un script, dependencia o infraestructura, registrar `BLOQUEADO` con el motivo; no fabricar resultados ni eliminar pruebas. Para documentación o configuración, validar los archivos afectados y las capacidades disponibles sin inventar una funcionalidad que probar.

La revisión se limita al cambio y sus dependencias. Leer primero los artefactos e informes, buscar con rutas concretas, referenciar archivos en lugar de copiar conversaciones y repetir validaciones costosas únicamente por cambios relevantes, fallos o evidencia insuficiente. El informe de Codex no sustituye las comprobaciones independientes de Claude.

Después de la autorización de cierre, Claude usa `/opsx:archive <id>`, que comprueba los deltas y ofrece sincronizarlos. Puede usar antes `/opsx:sync <id>` si es necesario; no aplicar dos veces los mismos deltas y comprobar siempre el estado real. La autorización de cierre debe cubrir también la sincronización; si el usuario autorizó solo una de las acciones, respetar ese límite. No usar opciones de omisión de validación para eludir hallazgos. Después comprobar las specs con `openspec validate --specs --strict --no-interactive`, las tareas archivadas con `openspec validate --archived --no-interactive` y reportar la ruta real bajo `openspec/changes/archive/`. El archivado no crea un commit ni publica cambios remotos.

## Primer cambio

En Claude Code, desde este repositorio:

```text
/opsx:explore
```

Describe la necesidad real. Al terminar la exploración:

```text
/opsx:propose <descripción de la necesidad real>
```

Tras revisar los artefactos, comunica al agente: `Autorizo implementar <id> con el alcance y la revisión presentados. Registra esta decisión en handoff.md y prepara la transferencia a Codex.` Después abre Codex en el mismo repositorio y escribe:

```text
$openspec-apply-change <id>
```

Al terminar, vuelve a Claude con `/opsx:verify <id>` y pide guardar el dictamen en `revision.md`. Para correcciones, indica a Codex `Corrige los hallazgos H-... de revision.md del cambio <id>` y vuelve a verificar. Solo al aceptar el resultado, autoriza explícitamente sincronizar y archivar la revisión verificada y ejecuta `/opsx:archive <id>` con Claude.

Los marcadores `<id>` y `<descripción...>` se sustituyen; no son nombres de cambios de ejemplo que deban crearse. Si las habilidades o comandos no aparecen, recarga la sesión del agente después de comprobar los archivos de integración.

Referencias oficiales de la versión: [herramientas compatibles](https://github.com/Fission-AI/OpenSpec/blob/v1.14.0/docs/supported-tools.md), [configuración de proyecto](https://github.com/Fission-AI/OpenSpec/blob/v1.14.0/docs/customization.md) y [CLI](https://github.com/Fission-AI/OpenSpec/blob/v1.14.0/docs/cli.md).
