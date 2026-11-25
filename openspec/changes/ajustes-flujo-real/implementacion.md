# Implementación: ajustes-flujo-real

- **Resumen:** el call center distingue cada oferta con «Cotizar {servicio} en {sede} · {precio}», conservando el orden del catálogo. El contexto real se consulta al abrir una vista que lo necesita y las respuestas exitosas de WhatsApp invalidan las lecturas de la pestaña mediante un callback sin argumentos ni contenido. App muestra la cita recién confirmada al volver desde WhatsApp sin pulsar «Actualizar».
- **Autorización aplicada:** revisión 1 de `handoff.md`, autorizada por `LuisMaster119` el 2026-11-24 con «Autorizo implementar», más la instrucción explícita de esta sesión. Los hashes de propuesta, diseño y deltas coinciden con esa revisión; las tareas solo cambian sus casillas.
- **Revisión entregada:** rama `feat/ajustes-flujo-real`, base `f0d8e703b3b8e3411560c3d1a5cd663efa0bc50a` más diff sin commit. HEAD, `main` y `origin/main` coinciden tras `git fetch origin main`; la rama ya partía del main vigente y no había commits propios que rebasar. El [manifiesto](evidencias/03-archivos-entregados.json) identifica archivos modificados y nuevos con tamaño y SHA-256, excluyendo únicamente su propio hash.
- **Tareas:** implementación y validaciones de 1.1–3.2 completadas; **5/5 tareas**. Estado persistente en [tasks.md](tasks.md). Lista para revisión independiente de Claude; sin cierre ni archivado.

## Archivos modificados

- `apps/web/src/vistas/CallCenter.tsx`: texto del botón con servicio, sede y `dinero(precioCentavos)`. Se mantiene el `map` original, la clave y los comandos con los identificadores de la oferta elegida.
- `apps/web/src/cliente/ProveedorCliente.tsx`: `staleTime: 0` para `contextoDemo`; conecta `alResponder()` a `invalidateQueries({ queryKey: ['consulta'] })`.
- `apps/web/src/cliente/historialWa.ts`: callback opcional `alResponder`, llamado sin argumentos después de guardar cada respuesta exitosa. Fallos y respuestas descartadas por reinicio no llegan a ese punto. Mensajes normales, continuación, Flow y reintentos comparten el mismo envío.
- `apps/web/src/vistas/catalogoReal.test.tsx`: prueba con `ClienteReal`, fetch falso y 4 servicios × 3 sedes; doce etiquetas distintas, orden intacto y selección de los identificadores correctos.
- `apps/web/src/cliente/refrescoReal.test.tsx`: navegación real de la aplicación con fetch falso; regreso a App con contexto antes vacío, confirmación en WhatsApp, refresco de lectura activa solo ante éxito y callback sin argumentos en reintento, continuación y Flow.
- `apps/web/src/vistas/{consolas,identidadAsesor,vistas}.test.tsx`: actualiza los selectores al nuevo texto de cotización, conservando sus aserciones y acciones.
- `apps/web/README.md`: etiqueta de la oferta e instrucciones del refresco automático.
- Carpeta del cambio: casillas, este informe, scripts reproducibles, salidas rojas/verdes, controles, reinicios de demo, capturas, JSON del recorrido y manifiesto.

No se agregaron dependencias ni se modificó el lockfile, contratos, API, dominio o archivos compartidos. `.claude/launch.json` ya estaba sin versionar al iniciar: se conservó intacto y queda excluido de la entrega. Su hash se comprueba en la validación de alcance.

## Decisiones y límites

- Sin desviaciones de D1–D3. Se reutilizan el formato monetario y los estilos existentes; los botones ajustan sus líneas a 375 px sin desbordar el documento.
- El callback es una señal interna sin parámetros. No transporta número, texto, código de continuación, valores del Flow ni respuesta del servidor. Los valores siguen sujetos a la redacción y descarte del historial existente.
- Se conserva la prioridad del contexto: guion → última respuesta de comando → contexto demo real. La petición se comparte entre consumidores montados a la vez y el valor previo puede seguir visible mientras se actualiza.
- La API local de main se usó con `DEMO_MODE=true`; la web existente en `http://localhost:5173` ya operaba con `VITE_API=real` y `VITE_DEMO=true`. API, sd-mock, PostgreSQL y Redis estaban disponibles. No se cambiaron configuraciones para la prueba ni se detuvieron los servicios existentes.
- Se ejecutó `pnpm demo:reset` antes de cada ancho por A3. Persistió el historial redactado de sesión entre ambos recorridos, conforme a su diseño; se eligieron los controles habilitados del mensaje actual. No se pulsó «Actualizar» ni se recargó la página durante cada recorrido; solo se recargó al comenzar el segundo tras reiniciar la demo.
- A1–A3 permanecen fuera del alcance. Se observaron horarios a medianoche y textos crudos del bot; no se corrigieron desde la web. El reinicio previo evita reutilizar la llamada antigua en solo lectura.

## Validaciones y evidencia

