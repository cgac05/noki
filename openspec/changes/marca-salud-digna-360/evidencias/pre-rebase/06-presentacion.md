# Presentación para exposiciones — ajuste 4 (D6)

Fecha: 2026-11-25. Base: 0b59599722ae1999ba24f61d7399b8a007b92bac, más la entrega sin commit del manifiesto 04-archivos-entregados.json. Autorización: handoff.md, ajuste 4 preparado por Claude. Solo M1–M4 y G1–G5; G6 y G7 no se aplicaron.

## Entorno y reproducción

Chrome instalado y Playwright 1.56.1 temporal, sin dependencias nuevas. Vite simulado en http://localhost:5174 y real en http://localhost:5173, con la API local configurada en localhost:4000. Las capturas reales utilizan lecturas de esa API; el recorrido no envía comandos de negocio reales. Los pasos de los guiones solo se ejecutan con el cliente simulado.

Desde la raíz, con ambos Vite activos:

```powershell
$env:COREPACK_HOME='C:/Users/Luis Rodriguez/AppData/Local/node/corepack'
$env:NOKI_BROWSER_TOOLS='C:/Users/Luis Rodriguez/AppData/Local/Temp/noki-marca-browser'
$env:NOKI_CAPTURA_FASE='antes' # ejecutar antes de modificar los estilos
node openspec/changes/marca-salud-digna-360/evidencias/presentacion.mjs
$env:NOKI_CAPTURA_FASE='despues'
node openspec/changes/marca-salud-digna-360/evidencias/presentacion.mjs
```

Resultados: [antes](06-antes-resultados.json), [después](06-despues-resultados.json); salidas: [antes](06-antes-ejecucion.txt) y [después](06-despues-ejecucion.txt). Hay 44 capturas/mediciones previas y 52 posteriores: las ocho rutas en ambos modos y tamaños, navegación a Admin, pasos 1/2 de A/C, desplazamiento en inicio/medio/fin y, adicionalmente, ausencia de desbordamiento a 767 px.

## Resultado medido

| Comprobación | Antes | Después |
|---|---|---|
| Barra simulada a 375 × 812, A pasos 1/2 y C paso 1 | 196 px | 155,5 px |
| Barra simulada a 375 × 812, C paso 2 | 215,5 px | 155,5 px |
| Límite de barra simulada | Superaba 162 px | PASS: 155,5 ≤ 162 px (19,15 % de 812 px) |
| Marca móvil | 32 px, dos líneas | 24 px, nowrap, una línea |
| Insignia | Podía partirse | nowrap, una línea (26,375 px de alto con borde y relleno) |
| Paso en escritorio | 13 px, tinta secundaria | 15 px, tinta principal |
| Progreso | 10 px | 4 px en móvil; 8 px en escritorio |
| Título de vistas a 1280 px, excepto portada | Hasta 72 px | 48 px como máximo; portada mantiene su escala grande |
| Página a 375 px | Sin desbordamiento | Sin desbordamiento en las ocho rutas y ambos modos |

La etiqueta, el selector y el reinicio comparten la primera fila móvil. El texto visible «Guion de demo» se conserva sobre el selector, a 0,625 rem; no se oculta ni se cambia su nombre accesible. El paso ocupa una línea debajo, con elipsis y contenido accesible completo, y el progreso queda debajo de ese texto. Todos los controles de la barra conservan al menos 44 × 44 px.

El compositor de WhatsApp termina donde empieza la barra. A 375 px en simulado, la barra empieza en y = 656,5 y el compositor termina en y = 656,5; en real, ambos límites coinciden en y = 755. «Enviar» está visible y no hay un elemento encima (comprobado con elementFromPoint).

Al navegar a Admin desde una pantalla desplazada, su título queda completo debajo de la barra. Los resultados incluyen sus coordenadas, el tamaño y el scroll-margin-top calculado. En Admin, solo las dos series aprobadas tienen datos-tarjetas; cada tarjeta conserva DT antes de DD en el DOM, muestra el valor arriba por CSS, usa 28 px/peso 600 para el valor y no tiene sombra.

