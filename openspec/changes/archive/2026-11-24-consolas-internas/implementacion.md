# Implementación: consolas-internas

- **Resumen:** cliente Socket.IO real con salas validadas, referencias y reconexión; contexto compartido para las consolas y app; ANI y consentimiento en call center; continuación solicitada en el guion; llegadas, etiquetas de KPI y estados sin contexto. Las vistas siguen usando contratos y cliente, sin red directa ni reglas de negocio.
- **Estado:** implementación y validación del alcance completas, **17/17 tareas completadas**. Lista para revisión independiente de Claude; sin merge, cierre ni archivado.
- **Autorización aplicada:** revisión 1 de `handoff.md`, autorizada por `LuisMaster119`. Sus últimas entradas resuelven la parada por identidad sin cambios de planificación: la identidad del asesor y los pasos de identidad del guion van en un cambio aparte. El usuario confirmó en la continuación de esta sesión que la revisión 1 sigue vigente y pidió rebase, instalación, 4.1, 4.3 e informe, sin commits. Propuesta, diseño y specs permanecen intactos; solo se actualizaron las casillas de tareas.
- **Revisión entregada:** rama `feat/consolas-internas`, HEAD/base rebasada `91de57836c92e9106cc13dd85ebca0d5f181d659`, coincidente con `main` y `origin/main` observados. Cambios sin commit. El manifiesto [04-archivos-entregados.json](evidencias/04-archivos-entregados.json) enumera todos los archivos entregados y sus SHA-256, incluidos los no versionados. Excluye únicamente su propio archivo para evitar una autorreferencia de hash.
- **Rebase realizado:** desde `42d6a78` a `91de578`, sin conflictos ni commits nuevos. Se respaldó el diff y se verificaron hashes idénticos de los 19 archivos modificados restaurados; no hubo archivos coincidentes con los cambios entrantes. Las lecturas usadas por estas vistas no cambian de forma. No se añadieron `IdentificarPaciente` ni `pista.paso` a las vistas. Véanse [04-rebase.txt](evidencias/04-rebase.txt) y [04-base.txt](evidencias/04-base.txt).
- **Tareas:** 1.1–4.3 completadas. El estado persistente está en [tasks.md](tasks.md).

## Archivos modificados

El detalle exhaustivo con hashes está en el manifiesto. Cambios de producto y pruebas:

- `apps/web/package.json`, `pnpm-lock.yaml`: `socket.io-client` **4.8.1 exacta**, con sus dependencias nuevas; sin actualizar otras dependencias existentes.
- `apps/web/src/cliente/ClienteApi.ts`, `real/ClienteReal.ts`, `mock/ClienteMock.ts`, `useSala.ts`: interfaz de salas, fábrica de socket inyectable, conexión perezosa, validación de eventos y liberación de conexión cuando no quedan consumidores.
- `apps/web/src/cliente/ProveedorCliente.tsx`: contexto por valor con prioridad guion → respuesta local → contexto demo real, consulta compartida e invalidación por eventos; consultas dependientes deshabilitadas mientras falta su identificador.
- `apps/web/src/cliente/useAccion.ts`: bloqueo síncrono de envíos y reintentos concurrentes; conserva las claves y el progreso de secuencias.
- `apps/web/src/cliente/demo.ts`, `mock/guionFlujoA.ts`: ANI esperado, paso `CONTINUACION_SOLICITADA`, evento `ConsentimientoContactoWA`, código posterior a la solicitud, once pasos y versiones/eventos ajustados.
- `apps/web/src/vistas/CallCenter.tsx`, `Clinica.tsx`, `Admin.tsx`, `App.tsx`: adopción de salas y contexto; ANI, consentimiento, solo lectura, llegadas con token y KPI de presentación.
- `apps/web/src/componentes/EstadoContexto.tsx`, `apps/web/src/styles.css`: carga/error/ausencia de contexto reutilizables, controles de ANI y consentimiento, etiquetas que permiten ajuste de línea.
- `apps/web/src/pruebas/socketFalso.ts`, `apps/web/src/cliente/tiempoReal.test.ts`, `contexto.test.tsx`, `cliente.test.ts`, `guionWa.test.ts`, `apps/web/src/vistas/consolas.test.tsx`, `vistas.test.tsx`, `wa.test.tsx`: pruebas y actualización del recorrido.
- `apps/web/README.md`: instrucciones de ANI, consentimiento, paso nuevo, contexto demo real, salas y compatibilidad de Socket.IO pendiente del servidor.
- Carpeta de este cambio: `tasks.md`, este informe y `evidencias/` con fallos previos, resultados reales, scripts reproducibles y manifiesto. Los artefactos de planificación anteriores ya estaban sin versionar al iniciar.

