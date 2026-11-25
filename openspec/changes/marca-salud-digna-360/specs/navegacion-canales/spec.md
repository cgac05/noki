# Spec Delta

## ADDED Requirements

### Requirement: Identidad visual Salud Digna 360
La aplicación web SHALL presentarse con el nombre «Salud Digna 360»:
- en la marca del encabezado de todas las rutas, que enlaza a la portada;
- en el título del documento;
- en la descripción de la página.

Ningún texto visible ni el título MUST mostrar el nombre interno «noki».

La interfaz SHALL usar la paleta de Salud Digna:
- verde `#008959` para la marca y los acentos;
- azul `#0074D9` como fondo de los controles principales;
- azul `#005BB5` para los enlaces y el texto interactivo sobre fondo claro;
- gris `#2E3133` para el texto principal y `#43474A` para el secundario;
- gris `#868589` para los bordes de los campos.

Cada combinación de texto y fondo que use la interfaz MUST alcanzar un contraste mínimo de 4.5:1. El indicador de foco y los bordes de los controles MUST alcanzar 3:1 contra el fondo. El verde `#008959` MUST usarse solo en texto grande (al menos 24 px, o 18.66 px en negrita) o en elementos no textuales.

La tipografía SHALL ser Open Sans, con una pila de respaldo del sistema, y MUST servirse desde la propia aplicación, sin pedir recursos a terceros, para que la demo funcione sin conexión externa.

La interfaz MUST NOT incluir el logo ni otros archivos gráficos de Salud Digna: la marca se muestra como texto. Los estados que ya distinguen las vistas (error, aviso, deshabilitado y la insignia «Modo simulado») SHALL seguir distinguiéndose entre sí.

La barra de demo SHALL presentar los canales y los controles de simulación como dos grupos sobre una superficie azul claro continua:
- los canales SHALL verse sin cajas ni bordes individuales, separados por divisores verticales cortos y espacio;
- el canal de la ruta actual SHALL distinguirse con el color de acción y texto de contraste;
- cuando hay un guion simulado, sus controles (guion, paso y reinicio) SHALL aparecer en un grupo propio con el mismo fondo azul claro, sin borde superior verde, con la etiqueta «Simulación» y un indicador de progreso del guion (paso actual sobre total), además del texto del paso.

Presentación para exposiciones:
- **Celular (375 × 812 px):**
  - la marca y la insignia «Modo simulado» SHALL caber cada una en una sola línea;
  - con un guion simulado, la barra fija inferior MUST NOT ocupar más del 20 % del alto de la ventana;
  - el texto del paso SHALL mostrarse en una sola línea, recortado con «…» si no cabe, y conservar completo su texto accesible;
  - cuando la fila de canales tiene más contenido del que cabe, SHALL mostrar un indicador visual en el borde hacia el que se puede deslizar.
- **Títulos:** en todas las rutas salvo la portada, el título principal MUST NOT superar 3 rem. Al navegar a una ruta, el título MUST quedar visible, sin quedar tapado por la barra de demo fija.
- **Paso del guion en escritorio:** el texto del paso SHALL medir al menos 0.875 rem y usar el color de texto principal, y el indicador de progreso al menos 8 px de alto.
- **Admin:** los indicadores y los trámites por estado SHALL mostrarse como tarjetas en cuadrícula (valor destacado y etiqueta), usando solo las superficies, los bordes y la tipografía de la paleta existente, sin sombras ni colores nuevos.
- **Estados vacíos:** los mensajes de las vistas que indican que no hay elementos que mostrar SHALL compartir un mismo estilo de superficie suave, conservando su texto y sus enlaces.