M4 usa consultas CSS del estado de desplazamiento y pseudo-elementos vacíos: no agrega JavaScript, elementos interactivos ni nodos con texto accesible. En móvil, inicio = solo degradado derecho; mitad = ambos; fin = solo izquierdo. A 767 px, cuando los canales caben, ambos quedan ocultos. pointer-events es none. Esto se comprobó con el Chrome disponible (container-type: scroll-state admitido).

No se registraron excepciones JavaScript ni peticiones a terceros: solo los orígenes de la web y la API local. Este recorrido usa tamaños móviles en Chrome; no afirma una prueba en un teléfono físico con teclado virtual.

## Capturas antes y después

Las capturas son de ventana: 1280 × 800 y 375 × 812. Datos ficticios de demo.

| Modo | Ruta | 375 antes | 375 después | 1280 antes | 1280 después |
|---|---|---|---|---|---|
| mock | / | [antes](06-antes-mock-375-inicial-portada.png) | [despues](06-despues-mock-375-inicial-portada.png) | [antes](06-antes-mock-1280-inicial-portada.png) | [despues](06-despues-mock-1280-inicial-portada.png) |
| mock | /web | [antes](06-antes-mock-375-inicial-web.png) | [despues](06-despues-mock-375-inicial-web.png) | [antes](06-antes-mock-1280-inicial-web.png) | [despues](06-despues-mock-1280-inicial-web.png) |
| mock | /wa | [antes](06-antes-mock-375-inicial-wa.png) | [despues](06-despues-mock-375-inicial-wa.png) | [antes](06-antes-mock-1280-inicial-wa.png) | [despues](06-despues-mock-1280-inicial-wa.png) |
| mock | /app | [antes](06-antes-mock-375-inicial-app.png) | [despues](06-despues-mock-375-inicial-app.png) | [antes](06-antes-mock-1280-inicial-app.png) | [despues](06-despues-mock-1280-inicial-app.png) |
| mock | /callcenter | [antes](06-antes-mock-375-inicial-callcenter.png) | [despues](06-despues-mock-375-inicial-callcenter.png) | [antes](06-antes-mock-1280-inicial-callcenter.png) | [despues](06-despues-mock-1280-inicial-callcenter.png) |
| mock | /clinica | [antes](06-antes-mock-375-inicial-clinica.png) | [despues](06-despues-mock-375-inicial-clinica.png) | [antes](06-antes-mock-1280-inicial-clinica.png) | [despues](06-despues-mock-1280-inicial-clinica.png) |
| mock | /admin | [antes](06-antes-mock-375-inicial-admin.png) | [despues](06-despues-mock-375-inicial-admin.png) | [antes](06-antes-mock-1280-inicial-admin.png) | [despues](06-despues-mock-1280-inicial-admin.png) |
| mock | /bandeja | [antes](06-antes-mock-375-inicial-bandeja.png) | [despues](06-despues-mock-375-inicial-bandeja.png) | [antes](06-antes-mock-1280-inicial-bandeja.png) | [despues](06-despues-mock-1280-inicial-bandeja.png) |
| real | / | [antes](06-antes-real-375-inicial-portada.png) | [despues](06-despues-real-375-inicial-portada.png) | [antes](06-antes-real-1280-inicial-portada.png) | [despues](06-despues-real-1280-inicial-portada.png) |
| real | /web | [antes](06-antes-real-375-inicial-web.png) | [despues](06-despues-real-375-inicial-web.png) | [antes](06-antes-real-1280-inicial-web.png) | [despues](06-despues-real-1280-inicial-web.png) |
| real | /wa | [antes](06-antes-real-375-inicial-wa.png) | [despues](06-despues-real-375-inicial-wa.png) | [antes](06-antes-real-1280-inicial-wa.png) | [despues](06-despues-real-1280-inicial-wa.png) |
| real | /app | [antes](06-antes-real-375-inicial-app.png) | [despues](06-despues-real-375-inicial-app.png) | [antes](06-antes-real-1280-inicial-app.png) | [despues](06-despues-real-1280-inicial-app.png) |
| real | /callcenter | [antes](06-antes-real-375-inicial-callcenter.png) | [despues](06-despues-real-375-inicial-callcenter.png) | [antes](06-antes-real-1280-inicial-callcenter.png) | [despues](06-despues-real-1280-inicial-callcenter.png) |
| real | /clinica | [antes](06-antes-real-375-inicial-clinica.png) | [despues](06-despues-real-375-inicial-clinica.png) | [antes](06-antes-real-1280-inicial-clinica.png) | [despues](06-despues-real-1280-inicial-clinica.png) |
| real | /admin | [antes](06-antes-real-375-inicial-admin.png) | [despues](06-despues-real-375-inicial-admin.png) | [antes](06-antes-real-1280-inicial-admin.png) | [despues](06-despues-real-1280-inicial-admin.png) |
| real | /bandeja | [antes](06-antes-real-375-inicial-bandeja.png) | [despues](06-despues-real-375-inicial-bandeja.png) | [antes](06-antes-real-1280-inicial-bandeja.png) | [despues](06-despues-real-1280-inicial-bandeja.png) |