Todos los resultados corresponden a **f0d8e70 más el diff entregado**. Los scripts guardan comando, base y código real y retiran las rutas locales de las salidas. No se omitieron pruebas ni se ampliaron timeouts.

| Tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 1.1 / B1, antes de implementar | `pnpm exec vitest run --project web src/vistas/catalogoReal.test.tsx` | FAIL esperado, código 1: doce botones con solo tres textos distintos | [01-rojo.txt](evidencias/01-rojo.txt) |
| 1.1 / B1, después de implementar | `pnpm exec vitest run --project web src/vistas/catalogoReal.test.tsx src/vistas/vistas.test.tsx src/vistas/identidadAsesor.test.tsx src/vistas/consolas.test.tsx` | PASS, código 0: 41 pruebas / 4 archivos; incluye el recorrido simulado | [01-verde.txt](evidencias/01-verde.txt) |
| 2.1 / B2, antes de implementar | `pnpm exec vitest run --project web src/cliente/refrescoReal.test.tsx` | FAIL esperado, código 1: cuatro fallos por contexto obsoleto, ausencia de refresco y callback; el caso sin refresco ante fallo ya pasaba | [02-rojo.txt](evidencias/02-rojo.txt) |
| 2.2 / B2, después de implementar | `pnpm exec vitest run --project web src/cliente/refrescoReal.test.tsx src/cliente/contexto.test.tsx src/cliente/historialWa.test.tsx src/cliente/conversacion.test.tsx` | PASS, código 0: 21 pruebas / 4 archivos. Se conserva la consulta compartida y la prioridad del contexto | [02-verde.txt](evidencias/02-verde.txt) |
| 3.1 / controles completos | `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:integracion`, en orden y con corte ante fallo | PASS, cuatro códigos 0: **308 pruebas / 54 archivos**, **38 de integración / 14 archivos**; 204 módulos y 617 dependencias sin violaciones | `evidencias/03-{lint,deps,test,integracion}.txt` |
| 3.2 / reinicios de demo | `pnpm demo:reset`, antes de cada ancho | PASS, ambos códigos 0; migración y semilla aplicadas en la base local de demo | [375 px](evidencias/03-demo-reset-375.txt), [1280 px](evidencias/03-demo-reset-1280.txt) |
| 3.2 / recorrido real a 375 × 812 y 1280 × 900 | App sin contexto → llamada → oferta del paquete en Tepic → consentimiento/continuación → horario/requisito/identificación/confirmación en WhatsApp → App, con navegación de la aplicación | **PASS en ambos anchos**: doce ofertas distintas y cita `CONFIRMADA` sin pulsar «Actualizar», en la misma pestaña; fecha protegida, sin errores de consola ni desbordamiento del documento. Seis capturas y quince registros | [03-recorrido-real.json](evidencias/03-recorrido-real.json), capturas siguientes |
| Alcance y planificación | Hashes autorizados, OpenSpec estricto, `git diff --check`, comparación de rutas y hash del archivo previo ajeno | PASS; evidencia y detalle en el registro y el manifiesto | [03-validacion-entrega.txt](evidencias/03-validacion-entrega.txt), [03-archivos-entregados.json](evidencias/03-archivos-entregados.json) |

El primer arnés de 2.1 buscaba un texto de estado vacío distinto del actual. Se corrigió ese selector antes de implementar B2 y se repitió el rojo, que ya reproduce las ausencias solicitadas; el intento inicial se conserva en [02-rojo-arnes-intento.txt](evidencias/02-rojo-arnes-intento.txt).

Para reproducir los controles, ejecutar `evidencias/control.ps1` desde PowerShell con acceso a PostgreSQL y Redis locales. `evidencias/ejecutar.ps1` permite repetir cada comando focalizado y guarda su salida.

## Capturas del recorrido real

| Estado | 375 px | 1280 px |
|---|---|---|
| App sin contexto al comenzar | [App inicial](evidencias/03-375-app-sin-contexto.jpg) | [App inicial](evidencias/03-1280-app-sin-contexto.jpg) |
| Catálogo con doce etiquetas distintas | [Call center](evidencias/03-375-catalogo.jpg) | [Call center](evidencias/03-1280-catalogo.jpg) |
| App con cita recién confirmada, sin Actualizar | [App confirmada](evidencias/03-375-app-confirmada.jpg) | [App confirmada](evidencias/03-1280-app-confirmada.jpg) |

Las capturas completas pueden incluir la navegación fija móvil sobre el contenido en su posición del viewport; los botones y sus textos están conservados. El ancho físico de algunas imágenes excluye la barra vertical. Todos los datos son ficticios de la semilla; el JSON no contiene valores capturados ni tokens literales.

## Transferencia

- No hay `revision.md` al entregar. Claude debe verificar esta implementación con `/opsx:verify ajustes-flujo-real` y guardar su revisión independiente.
- No se crearon commits ni se publicaron cambios; no se sincronizaron specs ni se archivó el cambio. La autorización de cierre sigue pendiente.