No hay cambios de producto fuera de `apps/web/**` y `pnpm-lock.yaml` en el diff contra el nuevo `main`. Los cambios de identidad se incorporaron como base del rebase, sin modificaciones propias a contratos compartidos, documentación compartida, dominio, aplicación, adaptadores ni configuración raíz. En esta continuación no se editaron archivos de producto: se conservó el diff previo y se actualizaron únicamente las tareas, el informe y la evidencia. No se crearon commits ni se publicaron cambios. No se sincronizaron specs ni se archivó el cambio.

## Decisiones menores y desviaciones

- La captura de ANI vive en un formulario que se desmonta al recibir el trámite. La ficha muestra exclusivamente lo devuelto por su lectura; ni ANI ni código se escriben en almacenamiento del navegador o consola.
- El call center real espera su propia llamada: no abre un hilo ajeno de `contextoDemo` en una pestaña nueva, conforme al riesgo resuelto en D4. Al cambiar el hilo activo deja la sala previa.
- `RespuestaComando` no contiene `pacienteId`; para ese valor se usa el guion o `contextoDemo`, sin añadir campos al contrato. Los identificadores disponibles en la respuesta tienen prioridad sobre la consulta demo.
- El mapa de etiquetas usa propiedades propias, para conservar también KPI desconocidos llamados `constructor` o `toString`. El formato numérico conserva hasta 21 cifras significativas, sin calcular métricas.
- No hay desviaciones funcionales del diseño autorizado. En esta máquina hubo contención al ejecutar Vitest en paralelo. Los controles 2 y 3 ejecutan **toda la suite con `pnpm test --maxWorkers=1`**, sin skips, cambios de aserciones ni ampliación del límite de 5 segundos. Se conservan los intentos fallidos en `02-test-intento-inicial.txt`, `02-test-dos-trabajadores.txt` y `02-test-un-trabajador-previo.txt`.
- El recorrido largo de `vistas.test.tsx` espera explícitamente que el consentimiento esté habilitado y usa `userEvent.setup({ delay: null })` para eliminar pausas artificiales entre pulsaciones. Conserva todas las acciones y comprobaciones. En el control final sobre la rama rebasada pasó en 4,1 segundos. Ese control ejecutó `pnpm test` sin limitar trabajadores y sin omitir pruebas.

## Validaciones y evidencia

Los controles 1–3 conservan el historial de implementación sobre **42d6a78** y sus fallos previos. La entrega actual está validada sobre **91de578 más el diff entregado**, mediante instalación congelada, recorrido manual, compilaciones y control final 4.3. No se presentan resultados antiguos como pruebas de la nueva base.

