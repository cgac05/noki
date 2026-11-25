# Implementación: marca-salud-digna-360 — ajuste 3 autorizado

- Resumen: la barra usa azul claro continuo, sin cajas en los canales, con seis divisores verticales cortos y el canal activo en azul de acción con texto blanco. El grupo del guion comparte el fondo y conserva «Simulación», estado anunciado y progreso accesible. Conserva las acciones del selector, el reinicio y la navegación. A menos de 768 px queda fija abajo y el compositor de WhatsApp permanece encima, sin desbordamiento horizontal de la página.
- Autorización aplicada: revisión 2 del frente B, registrada en `handoff.md` («Autorizo por B») y reiterada en esta sesión el 2026-11-25. Sus hashes iniciales coincidieron: propuesta `ce776578705c`, diseño `8356480341ee`, tareas `413176998ab6` y delta `92097ef93c1d`. Después el responsable pidió quitar las cajas y usar azul claro con divisores; ante la consulta explícita sobre actualizar aquí diseño, pruebas e implementación como excepción a AGENTS.md §0, respondió «Autorizo actualizarlo aquí». Se registró en el handoff y se actualizaron propuesta, D5, delta y tareas antes de aplicar el ajuste. No se atribuye esa planificación ni aprobación a Claude.
- Hashes del ajuste 3 antes de implementar: propuesta `d76c53ff1661`, diseño `2ad8fe75595a`, tareas `5d9dfb224a5b` y delta `c139dccf175a`. Los hashes entregados están en el manifiesto; las tareas cambian después al registrar la evidencia.
- Revisión entregada: rama `feat/marca-salud-digna-360`, HEAD `0b59599722ae1999ba24f61d7399b8a007b92bac`, más el diff sin commit y los archivos nuevos con SHA-256 en `evidencias/04-archivos-entregados.json`. `git fetch origin main` confirmó que HEAD, `main` y `origin/main` coinciden; no hay commits propios que rebasar.
- Archivos de producto modificados en esta ejecución: `apps/web/src/componentes/BarraDemo.tsx`, nuevo `apps/web/src/componentes/BarraDemo.test.tsx`, `apps/web/src/styles.css` y `apps/web/src/identidadVisual.test.ts`.
- Seguimiento y evidencia de esta ejecución: `handoff.md` (referencias reales de autorización), `proposal.md`, `design.md`, `specs/navegacion-canales/spec.md`, `tasks.md`, este informe, `evidencias/05-*`, `evidencias/barra.mjs`, `evidencias/04-*` y el manifiesto. La evidencia de la variante anterior está en `evidencias/revision-2/`. Las capturas, logs y archivos de planificación sin seguimiento también se enumeran en el manifiesto; este se excluye de su propio hash.
- Trabajo previo conservado: revisión 1 en `index.html`, `package.json`, `Layout.tsx`, `main.tsx`, `rutas.test.tsx` y `pnpm-lock.yaml`, con hashes idénticos a los del manifiesto anterior. La identidad visual previa en `styles.css` y sus pruebas se conserva y amplía para D5. No se añadieron colores ni dependencias en esta ejecución.
- Tareas de esta ejecución: 5.1, 5.2 y 5.3 completas para la variante inicial y repetidas para el ajuste autorizado; 4.1 repetida al final y completa. OpenSpec: 9/9 tareas. El estado vigente vive en `tasks.md`.
- Contratos: no cambian eventos, puertos, esquemas ni API. No se modificaron archivos del frente A ni documentación compartida.

## Decisiones menores compatibles con D5

- El progreso usa `<progress value={paso.numero} max={paso.total}>` con `aria-labelledby` hacia el texto que conserva `role="status"`. `useId` evita IDs duplicados; paso, total y título siguen viniendo del cliente.
- La franja ocupa todo el ancho y comparte el azul claro de los canales, sin borde horizontal verde ni recuadro en la etiqueta. Los divisores de 1 × 20 px son pseudo-elementos CSS decorativos entre los canales y no añaden controles al árbol accesible. En móvil se distribuyen los controles de simulación en dos columnas; el estado puede ocupar varias líneas y el reinicio queda a la derecha. Los canales mantienen la fila con desplazamiento interno prevista en D5.
- El canal activo conserva el fondo de acción y el texto blanco también al pasar el puntero; los demás muestran el fondo interactivo. El foco de 3 px mantiene espacio alrededor dentro de la fila móvil.
- Se conserva el `ResizeObserver` existente. La reserva inferior de la página y el compositor usan la altura medida de la barra, incluido su safe area; el punto de cambio móvil pasa de 640 a 768 px como pide D5. No se cambia la lógica de envío de WhatsApp.
- La prueba de identidad permite el verde en bordes y rellenos no textuales, según D5, y sigue prohibiéndolo en texto normal. Conserva los controles de contraste y de ausencia de colores sueltos y fuentes externas.
- El recorrido de navegador usa Playwright temporal ya instalado y Chrome local. Se añade un script reproducible de evidencia, sin modificar la configuración raíz ni las dependencias del proyecto.
- El cambio respecto a la revisión 2 (retirar cajas, franja blanca y borde verde) es la variante solicitada y autorizada por el usuario en esta sesión. No hay desviaciones arquitectónicas.