Acento verde de identidad (ajuste 5):
- El azul SHALL seguir siendo el color de todo lo que se pulsa. El verde SHALL reservarse para la identidad y lo positivo, y MUST NOT usarse como fondo ni como texto de controles interactivos.
- La página SHALL mostrar una línea verde de marca de 3 px a todo el ancho, en su borde superior.
- Los mensajes que confirman que una acción terminó bien (por ejemplo, «Llegada registrada» en `/clinica` y «La cita se canceló.» en `/app`) SHALL mostrarse con un estilo de éxito: fondo verde claro y texto verde oscuro, con contraste de al menos 4.5:1. Los avisos, las cargas y los errores conservan su estilo.
- En `/admin`, las tarjetas de los indicadores de logro del relleno de huecos (`huecosRecuperados`, `horasRecursoRecuperadas` y `diasAdelantadosPromedio`) SHALL distinguirse con un acento verde no textual. Las demás tarjetas no cambian.

Estos cambios MUST NOT alterar qué hace cada control ni los textos de las vistas, y SHALL seguir cumpliendo el contraste y el área táctil de este requisito y de «Diseño móvil primero».

#### Scenario: Nombre en cada ruta
- **WHEN** se abre cualquier ruta de la aplicación
- **THEN** el encabezado muestra «Salud Digna 360» como enlace a la portada, el título del documento contiene «Salud Digna 360» y ningún texto visible contiene «noki»

#### Scenario: Contraste de la paleta
- **WHEN** se evalúan todas las combinaciones de texto y fondo, y de foco y borde contra su fondo, que declaran los estilos
- **THEN** cada combinación de texto alcanza 4.5:1 y cada indicador de foco o borde de control alcanza 3:1, y el verde `#008959` no aparece como color de texto de tamaño normal

#### Scenario: Tipografía sin terceros
- **WHEN** se carga la aplicación
- **THEN** el texto usa Open Sans y no se hace ninguna petición a un dominio distinto del de la aplicación para obtener fuentes

#### Scenario: Sin logo de Salud Digna
- **WHEN** se inspeccionan los recursos que sirve la aplicación
- **THEN** no hay ningún archivo gráfico del logo de Salud Digna y la marca del encabezado es texto

#### Scenario: Barra de demo con grupos separados
- **WHEN** la aplicación corre con el cliente simulado en el paso 1 de 14 del Flujo A
- **THEN** los canales aparecen sobre azul claro continuo, sin cajas individuales y separados por líneas verticales cortas; el canal actual tiene el color de acción; los controles de simulación comparten ese fondo en su grupo con la etiqueta «Simulación», el texto «Paso 1 de 14 · Esperando llamada» y un indicador de progreso de 1 de 14; y con el cliente real solo aparece el grupo de canales

#### Scenario: Celular compacto
- **WHEN** se abre `/wa` con el cliente simulado en una ventana de 375 × 812 px
- **THEN** la marca y la insignia ocupan una línea cada una, la barra fija ocupa como máximo 162 px de alto, el paso se muestra en una línea con su texto accesible completo y la fila de canales indica que se puede deslizar

#### Scenario: Título visible al navegar
- **WHEN** se navega a `/admin` desde la barra de demo en una ventana de 1280 × 800 px
- **THEN** el título principal mide como máximo 3 rem y queda completo por debajo de la barra de demo

#### Scenario: Indicadores en tarjetas
- **WHEN** se abre `/admin` con métricas
- **THEN** cada indicador y cada estado de trámite aparecen en una tarjeta de una cuadrícula, con su valor y su etiqueta, sin sombras y con colores de la paleta

#### Scenario: Estado vacío
- **WHEN** una vista muestra que no hay elementos (por ejemplo, `/app` sin citas o el panel de huecos vacío)
- **THEN** el mensaje aparece con el estilo común de estado vacío, con el mismo texto y los mismos enlaces que antes

#### Scenario: Acento verde de identidad
- **WHEN** se abre `/admin` con las métricas del relleno de huecos y, en `/clinica`, se registra una llegada
- **THEN** la página tiene la línea verde superior, las tarjetas de huecos recuperados, horas de recurso y días adelantados muestran el acento verde y las demás no, el mensaje «Llegada registrada» usa el estilo de éxito con contraste de al menos 4.5:1, y ningún botón ni enlace usa el verde

#### Scenario: Modo simulado visible
- **WHEN** la aplicación corre con el cliente simulado
- **THEN** la insignia «Modo simulado» sigue visible junto a la marca y se distingue de los avisos y errores
