# Ajuste 5 · D7 · Acento verde de identidad

## Autorización y secuencia

Antes de escribir se comprobaron los cuatro hashes del ajuste 5 de `handoff.md`: propuesta `6a65e5eb589c`, diseño `ea0c82919681`, tareas `e4212cc46936`, delta `4d99af95cdec`. Coincidían. El responsable autorizó además «Conservar marca verde como excepción»: `.marca` sigue siendo el único enlace verde de identidad.

Base del rojo, la implementación y las capturas: `eedd179024f0b93458d9103700f50ad1d1a626c7`, incorporada por avance rápido, sin commits propios. Primero se añadieron las pruebas y se obtuvo el rojo esperado: **5 fallos y 7 pruebas correctas**, código 1, en [07-rojo.txt](07-rojo.txt). Después se implementaron exclusivamente las clases y reglas D7. Toda la web pasó: **33 archivos, 265 pruebas**, código 0, en [07-web.txt](07-web.txt). Durante el cierre se incorporó también el nuevo `origin/main` `f5260a8974a7f49ccc97a15a6b24938f3435bfe0`, sin cambios en `apps/web`; la presentación capturada sigue siendo idéntica. Los controles finales 4.1 se repiten en esta última base.

## Método y resultados

Chrome local, automatizado con Playwright; `VITE_API=mock` en `http://localhost:5174` y `VITE_API=real` en `http://localhost:5173`, con la API de demo en `http://localhost:4000`. Las dimensiones del viewport fueron **375 × 812** y **1280 × 800**. Cada fase recorre las ocho rutas y los estados de flujo indicados abajo: **46 capturas antes y 46 después**. Las capturas son del viewport; algunas de flujo se desplazan hasta el mensaje o los indicadores para mostrarlos completos.

Ejecutor reproducible: [verde.mjs](verde.mjs), con `NOKI_CAPTURA_FASE=antes` o `despues`, `NOKI_BROWSER_TOOLS` apuntando al Playwright temporal instalado y Chrome local. La fase `antes` se ejecutó con el producto anterior a D7. La fase `despues` con D7 aplicado. No se agregaron dependencias al proyecto.

- [Salida antes](07-antes-ejecucion.txt), [mediciones antes](07-antes-resultados.json).
- [Salida después](07-despues-ejecucion.txt), [mediciones después](07-despues-resultados.json).
- **46/46 comprobaciones por fase**: sin desplazamiento horizontal de página; sin errores JavaScript ni solicitudes a terceros. Los únicos orígenes son la aplicación correspondiente y la API local en modo real.
- Después, `.layout` tiene borde superior de **3 px, rgb(0,137,89)** y ancho igual al viewport en las ocho rutas y ambos modos/tamaños. Es el borde superior de la página, no una nueva barra fija.
- Cero controles con verde en texto, fondo, bordes o contorno, excluyendo únicamente el enlace `.marca` autorizado. El canal seleccionado sigue azul `rgb(0,116,217)` con texto blanco.
- Éxito: texto `rgb(0,107,69)` sobre `rgb(230,244,238)`, borde izquierdo de 3 px de marca y padding de 16 px, igual que `.aviso`. Contraste calculado **5,81:1** (sobre blanco: 6,59:1). El estado pendiente de cancelación conserva su presentación anterior.
- Solo las tarjetas `huecosRecuperados`, `horasRecursoRecuperadas` y `diasAdelantadosPromedio` llevan el borde superior verde; sus valores siguen en `var(--tinta)`. Las demás tarjetas conservan su borde original.

## Ocho rutas · antes / después

Cada celda enlaza las capturas antes y después, respectivamente. Móvil: 375 × 812; escritorio: 1280 × 800.

