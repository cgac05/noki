# Implementación: esqueleto-canales

- Resumen: cuatro puntos de control implementados y validados en orden: siete rutas, cliente mock/real, guion fijo del Flujo A, vistas con contenido, QR, línea de tiempo, bandeja, navegación adaptable y documentación. Recorrido visual completo en móvil y escritorio; modo real sin API con error comprensible. Listo para revisión independiente de Claude.
- Revisión entregada: rama `feat/esqueleto-canales`, base `c9ba23fb5bbad5cfbe9aa10d2be23652163dcd76`, cambios sin commit. Los cinco hashes de planificación coinciden con el handoff antes de comenzar.
- Autorización: se mantiene la autorización de canales registrada en `handoff.md` y la instrucción «Avanza por los puntos de control en orden y registra cada uno en implementacion.md antes del siguiente». El bloqueo inicial de 1.2 queda resuelto con la autorización explícita de Christian Avila en el rol de `J3sus-esb`, trasladada a este chat el 2026-11-24 y registrada íntegra en el handoff; solo cubre el ajuste compartido de 1.2, conservando proyectos y comprobación TypeScript.
- Archivos modificados: `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/vite.config.ts`, `apps/web/src/App.tsx`, `apps/web/src/main.tsx`, `apps/web/src/styles.css`; nuevos `apps/web/src/rutas.tsx`, `apps/web/src/rutas.test.tsx`, `apps/web/src/componentes/{Layout,BarraDemo}.tsx` y `apps/web/src/vistas/{Portada,Web,Wa,App,CallCenter,Clinica,Admin,Bandeja,NoEncontrado}.tsx`; este informe y seguimiento en `tasks.md`.
- Tareas: 1.1–4.4 implementadas, validadas y marcadas en `tasks.md`: 20/20; `openspec instructions apply` devuelve `all_done`. No se cambia el contenido de requisitos ni criterios de aceptación.
- Decisiones y desviaciones del diseño: configuración local de Vitest en `apps/web/vite.config.ts` para ejecutar pruebas aisladas con `pnpm exec vitest run --root apps/web`, alternativa inicial indicada en el handoff que se conserva además de la integración raíz autorizada. Se conserva la identidad visual y el contenido de la portada. Sin cambios a contratos compartidos, eventos ni puertos. Sin agentes adicionales.
- Riesgos, limitaciones y bloqueos: autorización de 1.2 resuelta; sin cambios a responsables ni commits. La comprobación visual, bloqueada en la sesión anterior, se completó con el servidor Vite fuera del sandbox. Lecturas provisionales, autenticación/seguridad real y conexión Socket.IO siguen pendientes de los cambios del núcleo señalados en D4–D6. La revisión independiente y la autorización de cierre siguen pendientes. No se declara lista la integración a main: aún corresponden los controles de integración del proyecto antes de un merge.

## Punto de control 1 — PASS, registrado antes del punto 2

| Validación / tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| Revisión autorizada | SHA-256 de propuesta, diseño, tareas y ambos specs | PASS: coinciden los cinco prefijos del handoff | Base identificada arriba; tareas original `40e4197dd89b` |
| Prueba previa a implementación, 1.3 | `pnpm exec vitest run --root apps/web` | FAIL esperado: no existe `./rutas.tsx` | Ejecutado antes de crear rutas y vistas |
| Dependencias, 1.1 | `pnpm install --frozen-lockfile` | PASS: 14 proyectos; lockfile actualizado, sin resolución | Código 0; pnpm 11.25.0 |
| Fronteras, 1.1 | `pnpm lint:deps` | PASS: sin violaciones, 74 módulos y 92 dependencias | Código 0 |
| Integración compartida, 1.2 | `pnpm test` tras autorización y cambio raíz | PASS: conserva `unitarios`, `integracion` y el `tsc` previo; añade `web` | Código 0; 6 archivos, 29 pruebas (19 unitarias + 10 web) |
| Lint y tipos | `pnpm lint` | PASS: ESLint y TypeScript en todos los paquetes | Código 0 |
| Pruebas existentes y web | `pnpm test` | PASS: 6 archivos, 29 pruebas de `unitarios` y `web` | Código 0; ejecución conjunta tras modificar los dos archivos compartidos |
| Compilación | `pnpm --filter @noki/web build` | PASS: 128 módulos; aviso de Rollup por directiva `use client` de React Router ignorada | Código 0; JS 338.34 kB, gzip 105.74 kB |