## Guiones y navegación

| Estado | 375 antes/después | 1280 antes/después |
|---|---|---|
| flujoA, paso 1 | [antes](06-antes-mock-375-flujoA-paso1-wa.png) · [despues](06-despues-mock-375-flujoA-paso1-wa.png) | [antes](06-antes-mock-1280-flujoA-paso1-wa.png) · [despues](06-despues-mock-1280-flujoA-paso1-wa.png) |
| flujoA, paso 2 | [antes](06-antes-mock-375-flujoA-paso2-wa.png) · [despues](06-despues-mock-375-flujoA-paso2-wa.png) | [antes](06-antes-mock-1280-flujoA-paso2-wa.png) · [despues](06-despues-mock-1280-flujoA-paso2-wa.png) |
| flujoC, paso 1 | [antes](06-antes-mock-375-flujoC-paso1-wa.png) · [despues](06-despues-mock-375-flujoC-paso1-wa.png) | [antes](06-antes-mock-1280-flujoC-paso1-wa.png) · [despues](06-despues-mock-1280-flujoC-paso1-wa.png) |
| flujoC, paso 2 | [antes](06-antes-mock-375-flujoC-paso2-wa.png) · [despues](06-despues-mock-375-flujoC-paso2-wa.png) | [antes](06-antes-mock-1280-flujoC-paso2-wa.png) · [despues](06-despues-mock-1280-flujoC-paso2-wa.png) |
| Navegar a Admin, mock | [antes](06-antes-mock-375-navegacion-admin.png) · [despues](06-despues-mock-375-navegacion-admin.png) | [antes](06-antes-mock-1280-navegacion-admin.png) · [despues](06-despues-mock-1280-navegacion-admin.png) |
| Navegar a Admin, real | [antes](06-antes-real-375-navegacion-admin.png) · [despues](06-despues-real-375-navegacion-admin.png) | [antes](06-antes-real-1280-navegacion-admin.png) · [despues](06-despues-real-1280-navegacion-admin.png) |

## Indicadores de desplazamiento

| Modo | Inicio | Mitad | Fin | Todo cabe (767 px) |
|---|---|---|---|---|
| mock | [despues](06-despues-mock-375-deslizar-inicio-wa.png) | [despues](06-despues-mock-375-deslizar-medio-wa.png) | [despues](06-despues-mock-375-deslizar-fin-wa.png) | [despues](06-despues-mock-767-canales-sin-desbordamiento-wa.png) |
| real | [despues](06-despues-real-375-deslizar-inicio-wa.png) | [despues](06-despues-real-375-deslizar-medio-wa.png) | [despues](06-despues-real-375-deslizar-fin-wa.png) | [despues](06-despues-real-767-canales-sin-desbordamiento-wa.png) |

## Evidencia de alcance

[06-solo-presentacion.json](06-solo-presentacion.json) compara los TSX con el estado previo [06-base.json](06-base.json): al retirar solo las clases y la envoltura decorativa de canales, los archivos son idénticos. Se conservan textos, enlaces, controles, callbacks, consultas y orden del DOM. El bloque :root es idéntico al anterior y no se agregó box-shadow. Layout.tsx no necesitó cambios en este ajuste.

Se inspeccionaron las capturas de móvil, escritorio, pasos largos, navegación a Admin y estados vacíos. El detector de diseño solo señaló Open Sans como fuente frecuente; se conserva porque D2 la exige.
