# Implementación de `wa-una-pregunta`

- Estado de la revisión 1: detenida antes de escribir código, en la tarea 1.1.
- Revisión inspeccionada: `claude/project-thread-kdenjy` en `0b59599`. Los cinco hashes coinciden con `handoff.md`, que registra la autorización de Christian Avila del 2026-11-25.
- Archivo agregado: este informe. Tareas completadas: 0 de 9. Pendientes: 1.1–5.2.

D5 inicia la secuencia en `100_000_000 + (segundosDesdeEpoch % 800_000_000)` y la incrementa de uno en uno. Si un arranque produce dos folios, `F` y `F + 1`, el arranque un segundo después inicia en `F + 1`, fuera del punto de vuelta del módulo. El delta de `agenda-simulada` exige que no se repita ningún folio entre arranques separados por al menos un segundo. El escenario de tres folios por arranque con diez segundos de separación puede pasar aunque persista el riesgo de colisión en Postgres.

La tarea 1.1 pide implementar D5. Cumplir la garantía del delta requiere revisar el diseño aprobado o ajustar el requisito. El protocolo reserva esa decisión a planificación y al responsable del frente A. El orden solicitado impide avanzar a la tarea 2.1 mientras la 1.1 esté detenida.

| Validación | Resultado |
|---|---|
| Hashes de la revisión | 5 de 5 coinciden con el handoff |
| `openspec status`, `openspec instructions apply`, `openspec validate --strict` | 0 de 3 ejecutados. PowerShell devolvió `CommandNotFoundException` para `openspec` |
| Prueba roja 1.1, `lint`, `lint:deps`, pruebas unitarias, integración y recorrido 5.2 | Pendientes por el bloqueo previo a la implementación. 0 ejecuciones por control |

## Revisión 2

- Autorización: Christian Avila, 2026-11-25, registrada en el handoff. Los cinco hashes coinciden con la revisión autorizada.
- Estado: pausa en 1.1, antes de editar código o pruebas. Tareas completadas: 0 de 9. Solo se actualizó este informe.

D5 corrige el solape entre arranques separados por un segundo. Persiste una contradicción en el alcance de la garantía: el requisito de `agenda-simulada` prohíbe repetir un folio de cualquier arranque anterior separado por `n ≥ 1` segundos si emitió menos de `1000 · n` folios. D5 documenta que el bloque se repite a los `899 999` segundos, sin que el requisito excluya ese caso. Si el primer arranque emite una sola cita y el segundo empieza un ciclo después, ambos emiten el mismo folio y se cumple el antecedente del requisito. Si la primera cita sigue en Postgres, puede volver a producirse la colisión que motivó el cambio.

La reproducción en Node de la fórmula aprobada dio `102000000` en el arranque inicial, `102001000` un segundo después y `102000000` un ciclo después. Resolver la contradicción requiere delimitar explícitamente la garantía del delta o revisar el mecanismo de asignación aprobado. El orden solicitado deja pendientes las tareas posteriores.

| Validación | Resultado |
|---|---|
| Hashes de los artefactos | 5 de 5 coinciden |
| Fórmula de D5 | 3 valores comprobados, 1 colisión entre arranques |
| OpenSpec `list`, `status`, `instructions apply` y `validate --strict` | 0 de 4 completados. `npx.cmd --offline` devolvió `ENOTCACHED` para `@fission-ai/openspec` |
| Prueba roja 1.1, `lint`, `lint:deps`, `test`, `test:integracion` y recorrido 5.2 | 0 ejecuciones por la pausa previa a la implementación |

## Revisión 3

- Autorización registrada en el handoff por Christian Avila el 2026-11-25 a las 11:51 UTC. Los cinco hashes aprobados coincidían antes de actualizar las casillas. Base `0b59599` en `claude/project-thread-kdenjy`. Cambios sin commit.
- Se aplicó D5 con un reloj inyectable y se comprobaron los arranques separados por uno y diez segundos. WhatsApp pregunta día y hora por separado, pagina los horarios y conserva la selección mientras falten requisitos o la identificación.
- El paso `DATOS` usa un Flow sensible de un campo para cada texto y opciones para sexo y entidad. Envía un solo comando con los datos completos y limpia los datos parciales. Si la agenda falla al confirmar, el bot explica el fallo y permite reintentar.
- La prueba de reinicio usa dos arranques de `sd-mock` con un segundo de separación y dos contactos ficticios. Se ejecuta después de las pruebas existentes de métricas para que sus dos citas no afecten las aserciones del Flujo A.

