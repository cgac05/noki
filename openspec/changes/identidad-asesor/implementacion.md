# Implementación: identidad-asesor

- **Resumen:** identificación opcional en la ficha editable del asesor, guiada por la última pista de `paciente` recibida en esta pestaña. Las opciones y los campos arman `IdentificarPaciente` con el contrato compartido; la captura se hace en el Flow protegido. El envío usa refs privadas, sin mutaciones de TanStack Query, con exclusión de doble clic, reintento con la misma clave y descarte al cancelar o desmontar. El guion simulado incorpora destinatario, candidata opaca y fecha protegida en WhatsApp, con `DestinatarioDeclarado` e `IdentidadComprobada`.
- **Corrección H-01:** tras un fallo, el pendiente solo se reutiliza para un comando idéntico. Una respuesta distinta reemplaza el comando anterior y obtiene otra `Idempotency-Key`. La prueba roja y las regresiones cubren tanto otra opción de destinatario como capturar CURP después de «No la tengo», además de conservar el reintento del mismo envío. Corrección solicitada explícitamente en esta sesión, dentro de la revisión 1 autorizada; nueva revisión independiente pendiente.
- **Autorización:** revisión 1 de `handoff.md`, autorizada por `LuisMaster119` el 2026-11-24 con «Autorizo implementar» y aplicada por instrucción explícita de esta sesión. Se comprobaron los hashes de propuesta, diseño, tareas originales y los dos deltas. No se modificaron requisitos ni decisiones aprobadas.
- **Revisión entregada:** rama `feat/identidad-asesor`, base `cb3d56a60c1e2125f9465742236f306bd99278ae` más diff sin commit. HEAD, `main` y `origin/main` coinciden tras actualizar la referencia remota al comenzar y antes del control final. La rama ya estaba sobre el main vigente; no había commits propios que rebasar. El manifiesto [03-archivos-entregados.json](evidencias/03-archivos-entregados.json) identifica todos los archivos, incluidos los nuevos, con tamaño y SHA-256; excluye su propio hash.
- **Tareas:** **12/12 completadas**. Se reabrieron y validaron 1.2, 1.4, 1.5 y 3.3 para H-01, con prueba roja, regresiones verdes y ambos controles repetidos. El estado persistente vive en [tasks.md](tasks.md). La entrega corregida queda lista para nueva revisión independiente, sin cierre ni archivado.

## Archivos modificados

Solo se modificaron `apps/web/**` y esta carpeta del cambio. No se agregaron dependencias ni se modificó el lockfile.

- `apps/web/src/cliente/identificacion.ts`: traducción de opciones/campos a payload, trim, omisión de opcionales vacíos, mayúsculas de CURP/sexo/entidad y validación con `ComandoRequestSchema`. Los errores de formato devuelven únicamente ids de campo.
- `apps/web/src/cliente/useIdentificacion.ts`: pendiente en `useRef`, clave propia, bloqueo síncrono, respuesta recordada e invalidación de consultas. Cancelar o desmontar invalida la operación y descarta el pendiente; una respuesta tardía no vuelve a publicarlo.
- `apps/web/src/componentes/IdentificacionAsesor.tsx`, `apps/web/src/vistas/CallCenter.tsx`: sección opcional antes de la cotización, opciones desde la pista, captura protegida, reinicio y errores. Se desmonta al cambiar la pista/trámite y desaparece con solo lectura o sin pregunta de paciente. No bloquea cotizar ni continuar.
- `apps/web/src/componentes/ModalFlow.tsx`: prop opcional `validar`, que marca campos con «Revisa el formato de este campo» sin enviar ni repetir su valor. Sin la prop conserva el comportamiento anterior.
- `apps/web/src/cliente/demo.ts`, `apps/web/src/cliente/mock/guionFlujoA.ts`: trece pasos; pistas con `DESTINATARIO`, `CONFIRMAR` y `FECHA_NAC`, opciones opacas, versiones/eventos consecutivos y ayuda para opciones fuera del guion. El call center simulado sigue sin identificar.
- Pruebas nuevas: `cliente/identificacion.test.ts`, `cliente/useIdentificacion.test.tsx`, `componentes/ModalFlow.test.tsx` y `vistas/identidadAsesor.test.tsx`, bajo `apps/web/src/`.
- Pruebas actualizadas: `cliente/cliente.test.ts`, `cliente/guionWa.test.ts`, `vistas/vistas.test.tsx`, `vistas/wa.test.tsx` y `vistas/flow.test.tsx`. Conservan las aserciones de privacidad, accesibilidad y recorrido; añaden los nuevos pasos y eventos.
- `apps/web/src/pruebas/pistasIdentificacion.json`: pistas producidas por el dominio real, sin importar el dominio desde la web. El script reproducible [pistas.ts](evidencias/pistas.ts) las genera desde la carpeta de evidencia. `apps/web/src/pruebas/identificarEnWa.ts` comparte las interacciones de prueba de WhatsApp.
- `apps/web/README.md`: identificación del asesor, alcance por pestaña, ausencia en simulado, nuevos pasos, privacidad y límites de integración real.
- Esta carpeta: casillas de `tasks.md`, informe y evidencia (pruebas, controles, capturas, recorrido, scripts y manifiesto). `handoff.md`, propuesta, diseño y deltas se conservaron.