- Incidencias de ejecución: el primer `pnpm add` falló con `EPERM` al crear el enlace del almacén de pnpm dentro del sandbox; repetir mediante la elevación autorizada permitió instalar. El primer servidor de desarrollo no pudo usar 5173 porque el puerto ya estaba ocupado; se usará un puerto alternativo sin detener procesos ajenos.
- Correcciones: las primeras pruebas con las vistas detectaron que el salto `<br>` de la portada concatenaba el nombre accesible; se añadió el espacio entre ambas líneas. La suite web volvió a pasar (10/10), tanto por separado como desde `pnpm test`. Verificación manual pendiente del punto 4.
- Archivos adicionales en esta reanudación: `vitest.config.ts`, `package.json` raíz (solo script `test`) y `handoff.md` (autorización). Validaciones repetidas en esta revisión: `pnpm lint` PASS, `pnpm lint:deps` PASS (74 módulos, 92 dependencias), `pnpm test` PASS (29/29), `pnpm --filter @noki/web build` PASS (128 módulos).

## Punto de control 2 — PASS, registrado antes del punto 3

- Archivos: nuevos `apps/web/src/cliente/{ClienteApi.ts,errores.ts,crearCliente.ts,ProveedorCliente.tsx,provisional.ts,cliente.test.ts,mock/datosWeb.ts,mock/guionFlujoA.ts,mock/ClienteMock.ts,real/ClienteReal.ts}` y `apps/web/src/vite-env.d.ts`; `main.tsx` conecta el proveedor y presenta errores de configuración; `apps/web/package.json` y lockfile declaran Zod 4.1.13, misma versión que contratos, según D6.
- Datos provisionales y acciones de presentación aislados en `provisional.ts`. El guion contiene nueve respuestas prefabricadas y una cotización web independiente; las vistas no calculan transiciones. El botón de transferencia del guion usa un payload fijo por el cliente de mensajes, sin crear un comando ni modificar contratos.
- Los tokens de las fixtures son opacos y ficticios; la firma y consumo real de tokens pertenecen al núcleo. `suscribir` real no abre conexiones; las consultas sin ruta prevista devuelven `NO_DISPONIBLE`, según D4. No se declara integración real probada.

| Validación / tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| Pruebas previas, 2.1–2.4 | `pnpm exec vitest run --project web apps/web/src/cliente/cliente.test.ts` antes de crear el cliente | FAIL esperado: falta `crearCliente.ts` | Suite escrita primero |
| 2.1–2.4, escenarios de cliente-api-canales | Mismo comando después de implementar | PASS: 17 pruebas | Modos, aislamiento de esquemas, las nueve fixtures y consultas, continuidad, eventos, reinicio, ayuda, idempotencia/reintento, 409, JSON y contratos inválidos, WA y consultas reales simuladas |
| Lint y tipos, 2.5 | `pnpm lint` | PASS | ESLint y TypeScript de todos los paquetes |
| Fronteras, 2.5 | `pnpm lint:deps` | PASS: 88 módulos y 140 dependencias, sin violaciones | Se eliminó una referencia triple-slash a `vite/client` que el resolvedor no reconocía y se declararon solo las dos variables locales |
| Todas las pruebas, 2.5 | `pnpm test` | PASS: 7 archivos, 46 pruebas | 19 unitarias existentes + 27 web |

- Incidencias corregidas: el primer control de tipos detectó la correlación genérica entre claves y esquemas Zod; se centralizó la validación con tipos derivados del mapa y sin `any`. La API pública de suscripción real conserva los parámetros tipados aunque todavía no conecte Socket.IO.

## Punto de control 3 — PASS, registrado antes del punto 4