### Archivos de producto y pruebas

- `apps/sd-mock/src/crearSdMock.ts`
- `packages/adapters/in-http/src/ConversacionWa.ts`, `identificacionWa.ts` y `textosWa.ts`
- `tests/unit/api/preguntasWa.test.ts`, `bateriaIdempotenciaWa.ts`, `consultasWaMemoria.test.ts` e `identificacionWaHttp.test.ts`
- `tests/integracion/comandosHttp.test.ts` y `sdAgenda.test.ts`
- `tasks.md`, este informe y las evidencias del cambio

### Validación de los escenarios

| Tarea | Resultado real | Evidencia |
|---|---|---|
| 1.1 | Rojo 2 fallidas y 4 aprobadas. Verde 6 de 6 | [Folios](evidencias/00-folios.txt) |
| 2.1–2.2 | Rojo 5 fallidas. Verde 12 de 12 entre los escenarios nuevos y la regresión de horario en memoria | [Día y hora](evidencias/01-rojo.txt) |
| 3.1–3.2 | Rojo 4 fallidas y 5 aprobadas. Verde 15 de 15, con las 33 claves cubiertas | [Datos](evidencias/02-datos-rojo.txt) |
| 4.1 | Rojo 1 fallida. Verde 10 de 10 en la batería de preguntas | [Confirmación](evidencias/03-confirmacion.txt) |
| 4.2 | Postgres de prueba en 55432. Con D5 1 de 1 aprobada y con la fórmula anterior 1 de 1 fallida, en la segunda confirmación | [Reinicio](evidencias/03-confirmacion.txt) |

### Riesgos y decisiones

- D5 conserva el ciclo aprobado de 899 999 segundos. Dentro del mismo segundo se reutiliza el bloque. Un volumen fuera del supuesto de la demo también puede agotar el espacio disponible al final del rango de nueve dígitos.
- Día y hora consultan la disponibilidad vigente en cada paso. Si cambia entre páginas, el desplazamiento se aplica a la lista actual. La reserva vuelve a comprobar la disponibilidad.
- Las respuestas parciales de `DATOS` se guardan en el estado de la conversación mientras dura el paso, según D3. Se limpia el estado al enviar el comando, al cambiar de trámite o al dejar el paso.
- Los controles se reintentaron en una copia aislada de la base Git con los archivos del cambio y la instalación congelada por el mismo lockfile. El checkout compartido devolvió errores al cargar las dependencias. La copia usó un shim temporal de pnpm, el cargador `runner` de Vitest y la ejecución nativa de TypeScript de Node 24 para el runner de integración. La copia no incluye cambios concurrentes de otros trabajos.

### Controles finales y demo

| Control | Resultado real |
|---|---|
| `corepack pnpm lint` | PASS en la copia aislada con shim temporal de pnpm. 0 errores de ESLint y TypeScript |
| `corepack pnpm lint:deps` | PASS. 0 violaciones sobre 253 módulos y 813 dependencias |
| `corepack pnpm test --configLoader runner --no-file-parallelism` | PASS. 476 de 476 pruebas en 78 archivos. La corrida previa con archivos en paralelo registró 27 fallos web, entre ellos timeouts de 5000 ms. Se repitió sin editar web y con el mismo timeout |
| Runner de integración con Postgres desechable y Redis | PASS. 55 de 55 pruebas en 18 archivos. El runner se ejecutó con Node 24 y `--configLoader runner` en la copia aislada |
| OpenSpec estricto offline | Omitido según la instrucción del usuario. `ENOTCACHED`, 0 de 1 validaciones completadas. `status` e `instructions apply` devolvieron el mismo código |
| `git diff --check` | PASS. 0 incidencias |
| Recorrido real (5.2) | PASS. 1 recorrido, 16 intercambios y confirmación al primer intento. Número nuevo, registro sin CURP y tercer día ofrecido (viernes 27 de noviembre) |

La API activa mostró el flujo nuevo de WhatsApp. La consulta de solo lectura no permitió comprobar la longitud del folio del recorrido, por lo que la recarga del proceso de `sd-mock` en :4001 quedó sin confirmar. La regresión de reinicio y los folios de nueve dígitos sí se verificaron en integración. Los servicios de desarrollo siguieron activos.

Tareas completadas: 9 de 9. Evidencias de los [controles](evidencias/04-controles.txt) y del [recorrido](evidencias/05-recorrido.json). Pendiente la revisión independiente de Claude.