| Ruta | Simulado móvil | Simulado escritorio | Real móvil | Real escritorio |
|---|---|---|---|---|
| `/` | [Antes](07-antes-mock-375-inicial-portada.png) / [Después](07-despues-mock-375-inicial-portada.png) | [Antes](07-antes-mock-1280-inicial-portada.png) / [Después](07-despues-mock-1280-inicial-portada.png) | [Antes](07-antes-real-375-inicial-portada.png) / [Después](07-despues-real-375-inicial-portada.png) | [Antes](07-antes-real-1280-inicial-portada.png) / [Después](07-despues-real-1280-inicial-portada.png) |
| `/web` | [Antes](07-antes-mock-375-inicial-web.png) / [Después](07-despues-mock-375-inicial-web.png) | [Antes](07-antes-mock-1280-inicial-web.png) / [Después](07-despues-mock-1280-inicial-web.png) | [Antes](07-antes-real-375-inicial-web.png) / [Después](07-despues-real-375-inicial-web.png) | [Antes](07-antes-real-1280-inicial-web.png) / [Después](07-despues-real-1280-inicial-web.png) |
| `/wa` | [Antes](07-antes-mock-375-inicial-wa.png) / [Después](07-despues-mock-375-inicial-wa.png) | [Antes](07-antes-mock-1280-inicial-wa.png) / [Después](07-despues-mock-1280-inicial-wa.png) | [Antes](07-antes-real-375-inicial-wa.png) / [Después](07-despues-real-375-inicial-wa.png) | [Antes](07-antes-real-1280-inicial-wa.png) / [Después](07-despues-real-1280-inicial-wa.png) |
| `/app` | [Antes](07-antes-mock-375-inicial-app.png) / [Después](07-despues-mock-375-inicial-app.png) | [Antes](07-antes-mock-1280-inicial-app.png) / [Después](07-despues-mock-1280-inicial-app.png) | [Antes](07-antes-real-375-inicial-app.png) / [Después](07-despues-real-375-inicial-app.png) | [Antes](07-antes-real-1280-inicial-app.png) / [Después](07-despues-real-1280-inicial-app.png) |
| `/callcenter` | [Antes](07-antes-mock-375-inicial-callcenter.png) / [Después](07-despues-mock-375-inicial-callcenter.png) | [Antes](07-antes-mock-1280-inicial-callcenter.png) / [Después](07-despues-mock-1280-inicial-callcenter.png) | [Antes](07-antes-real-375-inicial-callcenter.png) / [Después](07-despues-real-375-inicial-callcenter.png) | [Antes](07-antes-real-1280-inicial-callcenter.png) / [Después](07-despues-real-1280-inicial-callcenter.png) |
| `/clinica` | [Antes](07-antes-mock-375-inicial-clinica.png) / [Después](07-despues-mock-375-inicial-clinica.png) | [Antes](07-antes-mock-1280-inicial-clinica.png) / [Después](07-despues-mock-1280-inicial-clinica.png) | [Antes](07-antes-real-375-inicial-clinica.png) / [Después](07-despues-real-375-inicial-clinica.png) | [Antes](07-antes-real-1280-inicial-clinica.png) / [Después](07-despues-real-1280-inicial-clinica.png) |
| `/admin` | [Antes](07-antes-mock-375-inicial-admin.png) / [Después](07-despues-mock-375-inicial-admin.png) | [Antes](07-antes-mock-1280-inicial-admin.png) / [Después](07-despues-mock-1280-inicial-admin.png) | [Antes](07-antes-real-375-inicial-admin.png) / [Después](07-despues-real-375-inicial-admin.png) | [Antes](07-antes-real-1280-inicial-admin.png) / [Después](07-despues-real-1280-inicial-admin.png) |
| `/bandeja` | [Antes](07-antes-mock-375-inicial-bandeja.png) / [Después](07-despues-mock-375-inicial-bandeja.png) | [Antes](07-antes-mock-1280-inicial-bandeja.png) / [Después](07-despues-mock-1280-inicial-bandeja.png) | [Antes](07-antes-real-375-inicial-bandeja.png) / [Después](07-despues-real-375-inicial-bandeja.png) | [Antes](07-antes-real-1280-inicial-bandeja.png) / [Después](07-despues-real-1280-inicial-bandeja.png) |

## Llegada, cancelación y logros

En modo simulado se operó el **Flujo A completo** desde Call Center, continuando en WhatsApp, confirmando la cita y registrando la llegada en Clínica. En el **Flujo C** se solicitó cancelar en App, se aprobó en WhatsApp y se aceptó el adelanto de Beto antes de revisar Admin. Se repitieron estas interacciones en ambos tamaños y fases.