- Archivos: vistas de los siete canales, `BarraDemo`, nuevos `MensajeBot`, `EntradaPregunta` (en el mismo módulo), `LineaTiempo`, `EstadoCarga`, `EstadoError`, `QrCita` y `formato.ts`; estilos existentes ampliados; nuevo `cliente/useAccion.ts`; pruebas `vistas/vistas.test.tsx` y `vistas/red.test.ts`; pruebas de rutas envueltas en el proveedor. El guion añade resumen de cotización y código de continuación a la ficha provisional.
- Decisiones menores: el cliente mock conserva la ayuda fuera del guion para consultarla desde la conversación; el reinicio cancela avances que todavía estaban esperando la latencia simulada. El hook de acciones conserva la clave cuando el usuario pulsa Reintentar. Las fechas de cita se formatean con la zona recibida (`America/Mazatlan`); los eventos sin zona de sede se etiquetan explícitamente en UTC. Las listas de mensajes mantienen sus secciones; los botones de la siguiente pregunta se presentan una sola vez.
- Los cuatro canales muestran estados entregados por el cliente. La verificación Flow es un aviso sin campos; el QR se genera con `qrcode.toString` y recibe solo el token. El contenido OTP se consulta y muestra únicamente en `/bandeja`. No se agregaron eventos ni puertos al núcleo.

| Validación / tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| Pruebas previas, 3.1–3.5 | `pnpm exec vitest run --project web apps/web/src/vistas/vistas.test.tsx` antes de crear componentes | FAIL esperado: falta `MensajeBot.tsx` | Pruebas escritas primero |
| 3.1–3.5 | Recorrido con Testing Library y cliente mock | PASS: 11 pruebas de vistas | Listas, aviso Flow sin captura, exactamente tres opciones con payload, ficha enmascarada, cuatro canales, QR con token, estado recibido, zona de Tepic, cotización web, bandeja, ayuda, carga/error y reintento con misma clave |
| 3.6 | Inspección del AST de `vistas/` y `componentes/` | PASS: una prueba | Falla ante identificador `fetch` o importación/uso de `socket.io` |
| Reinicio con acción pendiente | Suite del cliente | PASS: 18 pruebas de cliente | Una acción que espera la latencia no avanza el guion después de reiniciarlo |
| 3.7 | `pnpm lint && pnpm lint:deps && pnpm test` | PASS: comandos en secuencia, código 0 | 99 módulos, 202 dependencias, 9 archivos de pruebas, 59/59 pruebas (19 existentes + 40 web) |
| Compilación adicional | `pnpm --filter @noki/web build` | PASS: 239 módulos | JS 427.99 kB, gzip 133.83 kB; avisos de directivas `use client` ignoradas por Rollup en React Router/TanStack |
| Estilos, comprobación mecánica | `impeccable.cmd detect --json apps/web/src/styles.css apps/web/src/componentes apps/web/src/vistas` | PASS: salida `[]` | No sustituye el recorrido visual; sin agentes adicionales por AGENTS.md |

- Incidencias corregidas: la prueba de carga distinguió el estado de carga del indicador accesible de progreso de la barra; se ajustaron los tipos de la mutación (respuesta de comando o de WA) y la firma del cliente mock. No se eliminaron escenarios ni se omitieron pruebas.

## Punto de control 4 — PASS

- Nuevo `apps/web/README.md`: modos, comandos PowerShell, guion reproducible por una sola pestaña, fechas y precio de ejemplo, límites de los tokens ficticios, cotización web independiente, consultas reales previstas y lista completa de tipos provisionales. Se siguió el recorrido documentado en ambos tamaños, además de verificar Web y Bandeja. Detalle en `evidencias/recorrido.md`; mediciones sin datos personales en `evidencias/mediciones.json` y capturas de datos ficticios.