| Validación / tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 1.1, salas y eventos | `pnpm exec vitest run --project web src/cliente/tiempoReal.test.ts` antes de implementar | FAIL esperado: 4 fallos por funcionalidad ausente | [01-rojo.txt](evidencias/01-rojo.txt) |
| 1.2, instalación reproducible | `pnpm install --frozen-lockfile --store-dir <almacen-existente> --fetch-retries=0` | PASS, código 0; la instalación necesitó usar el almacén existente y permisos de entorno | [01-install.txt](evidencias/01-install.txt) |
| 1.3, contexto real | Pruebas con `ClienteReal`, HTTP y socket falsos; prioridad, nulos, no disponible, Actualizar, app y eventos | FAIL previo; PASS en las suites completas posteriores | [01-contexto-rojo.txt](evidencias/01-contexto-rojo.txt), [03-test.txt](evidencias/03-test.txt) |
| 1.4, primer control | `pnpm lint`, `pnpm lint:deps`, `pnpm test`, en orden | PASS, códigos 0; 194 pruebas | `evidencias/01-{lint,deps,test}.txt` |
| 2.1–2.3, call center y guion | Pruebas de ANI, nulos, solo lectura, consentimiento, doble clic, reintento, código, QR, cambio de sala y esquemas del guion | FAIL previo de las 5 pruebas nuevas; PASS tras implementar | [02-rojo.txt](evidencias/02-rojo.txt), [02-test.txt](evidencias/02-test.txt) |
| 2.4, segundo control | `pnpm lint`, `pnpm lint:deps`, `pnpm test --maxWorkers=1`, en orden | PASS, códigos 0; 201 pruebas | `evidencias/02-{lint,deps,test}.txt` |
| 3.1–3.4, clínica/admin/app | Token elegido, llegada registrada sin acción, vacío, nulos y actualización, siete etiquetas, claves desconocidas, salas, invalidación y descarte de evento inválido | FAIL previo: 9 fallos nuevos; PASS posterior. El caso de claves heredadas también falló antes de corregirse | [03-rojo.txt](evidencias/03-rojo.txt), [03-kpi-rojo.txt](evidencias/03-kpi-rojo.txt), [03-test.txt](evidencias/03-test.txt) |
| 3.5, documentación | Revisión del README frente a D3, D4 y D7 | PASS; instrucciones y límites actualizados | `apps/web/README.md` |
| 3.6, control histórico antes del rebase | `pnpm lint`, `pnpm lint:deps`, `pnpm test --maxWorkers=1`, en orden | PASS sobre 42d6a78, códigos 0; 212 pruebas / 37 archivos; fronteras: 162 módulos, 440 dependencias, sin violaciones | `evidencias/03-{lint,deps,test}.txt` |
| Red y métricas | Búsqueda de red en vistas de producción y de aritmética sobre KPI; inspección de Admin; detector de UI | PASS; sin coincidencias, detector `[]` | [03-fronteras.txt](evidencias/03-fronteras.txt) |
| Flujo A automatizado | Prueba React completa y `node --import tsx openspec/changes/consolas-internas/evidencias/recorrido.ts` | PASS; once pasos, código solo tras solicitud, confirmación y llegada registrada. No sustituye navegador | [03-test.txt](evidencias/03-test.txt), [04-recorrido-automatizado.json](evidencias/04-recorrido-automatizado.json) |
| Rebase e instalación sobre main vigente | `git rebase main`; `pnpm install --frozen-lockfile --store-dir <almacen-existente>` | PASS, códigos 0; base 91de578, archivos conservados sin commits nuevos, lockfile vigente | [04-rebase.txt](evidencias/04-rebase.txt), [04-install.txt](evidencias/04-install.txt) |
| 4.1, recorrido visual a 375 × 812 y 1280 × 900 | Call center → consentimiento → enlace WA → horario → Flow → confirmar → app → clínica → admin, repetido desde reinicio en ambos tamaños | **PASS sobre 91de578**; 26 comprobaciones, 8 capturas, sin desplazamiento horizontal ni errores de consola; fecha protegida y foco del diálogo verificados. El bloqueo anterior quedó superado | [04-recorrido-manual.json](evidencias/04-recorrido-manual.json), capturas `evidencias/04-{375,1280}-*.jpg` |
| 4.2, compilaciones | `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build`; después `VITE_API=mock VITE_DEMO=true pnpm --filter @noki/web build` | PASS, ambos códigos 0. Vite advierte que ignora directivas `use client` de dependencias; no son errores de compilación | [04-build-real.txt](evidencias/04-build-real.txt), [04-build-mock.txt](evidencias/04-build-mock.txt) |
| Integración histórica antes del rebase | `pnpm test:integracion` con PostgreSQL y Redis en Docker | PASS sobre 42d6a78, código 0; 30 pruebas / 11 archivos. Se conserva como historial, sustituida para la entrega por 4.3 | [04-integracion-base-autorizada.txt](evidencias/04-integracion-base-autorizada.txt) |
| 4.3, control final después del rebase | `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:integracion`, en ese orden y con corte ante fallo | **PASS sobre 91de578**, cuatro códigos 0; **240 pruebas / 39 archivos** y **32 de integración / 12 archivos**; 166 módulos y 453 dependencias sin violaciones. Sin limitación de trabajadores, skips ni cambios a las pruebas | `evidencias/04-{lint,deps,test,integracion}.txt` |
| OpenSpec, formato y alcance | `openspec validate consolas-internas --type change --strict --no-interactive`, `git diff --check`, manifiesto de rutas y hashes | PASS: OpenSpec y diff sin errores; script de evidencia válido con ESLint; alcance comprobado en el manifiesto | [04-validacion-entrega.txt](evidencias/04-validacion-entrega.txt), [04-archivos-entregados.json](evidencias/04-archivos-entregados.json) |