| Estado simulado | Móvil antes / después | Escritorio antes / después |
|---|---|---|
| A · Llegada registrada | [Antes](07-antes-mock-375-flujoA-llegada-clinica.png) / [Después](07-despues-mock-375-flujoA-llegada-clinica.png) | [Antes](07-antes-mock-1280-flujoA-llegada-clinica.png) / [Después](07-despues-mock-1280-flujoA-llegada-clinica.png) |
| C · Aprobación pendiente | [Antes](07-antes-mock-375-flujoC-pendiente-app.png) / [Después](07-despues-mock-375-flujoC-pendiente-app.png) | [Antes](07-antes-mock-1280-flujoC-pendiente-app.png) / [Después](07-despues-mock-1280-flujoC-pendiente-app.png) |
| C · Cancelación completada | [Antes](07-antes-mock-375-flujoC-cancelada-app.png) / [Después](07-despues-mock-375-flujoC-cancelada-app.png) | [Antes](07-antes-mock-1280-flujoC-cancelada-app.png) / [Después](07-despues-mock-1280-flujoC-cancelada-app.png) |
| C · Logros en Admin | [Antes](07-antes-mock-375-flujoC-logros-admin.png) / [Después](07-despues-mock-375-flujoC-logros-admin.png) | [Antes](07-antes-mock-1280-flujoC-logros-admin.png) / [Después](07-despues-mock-1280-flujoC-logros-admin.png) |

En **modo real se ejecutaron las dos operaciones contra la API de demo local con citas ficticias ya sembradas**, una para registrar llegada y otra para cancelar. La llegada se registró desde Clínica y la cancelación desde App, aprobándola en WhatsApp. Se comprobó el estado `CANCELADA` mediante la consulta del trámite. Los IDs y las banderas de ejecución están en [07-real-contexto.json](07-real-contexto.json). No se reinició la base ni se llamó a Salud Digna o Meta.

La consulta real de citas excluye las canceladas y el contexto de demo puede avanzar a otro hilo. Por eso la vista real de App tras cancelar muestra las citas que devuelve la consulta vigente, **no se afirma que muestre el párrafo «La cita se canceló.»**. Ese párrafo se validó con su `role="status"` en el recorrido simulado y las pruebas de componente. No se cambiaron consultas ni comportamiento para producir una captura. Las operaciones reales se hicieron una sola vez durante la preparación anterior; después se volvieron a leer sus estados persistidos en ambos tamaños, sin repetir una acción irreversible ni generar citas adicionales.

| Estado real local | Móvil antes / después | Escritorio antes / después |
|---|---|---|
| Llegada registrada | [Antes](07-antes-real-375-llegada-local-clinica.png) / [Después](07-despues-real-375-llegada-local-clinica.png) | [Antes](07-antes-real-1280-llegada-local-clinica.png) / [Después](07-despues-real-1280-llegada-local-clinica.png) |
| App tras cancelar | [Antes](07-antes-real-375-cancelacion-local-app.png) / [Después](07-despues-real-375-cancelacion-local-app.png) | [Antes](07-antes-real-1280-cancelacion-local-app.png) / [Después](07-despues-real-1280-cancelacion-local-app.png) |
| Logros de Admin | [Antes](07-antes-real-375-logros-local-admin.png) / [Después](07-despues-real-375-logros-local-admin.png) | [Antes](07-antes-real-1280-logros-local-admin.png) / [Después](07-despues-real-1280-logros-local-admin.png) |

## Ajustes 1–4 conservados

[07-solo-presentacion.json](07-solo-presentacion.json) compara contra [07-base.json](07-base.json): retirando únicamente las adiciones autorizadas D7, **todo el CSS anterior coincide literalmente**. En TSX, retirando únicamente clases de presentación y el conjunto local de claves de logro, los componentes coinciden. `Layout.tsx` no cambió. Se conservaron textos, elementos, roles, enlaces, controles, consultas, callbacks y orden del DOM.

Las mediciones posteriores confirman marca móvil de 24 px y en una línea; insignia sin salto; barra con guion de **155,5 px ≤ 162 px**; controles de barra de al menos 44 × 44 px; estado con texto accesible completo y elipsis visual; progreso de 4 px en móvil y 8 px en escritorio; títulos de vista de hasta 48 px, conservando la excepción de portada; texto del paso de escritorio de 15 px en tinta; y compositor de WhatsApp sin quedar tapado. Se conservan los divisores y el fondo azul claro continuo de la barra.

Inspección visual de las capturas de llegada móvil, cancelación de escritorio y logros de Admin: las superficies y proporciones siguen la familia existente; el cambio visible se limita a D7. La comprobación automática de patrones de diseño señaló el borde izquierdo de éxito, el borde superior de las tarjetas y Open Sans: son decisiones expresas D7/D2 y se conservaron. No se añadieron sombras, íconos ni fuentes. Alcance del navegador: Chrome de escritorio con viewport móvil, sin teclado virtual ni dispositivo físico.

El primer intento de automatización usó un selector ambiguo de un botón histórico deshabilitado de WhatsApp; se corrigió el selector del ejecutor para elegir el botón habilitado. Se conserva [07-captura-selector.txt](07-captura-selector.txt); no motivó cambios en el producto.