| Validación / tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| Compilación real, parte de 4.2 | `$env:VITE_API='real'; pnpm --filter @noki/web build` | PASS: sin modificar vistas; 239 módulos | Código 0; JS 427.99 kB, gzip 133.84 kB |
| Preparar recorrido mock, 4.1 | `$env:VITE_API='mock'; pnpm --filter @noki/web dev --host 127.0.0.1 --port 5175` | PASS: Vite listo en 127.0.0.1:5175 | Puerto alternativo porque 5173 estaba ocupado; servidor fuera del sandbox para permitir el acceso del navegador |
| Recorrido visual, 4.1 | Flujo A en 375 × 812 y 1280 × 900, foco, consola y recarga directa | PASS | `evidencias/recorrido.md`, 14 mediciones, nueve controles con foco visible; cero errores de consola mock; capturas de cita/QR |
| API ausente, parte de 4.2 | Abrir `/admin` con cliente real y URL sin API en 45999 | PASS | `evidencias/real-sin-api.jpg` y `.json`: error de red comprensible y Reintentar; sin datos de respaldo mock |
| Documentación, 4.3 | Seguir `apps/web/README.md`, guion y modos | PASS | Recorrido en navegador y compilaciones realizadas; tipos provisionales enumerados según su módulo |
| Control final, 4.4 | `pnpm install --frozen-lockfile && pnpm lint && pnpm lint:deps && pnpm test && pnpm --filter @noki/web build` | PASS: toda la secuencia termina en código 0 | pnpm 11.25.0, 14 proyectos, 467 entradas del lockfile; 99 módulos y 202 dependencias sin violaciones; 59/59 pruebas en 9 archivos; build de 239 módulos, JS 427.99 kB / gzip 133.84 kB |
| Estructura del cambio | `openspec validate esqueleto-canales --type change --strict --no-interactive` | PASS | `Change 'esqueleto-canales' is valid`; no sustituye la revisión independiente |
| Revisión de entrega | `git diff --check` y recomprobar SHA-256 del manifest | PASS | Sin errores de whitespace; todos los hashes de producto coinciden con `evidencias/revision-sha256.txt` |

- En la entrega inicial todavía no existía `revision.md`. Claude emitió después su revisión y resolvió H-01; las correcciones H-02–H-04 de la sección final se entregan para una nueva comprobación. No se ha sincronizado, archivado, creado commit ni publicado cambios por Codex.
- Se detuvieron los tres servidores temporales de Vite iniciados por Codex (5174 de la sesión anterior, 5175 mock y 5176 real) al terminar las comprobaciones; no se detuvieron los procesos que ya ocupaban 5173.

## Revisión entregada y archivos finales

- La referencia de la entrega inicial es la base Git indicada arriba más su diff pendiente y los archivos nuevos. `evidencias/revision-sha256.txt` identifica aquella revisión, anterior a H-02–H-04. La sección final indica el manifest nuevo para las correcciones. Los artefactos originales de propuesta/diseño/specs conservan los hashes autorizados.
- Además de los archivos enumerados por control, forman parte de la entrega `apps/web/README.md`, `evidencias/{recorrido.md,mediciones.json,real-sin-api.json,movil-app-qr-visible.jpg,escritorio-app.jpg,real-sin-api.jpg,revision-sha256.txt}` y las actualizaciones de `handoff.md`, `tasks.md` y este informe.
- La comprobación visual siguió la habilidad Impeccable conservando la identidad existente; no se generó un nuevo sistema visual ni se lanzaron revisores/agentes, por la prohibición explícita del proyecto. La revisión independiente se entrega a Claude mediante estos archivos.
- Estado de la entrega inicial: el texto anterior y sus evidencias corresponden a la implementación previa a la revisión. `revision.md` ya contiene el dictamen de Claude y H-01 resuelto; las correcciones posteriores se registran a continuación y requieren una nueva comprobación de Claude. El cierre necesita autorización posterior del usuario.

## Correcciones de revisión — H-02, H-03 y H-04

- Autorización: instrucción explícita del usuario en este chat el 2026-11-24, «Corrige los hallazgos H-02, H-03 y H-04 […] solo dentro de apps/web», además de este registro solicitado en `implementacion.md`. No se modifican archivos compartidos, planificación, handoff ni el dictamen independiente. No se crean commits.
- Revisión de partida: `feat/esqueleto-canales`, HEAD `99833d7067079d0ce9d5230256ce09c55bd3bac9`, con el diff previo del cambio conservado. Las casillas originales siguen en 20/20; `all_done` no sustituye esta corrección ni su validación.
- Archivos de esta corrección: `apps/web/README.md`, `apps/web/src/cliente/mock/datosWeb.ts`, `apps/web/src/cliente/cliente.test.ts`, `apps/web/src/vistas/vistas.test.tsx`, `apps/web/src/styles.css`; evidencias nuevas bajo `openspec/changes/esqueleto-canales/evidencias/h02-h04/` y esta sección del informe.

