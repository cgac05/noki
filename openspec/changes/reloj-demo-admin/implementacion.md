# Implementación: reloj-demo-admin

- Resumen: `/admin` ofrece el reloj únicamente cuando el cliente real tiene la demo habilitada. Incluye cuatro adelantos rápidos, minutos exactos, aviso global, hora local y UTC, bloqueo síncrono del doble envío, error y reintento manual con los mismos minutos. Valida entrada y respuesta con los contratos existentes y refresca las consultas y los eventos posteriores.
- Autorización: revisión 1 registrada en `handoff.md`, ratificada por la instrucción del usuario en esta sesión. Los cinco hashes de planificación coincidían antes de implementar. Sin autorización de commits ni cierre.
- Revisión entregada: rama `feat/reloj-demo-admin`, base `main` / HEAD `44c57f43a3d5341fe1a94940d1bb5ea999cf5711`, con diff sin commit. El manifiesto `evidencias/03-archivos-entregados.json` identifica los archivos finales mediante SHA-256. El backend usado coincide con `main`: sin diferencias en API, paquetes ni infraestructura.
- Tareas: 1.1–3.1 completadas (7/7); estado en `tasks.md`.

## Archivos modificados

- `apps/web/src/cliente/ClienteApi.ts`: capacidad opcional del reloj.
- `apps/web/src/cliente/real/ClienteReal.ts`: POST validado sin clave de idempotencia ni reintento automático; conserva el comportamiento anterior de comandos, consultas y WhatsApp.
- `apps/web/src/cliente/relojDemo.test.ts`: 11 pruebas de contrato, configuración, límites, errores y envío único ante fallo de red.
- `apps/web/src/componentes/RelojDemo.tsx`: sección con controles, candado, validación, hora, error y refresco.
- `apps/web/src/vistas/Admin.tsx`: monta la sección al final cuando existe la capacidad.
- `apps/web/src/vistas/relojDemo.test.tsx`: 9 pruebas de presentación, doble clic, rango, reintento, eventos y ausencia en mock.
- `apps/web/src/styles.css`: estilos acotados al reloj que conservan los patrones existentes.
- `apps/web/README.md`: configuración, temporizadores actuales y recuperación.
- `tasks.md`, este informe y `evidencias/*`: seguimiento y evidencia. La compilación generó además `apps/web/dist/*` (ignorado por Git), identificado en el manifiesto.

Los artefactos de planificación y `handoff.md` ya estaban presentes al comenzar. `.claude/launch.json` era un archivo ajeno sin seguimiento y no se modificó. No se cambiaron archivos compartidos ni el cliente simulado.

## Validación

Todos los comandos pnpm se ejecutaron mediante `corepack pnpm`. Los logs conservan los resultados reales, con las rutas absolutas sustituidas por referencias al repositorio.

| Validación / tarea | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 1.1 | `corepack pnpm exec vitest run --project web apps/web/src/cliente/relojDemo.test.ts` antes de implementar | PASS de fase roja: 11 fallos por capacidad ausente; salida 1 esperada | `evidencias/01-rojo.txt` |
| 1.2 | Mismo comando después de implementar | PASS: 11/11; salida 0 | `evidencias/01-verde.txt` |
| 2.1 | `corepack pnpm exec vitest run --project web apps/web/src/vistas/relojDemo.test.tsx` antes de implementar | PASS de fase roja: 8 fallos por sección ausente y 1 prueba de mock ya verde; salida 1 esperada | `evidencias/02-rojo.txt` |
| 2.2 | Ambas suites nuevas | PASS: 20/20; salida 0. La suite completa final también las incluye | `evidencias/02-verde.txt`, `evidencias/02-test.txt` |
| 2.2 accesibilidad | Árbol accesible, navegación con Tab y revisión visual a ambos tamaños; detector de diseño | PASS: región nombrada, etiqueta de minutos, aviso, rango, estado vivo, errores y foco visible. Detector sin hallazgos | `evidencias/02-diseno.json`, `evidencias/03-reloj-despues-*.jpg` |
| 2.3 | Revisión del README frente a D1–D3 y contratos existentes | PASS: distingue los tres temporizadores actuales de los recordatorios pendientes | `apps/web/README.md` |
| 2.4 lint | `corepack pnpm lint` | PASS, salida 0; incluye TypeScript de todos los paquetes y pruebas | `evidencias/02-lint.txt` |
| 2.4 dependencias | `corepack pnpm lint:deps` | PASS, salida 0; 222 módulos, 681 dependencias sin violaciones | `evidencias/02-lint-deps.txt` |
| 2.4 pruebas | `corepack pnpm test --maxWorkers=2` | PASS, salida 0; 64 archivos, 373 pruebas | `evidencias/02-test.txt` |
| 2.4 integración | `corepack pnpm test:integracion` | PASS, salida 0; 17 archivos, 47 pruebas contra Postgres y Redis locales; ninguna omitida | `evidencias/02-integracion.txt` |
| 2.4 compilación | `$env:VITE_API='real'; $env:VITE_DEMO='true'; corepack pnpm --filter @noki/web build` | PASS, salida 0 | `evidencias/02-build.txt` |
| 3.1 real | API de `main`, `/ready` con Postgres y Redis `ok`; web real con demo; reserva desde WhatsApp sin confirmar y botón `+15 min` | PASS a 1280 y 375 px, sin recargar. Se muestra la hora devuelta y llegan eventos `ReservaExpirada` | `evidencias/03-recorrido.json`, `evidencias/03-admin-*.jpg`, `evidencias/03-reloj-despues-*.jpg`, `evidencias/03-entorno.json` |
| 3.1 mock | Segunda web con `VITE_API=mock`, incluso con `VITE_DEMO=true` | PASS a 375 y 1280 px: cero secciones de reloj | `evidencias/03-mock-*.jpg`, `evidencias/03-recorrido.json` |
| Alcance y artefactos | `git diff --check`; `openspec validate reloj-demo-admin --type change --strict --no-interactive`; instrucciones apply | PASS; 7/7 tareas, `all_done`; modificaciones del trabajo limitadas a las dos raíces autorizadas | `evidencias/03-controles.json`, `evidencias/03-archivos-entregados.json` |