## Validación del ajuste 3

| Validación / tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 5.1 · D5 · rojo | `corepack pnpm exec vitest run --project web src/componentes/BarraDemo.test.tsx src/identidadVisual.test.ts` antes de implementar el ajuste | PASS del control de rojo: código 1; 1 fallo esperado por las cajas anteriores y 9 pruebas correctas. El rojo inicial de revisión 2 (4 fallos/6 correctas por ausencias) se conserva aparte | `evidencias/05-rojo.txt`, `evidencias/revision-2/05-rojo.txt` |
| 5.2 · D5 · verde y regresión | `corepack pnpm exec vitest run --project web src/componentes/BarraDemo.test.tsx src/identidadVisual.test.ts src/rutas.test.tsx src/cliente/cliente.test.ts src/cliente/guionWa.test.ts src/vistas/vistas.test.tsx` | PASS, código 0; 6 archivos, 80 pruebas | `evidencias/05-verde.txt` |
| 5.3 · móvil, escritorio y modos | `node openspec/changes/marca-salud-digna-360/evidencias/barra.mjs` con `NOKI_BROWSER_TOOLS` y ambos Vite activos | PASS; 54 comprobaciones, pasos 1/2 de A/C, 375 × 812 y 1280 × 900, más límites 320/767/768; sin desbordamiento ni solapamiento del compositor | `evidencias/05-barra.md`, `05-resultados.json`, `05-ejecucion.txt`, 22 capturas del recorrido, un detalle final de barra y una captura previa |
| 4.1 · lint y TypeScript | `corepack pnpm lint` | PASS, código 0 | `evidencias/04-lint.txt`, `04-resultados.json` |
| 4.1 · fronteras hexagonales | `corepack pnpm lint:deps` | PASS, código 0; 259 módulos y 824 dependencias, sin violaciones | `evidencias/04-deps.txt`, `04-resultados.json` |
| 4.1 · suite completa | `corepack pnpm test` | PASS, código 0; 79 archivos, 485 pruebas, 122.44 s de Vitest | `evidencias/04-test.txt`, `04-resultados.json` |
| 4.1 · revisión y alcance | `git diff --check`, comparación con los hashes previos y manifiesto | `git diff --check` sin errores; los seis archivos previos ajenos a D5 conservan sus hashes | `evidencias/04-archivos-entregados.json` |
| Estructura OpenSpec | `openspec validate marca-salud-digna-360 --type change --strict --no-interactive` | PASS: cambio válido | Salida del CLI y hashes del manifiesto |
| Integración con Postgres | `pnpm test:integracion` | NO APLICA según 4.1: solo frontend | Sin cambios al núcleo o adaptadores |

Para estos comandos se usó `COREPACK_HOME=C:/Users/Luis Rodriguez/AppData/Local/node/corepack`, la caché instalada. La caché predeterminada del sandbox estaba vacía e intentaba descargar pnpm; usar la caché existente resolvió el arranque sin instalar dependencias.

## Evidencia anterior conservada

La revisión 1 dejó el rojo en `evidencias/01-rojo.txt`, el verde/instalación/compilación en `02-*` y el recorrido de 32 vistas en `03-*`. La variante inicial de revisión 2 tiene su rojo, verde, recorrido y capturas en `evidencias/revision-2/`. Los controles `04-*` se repiten sobre el ajuste 3 vigente. Esta ejecución no vuelve a instalar ni compilar la fuente porque no cambió la dependencia ni la entrada.

La primera ejecución completa de la revisión 2 en sandbox obtuvo 484/485 pruebas correctas y un `websocket error` en `tests/unit/api/clinicaMemoria.test.ts`. Se conservan `04-test-sandbox.txt` y `04-resultados-sandbox.json`. Repetir con acceso a sockets locales obtuvo 485/485, sin modificar esa prueba ni archivos del núcleo (`evidencias/revision-2/04-test.txt`). El control final del ajuste 3 también usa acceso a sockets locales.

## Riesgos, limitaciones y transferencia

- La revisión visual cubre Chrome de escritorio con ventanas móviles y escritorio. No afirma una prueba en teléfono físico con teclado virtual ni un ensayo integral de negocio contra la API real. En real se revisan la barra y sus rutas sin enviar comandos de negocio.
- El detector de Impeccable solo señaló Open Sans como fuente frecuente. Se conserva por la decisión D2 aprobada; no hay una sustitución de tipografía dentro de D5.
- `.claude/launch.json` estaba sin seguimiento antes de iniciar y no se modificó ni pertenece a esta entrega. Los cambios previos de revisión 1 se conservaron.
- Correcciones: no existía `revision.md` del cambio. La revisión independiente y la autorización de cierre siguen pendientes; corresponde a Claude ejecutar `/opsx:verify marca-salud-digna-360` y registrar el dictamen.
- No se crearon commits ni se publicaron cambios. No se sincronizaron ni archivaron especificaciones.