## Decisiones menores y observaciones

- La web no ordena preguntas ni valida reglas de identidad. Solo normaliza y valida la forma del comando; el núcleo conserva concordancia, verificador de CURP, candidatos y bloqueos.
- El contrato HTTP actual expresa el bloqueo como `error.codigo: REGLA_VIOLADA` y `error.datos.regla: IDENTIFICACION_BLOQUEADA`. `ClienteReal` entrega a la vista el código de familia y el mensaje público mediante `ErrorCliente`; eso es lo mostrado, conforme a D3. No se amplió el contrato ni se copiaron datos internos al mensaje. El primer fixture de error usaba un código HTTP específico que el contrato no admite; se corrigió el fixture para probar el sobre vigente. Los intentos quedan conservados.
- La clave de la sección incluye el trámite y la pista. Cambiar de paso o candidatos desmonta la captura y descarta su pendiente; no se deriva el paso desde la ficha.
- Tras la fecha aceptada, el guion ofrece confirmar en la casilla `elegibilidad`, en lugar de volver a pedir el paciente ya identificado. Es una respuesta fija de demo, sin reglas de identidad en el cliente.
- La nueva lista deja dos botones «Ver opciones» en el historial, uno deshabilitado. Las pruebas eligen el habilitado. El título del Flow y el campo se llaman «Fecha de nacimiento»; los selectores de prueba especifican el `input`, sin eliminar aserciones.
- En el primer intento de escritorio se intentó continuar antes de asentarse la cotización. Se reinició el guion y se repitió esperando el estado visible `COTIZADO`; el registro conserva ese intento y el recorrido completo posterior. No se cambió producto para esa sincronización.

## Validaciones iniciales, anteriores a H-01

La tabla siguiente conserva los resultados de la implementación inicial sobre **cb3d56a más el diff anterior a H-01**. Las salidas `01-*`, `02-*`, `03-*`, las compilaciones y las capturas corresponden a esa revisión previa. Los nuevos resultados de la corrección están en la sección siguiente, con prefijo `h01-`. El manifiesto `03-archivos-entregados.json` se actualiza a la entrega corregida; su versión anterior se conserva en `h01-manifiesto-anterior.json`.

| Tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 1.1, payload desde pistas reales | `node --import tsx openspec/changes/identidad-asesor/evidencias/pistas.ts`; `pnpm exec vitest run --project web src/cliente/identificacion.test.ts` antes de implementar | FAIL esperado por módulo ausente. Las pistas reales coinciden con D2 | [01-rojo.txt](evidencias/01-rojo.txt), [pistas.ts](evidencias/pistas.ts) |
| 1.2–1.3, cliente, hook y Flow | `pnpm exec vitest run --project web src/cliente/identificacion.test.ts src/cliente/useIdentificacion.test.tsx src/componentes/ModalFlow.test.tsx src/vistas/flow.test.tsx src/vistas/wa.test.tsx` | PASS: 35 pruebas / 5 archivos antes de cambiar el guion. Incluye doble clic, reintento, descarte, respuesta tardía, cache vacía y formato local | [01-cliente-flow.txt](evidencias/01-cliente-flow.txt) |
| 1.4, consola real con fetch falso | `pnpm exec vitest run --project web src/vistas/identidadAsesor.test.tsx` | FAIL previo; PASS posterior: 8 pruebas. Candidato opaco/nulo, fecha, sin CURP, formato, omisión, solo lectura, bloqueo/reinicio y privacidad en consola, URL, almacenamiento y cachés | [01-vista-rojo.txt](evidencias/01-vista-rojo.txt), [01-vista.txt](evidencias/01-vista.txt) |
| 1.5, primer control | `pnpm lint`, `pnpm lint:deps`, `pnpm test`, en orden y con corte ante fallo | PASS, códigos 0; 266 pruebas / 43 archivos; 174 módulos y 494 dependencias sin violaciones | `evidencias/01-{lint,deps,test}.txt` |
| 2.1, guion en rojo | `pnpm exec vitest run --project web src/cliente/guionWa.test.ts` | FAIL esperado: 5 fallos por pasos ausentes, Flow y eventos anteriores | [02-rojo.txt](evidencias/02-rojo.txt) |
| 2.2, guion y recorrido React | `pnpm exec vitest run --project web src/cliente/guionWa.test.ts src/cliente/cliente.test.ts src/vistas/vistas.test.tsx src/vistas/wa.test.tsx src/vistas/flow.test.tsx` | PASS: 66 pruebas / 5 archivos. Trece pasos, pistas válidas, opciones fuera del guion sin avance, eventos nuevos, privacidad y recorrido hasta clínica/admin | [02-guion.txt](evidencias/02-guion.txt) |
| 2.3, instrucciones | Revisión del README frente a D1, D5 y D6 | PASS: limitación por pestaña, captura opcional real y pasos de WhatsApp simulado descritos | `apps/web/README.md` |
| 2.4, segundo control | `pnpm lint`, `pnpm lint:deps`, `pnpm test`, en orden y con corte ante fallo | PASS, códigos 0; 271 pruebas / 43 archivos; 175 módulos y 500 dependencias sin violaciones | `evidencias/02-{lint,deps,test}.txt` |
| 3.1, navegador a 375 × 812 y 1280 × 900 | Call center → cotizar → consentimiento → enlace WA → horario → Para mí → Soy Ana P. → fecha → confirmar → app/QR → llegada → admin | PASS en ambos anchos; 16 capturas y 26 registros, foco atrapado y sin errores de consola. Fecha ausente del texto fuera del campo y sin desbordamiento del documento | [03-recorrido-manual.json](evidencias/03-recorrido-manual.json), capturas de la tabla siguiente |
| 3.2, compilaciones | `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build`; `VITE_API=mock VITE_DEMO=true pnpm --filter @noki/web build` | PASS, ambos códigos 0. Vite ignora directivas `use client` de dependencias; son advertencias de compilación | [03-build-real.txt](evidencias/03-build-real.txt), [03-build-mock.txt](evidencias/03-build-mock.txt) |
| 3.3, control final sobre main vigente | `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:integracion`, en ese orden | PASS, cuatro códigos 0; **271 pruebas / 43 archivos** y **32 de integración / 12 archivos**. Fronteras: 175 módulos, 500 dependencias sin violaciones. Integración ejecutada en el host con PostgreSQL y Redis saludables en Docker | `evidencias/03-{lint,deps,test,integracion}.txt` |
| Formato, planificación y alcance | `openspec validate identidad-asesor --type change --strict --no-interactive`, `git diff --check`, verificación de hashes y rutas | PASS; planificación autorizada intacta, tareas modificadas solo en casillas, alcance exclusivo de web y carpeta del cambio | [03-validacion-entrega.txt](evidencias/03-validacion-entrega.txt), [03-archivos-entregados.json](evidencias/03-archivos-entregados.json) |

Los controles se pueden reproducir con `evidencias/validar.ps1 -Grupo 03 -Integracion` desde PowerShell; se detiene ante el primer fallo y guarda las salidas con la base y código real. Los fallos previos de lint y de fixtures/selectores permanecen en `*-intento.txt`; no se omitieron pruebas ni se ampliaron sus límites de tiempo.