| Hallazgo | Corrección implementada | Validación y evidencia actuales |
|---|---|---|
| H-02 | README: detener y reiniciar la web antes de cada ensayo; `--force` si cambiaron dependencias, luego recargar la pestaña; explica Invalid hook call por caché vieja | Corregido por Codex: arranque nuevo con `pnpm --filter @noki/web dev --force --host 127.0.0.1 --port 5175`, salida `Forced re-optimization of dependencies`; recorridos sin errores de consola. Evidencia: `openspec/changes/esqueleto-canales/evidencias/h02-h04/recorrido.md` y `mediciones.json`. Pendiente revalidación de Claude |
| H-03 | Catálogo a 25000 centavos; la cotización reutiliza ese valor; fichas del guion ya reutilizan el catálogo; README y expectativa de presentación a $250.00 | Corregido por Codex: la prueba nueva falló primero con 55000; ahora 60/60 pruebas en verde. Se observaron $250.00 en Call Center y Web; no quedan 55000 ni $550.00 en el código/README web. Evidencia: `recorrido.md`, precio visible en `mediciones.json`. Pendiente revalidación de Claude |
| H-04 | Barra móvil con una fila de enlaces y desplazamiento interno, paso/reinicio visibles, controles de 44 px conservados; QR antes del detalle en móvil para dejarlo visible sin desplazar la página | Corregido por Codex: 14 mediciones de las siete rutas en 375 × 812 y 1280 × 900, sin desbordamiento horizontal del documento. QR completo al abrir App con scrollY=0: móvil y=352.2–576.2, encima de la barra en y=688.8; escritorio y=516.25–740.25. Siete enlaces ≥44 × 44 y ocho controles recorridos con foco visible. Evidencia: `movil-qr.jpg`, `escritorio-qr.jpg`, `mediciones.json`. Pendiente revalidación de Claude |

- Las capturas y hashes de la entrega inicial siguen como evidencia histórica. La nueva revisión y sus resultados se identificarán por separado en `openspec/changes/esqueleto-canales/evidencias/h02-h04/`.

| Control de correcciones | Resultado real | Evidencia |
|---|---|---|
| `pnpm lint` | PASS: ESLint y TypeScript | Secuencia completa termina en código 0 |
| `pnpm lint:deps` | PASS: 99 módulos, 202 dependencias, ninguna violación | `recorrido.md` |
| `pnpm test` | PASS: 9 archivos, 60/60 pruebas, sin pruebas omitidas | 19 unitarias existentes + 41 web; regresión nueva del precio y recorrido de vistas |
| `pnpm --filter @noki/web build` | PASS: 239 módulos; CSS 10.70 kB, JS 428.01 kB (gzip 133.84 kB) | Avisos conocidos `use client` de dependencias, sin error de compilación |
| Alcance y calidad | PASS: hashes de los archivos protegidos sin cambios; `git diff --check` sin errores; detector de estilos `[]` | `openspec/changes/esqueleto-canales/evidencias/h02-h04/archivos-protegidos.json` y `revision-sha256.txt` |

- Revisión entregada de las correcciones: HEAD `99833d7` más el diff previo conservado y los cinco archivos web identificados por SHA-256 en `openspec/changes/esqueleto-canales/evidencias/h02-h04/revision-sha256.txt`. No se cambian las casillas 20/20 ni el dictamen de `revision.md`. La evidencia anterior no se presenta como validación de este CSS ni del precio nuevo.
- Decisión menor de presentación: en móvil el QR se muestra antes del detalle de la cita, mediante orden visual de CSS; en escritorio se conserva la composición lateral. La fila de canales usa desplazamiento nativo, sin controles táctiles menores ni handlers de gestos propios. No se agrega lógica de negocio, dependencia ni contrato.
- Próximo responsable: Claude, volver a verificar H-02, H-03 y H-04 y los controles afectados. No se crean commits, no se sincroniza y no se archiva.

- Reubicación de evidencia (H-05, por Claude el 2026-11-24, con autorización del usuario «Sí, mueve y commit»): `apps/web/evidencias/h02-h04/` se movió sin modificaciones a `evidencias/h02-h04/` de este cambio; se actualizaron las referencias de este informe.