## Capturas del recorrido

| Vista | 375 px | 1280 px |
|---|---|---|
| App | [Cita y QR](evidencias/04-375-app.jpg) | [Cita confirmada y QR](evidencias/04-1280-app.jpg) |
| Clínica | [Llegada registrada](evidencias/04-375-clinica-registrada.jpg) | [Llegada registrada](evidencias/04-1280-clinica-registrada.jpg) |
| Administración | [Conteos y línea de tiempo](evidencias/04-375-admin.jpg) | [Conteos y línea de tiempo](evidencias/04-1280-admin.jpg) |
| Call center | Comprobado en el recorrido y su JSON | [Cotización](evidencias/04-1280-cotizacion.jpg), [continuación y QR](evidencias/04-1280-continuacion.jpg) |

Las capturas móviles conservadas de app, clínica y admin se tomaron al finalizar el recorrido; la app ya muestra `EN_CLINICA`. La cita `CONFIRMADA` también se comprobó antes de registrar la llegada en cada ancho. Las imágenes excluyen los controles de ANI y número de WhatsApp completos; los datos capturados en el Flow permanecen enmascarados. Las capturas completas pueden mostrar la navegación fija sobre contenido según el desplazamiento al capturar; también se guardaron vistas al inicio de página. El ancho físico de algunas imágenes excluye la barra vertical; los viewports y medidas del documento constan en el JSON.

## Límites y transferencia a Claude

1. **Parada por identidad resuelta sin nueva planificación.** Las últimas entradas del handoff aclaran que las adiciones opcionales no alteran las lecturas de estas consolas. La decisión de `LuisMaster119` fue «Cambio aparte» para identidad. Se continuó con la autorización de la revisión 1 y con la instrucción explícita de esta sesión; no se agregaron pasos de identidad a las vistas ni al guion.
2. **Bloqueo de navegador resuelto.** En esta continuación el navegador integrado abrió la web por 127.0.0.1 y se completó el recorrido en ambos tamaños. [04-manual-bloqueado.json](evidencias/04-manual-bloqueado.json) conserva únicamente el intento histórico, marcado como superado por el recorrido PASS actual.
3. **Recorrido real de punta a punta: BLOQUEADO** hasta que `api-comandos` esté en main y se integre con `DEMO_MODE=true`. La major del servidor Socket.IO aún debe confirmarse con el frente A como 4.x (D3); el servidor no está en esta revisión. Los sockets falsos verifican la conducta del cliente, no la compatibilidad del servidor.
4. **Revisión independiente pendiente.** Los controles de implementación están completos; Claude debe verificar el diff, el manifiesto y las evidencias. La autorización de cierre sigue pendiente. No se realizó merge ni archivado.

- **Correcciones de revisión independiente:** no hay `revision.md` en este cambio al entregar. La corrección del KPI heredado y de la sincronización de la prueba son comprobaciones propias de Codex, no una revisión de Claude.
- **Próximo responsable:** usuario → Claude con `/opsx:verify consolas-internas`, para guardar la revisión independiente en `revision.md`. La identidad permanece para otro cambio; el cierre sigue correspondiendo a Claude y al usuario.