El primer intento final de integración carecía de acceso a la infraestructura desde el entorno restringido y terminó con código 1. Se conservó en [03-integracion-entorno-restringido.txt](evidencias/03-integracion-entorno-restringido.txt). Docker confirmó ambos contenedores saludables; la repetición del mismo `pnpm test:integracion` en el host pasó con código 0. No se cambiaron pruebas, base de código ni configuración para obtener ese resultado.

## Corrección de revisión H-01

- **Hallazgo:** [revision.md](revision.md), H-01 (`WARNING`), tareas 1.2 y 1.4. Antes de la corrección, `pendiente.current ??=` retenía cualquier comando fallido incluso al elegir otra respuesta. La reproducción de la vista con `ClienteReal` y fetch falso agotó sus dos intentos de red en «Para mí» y, al pulsar «Para otra persona», recibió nuevamente `para: 'MI'`.
- **Cambio de producto de esta vuelta:** exclusivamente `apps/web/src/cliente/useIdentificacion.ts`. Compara el comando nuevo con el pendiente mediante su representación JSON; los comandos que recibe ya están normalizados por `ComandoRequestSchema` en `armarIdentificacion`. Si difieren, reemplaza el pendiente con el comando nuevo y una clave nueva; si coinciden, conserva comando y clave. La comparación es temporal en memoria, sin guardar valores en cachés, almacenamiento, consola ni URL. Se conservan el candado síncrono, el descarte y la protección frente a respuestas tardías.
- **Pruebas de esta vuelta:** `apps/web/src/cliente/useIdentificacion.test.tsx` añade dos regresiones de cambio de respuesta y una de reenvío idéntico reconstruido tras error del núcleo; cada nuevo pendiente conserva su propia clave al reintentar. `apps/web/src/vistas/identidadAsesor.test.tsx` añade la reproducción desde los botones de la consola con cliente real. Se mantienen las pruebas anteriores de reintento, doble clic, cancelación y privacidad.
- **Planificación:** no cambió. Las casillas afectadas se reabrieron y se completan únicamente con sus controles. `revision.md` se conserva como dictamen independiente recibido; Codex documenta aquí su corrección y no modifica el dictamen de Claude. H-02, H-03 y H-04 siguen como sugerencias opcionales fuera de esta corrección solicitada.

| Validación | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| H-01 antes de corregir | `pnpm exec vitest run --project web src/cliente/useIdentificacion.test.tsx src/vistas/identidadAsesor.test.tsx` | FAIL esperado, código 1: 3 fallos / 16 pruebas. Se reenviaban el destinatario anterior y `curp: null` | [h01-rojo.txt](evidencias/h01-rojo.txt) |
| H-01 después de corregir | Mismo comando focalizado | PASS, código 0: 16 pruebas / 2 archivos. Incluye reintento idéntico con la misma clave y cambio de respuesta con clave nueva | [h01-verde.txt](evidencias/h01-verde.txt) |
| 1.5 repetido | `pnpm lint`, `pnpm lint:deps`, `pnpm test`, en orden y con corte ante fallo | PASS, tres códigos 0; **275 pruebas / 43 archivos**; 175 módulos y 501 dependencias sin violaciones | `evidencias/h01-01-{lint,deps,test}.txt` |
| 3.3 repetido | `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:integracion`, en orden y con corte ante fallo | PASS, cuatro códigos 0; **275 pruebas / 43 archivos** y **32 de integración / 12 archivos**. Fronteras: 175 módulos, 501 dependencias sin violaciones. Sin limitar trabajadores ni ampliar timeouts | `evidencias/h01-03-{lint,deps,test,integracion}.txt` |
| Base, alcance, formato y planificación | Referencias Git tras fetch, comparación con manifiesto anterior, hashes autorizados, OpenSpec estricto y `git diff --check` | PASS; base `cb3d56a` vigente, solo un hook y sus dos archivos de prueba cambian en producto respecto a la entrega revisada; planificación intacta y cero commits propios | [h01-validacion-entrega.txt](evidencias/h01-validacion-entrega.txt), [manifiesto actualizado](evidencias/03-archivos-entregados.json) |