## Recorrido real

Se cotizó el paquete en Tepic desde Call Center y se continuó en WhatsApp. Allí se eligió un horario y se completaron requisitos e identificación ficticia, sin confirmar la cita. El tablero ya abierto recibió los efectos del adelanto:

- A 1280 px, `HORARIO_RESERVADO` pasó de 2 a 0 y `LISTO_PARA_RESERVAR` de 2 a 4: vencieron el hold recién creado y otro previamente existente. La hora devuelta fue `2026-11-25T07:12:17.482Z`.
- A 375 px, se volvió a apartar desde WhatsApp. `HORARIO_RESERVADO` pasó de 1 a 0 y `LISTO_PARA_RESERVAR` de 3 a 4; apareció otro `ReservaExpirada`. Además venció la tolerancia de una cita anterior y pasó a `NO_ASISTIO`, coherente con el alcance global del reloj. Hora devuelta: `2026-11-25T07:30:11.934Z`.
- Los controles se adaptaron al ancho móvil, con foco visible por teclado y sin desbordamiento horizontal del documento. La comprobación usó los eventos y consultas reales, sin interceptar respuestas ni usar fixtures de respaldo.

Las capturas muestran agregados y eventos sin tokens, fechas de nacimiento, teléfonos ni otros datos personales. El JSON contiene únicamente pasos, conteos, dimensiones y horas del sistema.

## Decisiones, incidencias y límites

- Sin desviaciones de D1–D3 ni cambios de contrato. El transporte compartido recibe una opción para desactivar el reintento solo en el reloj; los demás envíos conservan su política y sus claves.
- Se conservaron las clases visuales del tablero y se añadieron únicamente estilos del campo y las horas del reloj.
- La primera ejecución de lint detectó tipos opcionales incompatibles y opciones de pruebas no admitidas por TypeScript; se corrigieron. La ejecución final pasa.
- La ejecución simultánea inicial saturó el equipo y produjo timeouts. La suite completa final se ejecutó con dos workers. Se conservan los intentos anteriores en `evidencias/02-*-intento-1.txt`.
- La integración interrumpida dejó esquemas residuales en `noki_test`; el segundo intento los detectó y su limpieza de pruebas los retiró. Se inspeccionó que solo quedaba `public`, sin conexiones a esa base, y el siguiente intento pasó completo. No se modificaron pruebas, migraciones ni infraestructura para conseguirlo. Se conserva el segundo error en `evidencias/02-integracion-intento-2.txt`.
- La compilación avisa sobre directivas `use client` ignoradas y un chunk de 504,07 kB; termina con salida 0. No se amplió el alcance para dividir el bundle.
- El recorrido dejó el reloj de la API adelantado 30 minutos en total y las expiraciones aplicadas. No se reinició la demo después de comprobarla. El README explica `corepack pnpm demo:reset` y el reinicio de la API para devolver a cero el desfase en memoria.
- Sin bloqueos pendientes. No se crearon commits, se publicaron cambios, se sincronizaron specs ni se archivó el cambio.
- Correcciones de revisión independiente: no aplica; no existía `revision.md`. Próximo responsable: Claude, revisión independiente mediante `/opsx:verify reloj-demo-admin`; cierre aún pendiente de autorización.