El primer intento de 1.5 detectó tres propiedades `exact` no admitidas por los tipos de Testing Library en la prueba nueva. Se quitaron esas propiedades de los selectores, conservando todas las aserciones, y se repitió el control completo. Se conserva [h01-01-lint-intento.txt](evidencias/h01-01-lint-intento.txt). Los controles se reproducen con `evidencias/validar.ps1 -Grupo h01-01` y después `evidencias/validar.ps1 -Grupo h01-03 -Integracion`; la integración necesita acceso a PostgreSQL y Redis locales.

El primer intento de 3.3 pasó lint y fronteras y se detuvo en un timeout de 5 segundos de la prueba existente de identificación en WhatsApp (`wa.test.tsx`): 274 pruebas pasaron y una agotó el tiempo. Las regresiones H-01 pasaron en ese intento. Se conservó [h01-03-test-intento.txt](evidencias/h01-03-test-intento.txt) y se repitió el control completo con los mismos comandos, sin modificar esa prueba, sus aserciones ni el límite de tiempo. La integración no se ejecutó en el intento fallido, respetando el corte ante fallo.

No se repitieron el recorrido manual ni los builds de la entrega inicial: esta vuelta corrige el envío del asesor en modo real, probado con fetch falso. No modifica vistas, estilos ni el guion mock. Ambos controles completos vuelven a ejecutar el recorrido React del Flujo A y las pruebas de privacidad; el recorrido real de punta a punta sigue bloqueado por `api-comandos`.

## Capturas de la entrega inicial

| Vista / paso | 375 px | 1280 px |
|---|---|---|
| Call center con continuación | [Call center](evidencias/03-375-callcenter.jpg) | [Call center](evidencias/03-1280-callcenter.jpg) |
| WhatsApp: destinatario | [Para quién](evidencias/03-375-wa-destinatario.jpg) | [Para quién](evidencias/03-1280-wa-destinatario.jpg) |
| WhatsApp: candidata opaca | [Candidata](evidencias/03-375-wa-candidata.jpg) | [Candidata](evidencias/03-1280-wa-candidata.jpg) |
| WhatsApp: Flow enmascarado | [Flow](evidencias/03-375-wa-flow.jpg) | [Flow](evidencias/03-1280-wa-flow.jpg) |
| WhatsApp: confirmación | [Confirmada](evidencias/03-375-wa-confirmada.jpg) | [Confirmada](evidencias/03-1280-wa-confirmada.jpg) |
| App: cita confirmada y QR | [App](evidencias/03-375-app.jpg) | [App](evidencias/03-1280-app.jpg) |
| Clínica: llegada registrada | [Clínica](evidencias/03-375-clinica.jpg) | [Clínica](evidencias/03-1280-clinica.jpg) |
| Admin: conteos y eventos de identidad | [Admin](evidencias/03-375-admin.jpg) | [Admin](evidencias/03-1280-admin.jpg) |

Las capturas de WhatsApp son del viewport tras el desplazamiento; las otras son completas y se tomaron desde el inicio de página. La barra de canales móvil conserva su desplazamiento propio; la comprobación de desbordamiento corresponde al documento completo. El ancho físico de algunas capturas excluye la barra vertical. Todos los datos son ficticios; la fecha capturada permanece enmascarada.

## Límites y transferencia

- **Recorrido real del asesor de punta a punta: BLOQUEADO** hasta integrar `api-comandos` en main. Los casos reales de consola se validaron con `ClienteReal` y fetch falso; los builds y sockets falsos no sustituyen la integración con el servidor. Sigue pendiente confirmar la major 4.x del servidor Socket.IO con el frente A.
- Recargar la pestaña pierde la última pregunta de comando; la sección no se reconstruye desde una lectura ni desde datos de identidad en almacenamiento. Es el límite aprobado en D1.
- `OTRA_PERSONA` y `NINGUNO` solo ofrecen ayuda en el guion fijo. La identificación real sí arma ambas opciones conforme al contrato y deja decidir al núcleo.
- No se modificaron contratos, dominio, API ni archivos compartidos. No se sincronizaron specs, no se archivó, no se publicaron cambios ni se crearon commits.
- [revision.md](revision.md) contiene la revisión independiente inicial con dictamen `FAIL`. H-01 se corrige en esta entrega y queda pendiente su nueva verificación por Claude mediante `/opsx:verify identidad-asesor`; la autorización de cierre sigue pendiente.
