# Design

## Context

Ver `proposal.md` (Why). Estado actual de `apps/web`:

- El nombre «noki» aparece en tres lugares:
  - `index.html`: `<title>`, la descripción y `theme-color` (`#174c3c`);
  - la marca de `Layout.tsx`;
  - el `aria-label` de la marca.

  El encabezado muestra además «Salud Digna · HackaTec» y la insignia «Modo simulado».
- `styles.css` define en `:root` solo dos variables (`--tinta-secundaria` y `--linea`). Los demás colores (unos 38 valores, entre ellos los verdes `#163c31`, `#21734f` y `#18593d` y el café `#763a23` de los errores) están escritos directamente en las reglas. La fuente es `"Segoe UI", system-ui, sans-serif`, sin fuentes web.
- `index.html` declara `referrer: no-referrer`, y la demo debe funcionar sin red externa (salas de exposición). No hay ninguna petición a terceros.
- Las pruebas de `rutas.test.tsx` fijan el `h1` de la portada, que no cambia.

Paleta tomada el 2026-11-25:
- **Logo** (`LogoSaludDigna.svg`): verde `#008959` y grises `#868589` y `#808082`.
- **Variables CSS de `salud-digna.org`**: azul primario `#0074D9`, hover `#0066BF`, oscuros `#005BB5` y `#004480`, fondos claros `#ECF3F9` y `#E6F2FC`, texto `#43474A` y `#2E3133`.
- **Fuente del sitio:** Open Sans.

## Goals / Non-Goals

**Goals:**
- Que la paleta viva en variables de `:root` y que las reglas no repitan colores escritos a mano, para cambiarla en un solo lugar si Salud Digna entrega una guía oficial.
- Que una prueba automática compruebe el contraste de la paleta.

**Non-Goals:**
- Rediseñar la disposición, los componentes o los textos de las vistas, salvo la barra de demo (D5, revisión 2).
- Modo oscuro.
- Renombrar los identificadores internos.

## Decisions

### D1. Variables de color con su uso
Variables en `:root`, con nombres que digan su uso y no su tono:

| Variable | Valor | Uso | Contraste |
|---|---|---|---|
| `--sd-marca` | `#008959` | Texto de la marca (grande) y acentos no textuales | 4.45:1 sobre blanco; solo texto grande |
| `--sd-accion` | `#0074D9` | Fondo de botones principales y anillo de foco | blanco sobre él: 4.67:1 |
| `--sd-accion-hover` | `#0066BF` | Hover de botones | blanco: 5.75:1 |
| `--sd-enlace` | `#005BB5` | Enlaces y texto interactivo sobre fondos claros | 6.64:1 sobre blanco; 5.93:1 sobre `#ECF3F9` |
| `--sd-fondo` | `#FFFFFF` | Fondo de la página | — |
| `--sd-fondo-suave` | `#ECF3F9` | Superficies secundarias (barra de demo, chats, burbujas) | — |
| `--tinta` | `#2E3133` | Texto principal | 13.1:1 |
| `--tinta-secundaria` | `#43474A` | Texto secundario | 9.4:1; 8.4:1 sobre `#ECF3F9` |
| `--borde-control` | `#868589` | Bordes de campos y controles | 3.66:1 (componente de interfaz) |
| `--linea` | `#EEF0F2` | Separadores decorativos | decorativo |
| `--error` | `#763a23` (el actual) | Mensajes de error | 8.75:1 |

- El fondo de la página pasa de `#f7faf6` a blanco, porque el azul `#0074D9` cae a 4.42:1 sobre un casi blanco como `#f7f9fb`. Por eso los enlaces usan `--sd-enlace` y no `--sd-accion`.
- Los colores de error, aviso y deshabilitado se conservan o pasan a variables, sin cambiar su significado. Los verdes actuales desaparecen.
- `theme-color` toma `#008959`.

### D2. Open Sans servida por la aplicación
Open Sans se incluye como dependencia de `apps/web` (por ejemplo, el paquete `@fontsource/open-sans` con la versión exacta fijada) y se importa en la entrada de la web. Solo se cargan los pesos que se usan (400, 600 y 700) y el subconjunto latino.
- Alternativa descartada: Google Fonts. Pide recursos a un tercero (filtra la visita y falla sin internet en una sala de exposición), y el proyecto no hace peticiones a terceros desde la web.
- Riesgo: agrega una dependencia y modifica `pnpm-lock.yaml`. Según `docs/trabajo-paralelo.md`, hay que hacer rebase sobre `main` justo antes de integrar y volver a correr `pnpm install`.

### D3. Marca como texto
La marca del encabezado es el texto «Salud Digna 360» con `--sd-marca`, en negrita y en tamaño grande, con `aria-label` «Salud Digna 360 · Portada». El contexto del encabezado deja de repetir «Salud Digna» y queda como «HackaTec», junto a la insignia «Modo simulado». No se descarga ni se incluye el SVG del logo.
- Alternativa descartada: usar el logo oficial. Es un activo de marca registrada y no tenemos permiso explícito para reproducirlo.

### D4. Prueba de contraste sobre las variables
Una prueba de la web lee `styles.css` y extrae las variables de `:root`. Con la fórmula de luminancia relativa de WCAG 2.x comprueba que:
- los pares de texto declarados (los de la tabla de D1) alcanzan 4.5:1;
- el foco y los bordes de control alcanzan 3:1;
- el texto `color: var(--sd-marca)` se reserva a la marca grande; los acentos no textuales de D5 pueden usar esa variable en sus bordes o rellenos;
- no queda ningún color hexadecimal fuera de `:root`.

La prueba lee el archivo desde la prueba, no desde la aplicación.

### D5. Barra de demo continua con divisores (ajuste 3 autorizado en Codex)
La revisión 2 implementó canales con cajas y dos fondos separados. El usuario pidió después quitar las cajas, mantener toda la barra en azul claro y separar las opciones con líneas verticales pequeñas. Autorizó actualizar aquí diseño, pruebas e implementación como excepción al flujo habitual de planificación con Claude. Este ajuste sustituye la presentación de D5, conservando sus controles y el progreso.

```
+-------------------------------------------------------------------+
| Web | WhatsApp | App | Call Center | Clinica | Admin | Bandeja   |  fondo --sd-fondo-suave
| Simulacion  Guion [Flujo A v]  Paso 1 de 14 · Esperando llamada |  mismo fondo continuo
|                                 [####--------------]   [Reiniciar]|
+-------------------------------------------------------------------+
```

- **Canales:**
  - enlaces sin borde ni caja individual, sobre el fondo continuo `--sd-fondo-suave`, texto `--sd-enlace` y separación de 0.5 rem;
  - entre canales adyacentes, un divisor vertical de 1 px `--borde-control` y 1.25 rem de alto, centrado; no es un control ni aparece en el árbol accesible;
  - el canal actual (`aria-current="page"`) lleva fondo `--sd-accion`, texto blanco (4.67:1) y peso 600;
  - el hover usa `--sd-fondo-interactivo`;
  - el foco sigue visible.
- **Franja de simulación:**
  - solo existe si hay un guion;
  - mismo fondo `--sd-fondo-suave`, sin borde superior verde ni recuadro para la etiqueta; los dos grupos se distinguen por su alineación, espacio y etiqueta;
  - empieza con la etiqueta «Simulación»: texto `--tinta` de 0.75 rem en peso 700, mayúsculas;
  - el selector y el reinicio conservan sus áreas táctiles, su función y bordes de control; sus fondos se integran en el azul claro. El reinicio queda a la derecha.
- **Progreso:**
  - un elemento `<progress>` (o equivalente con `role="progressbar"`, `aria-valuenow`, `aria-valuemin` y `aria-valuemax`) con valor = paso y máximo = total, con el texto del paso como nombre accesible;
  - relleno `--sd-marca` sobre una pista `--linea`: más de 3:1 contra la pista, y la pista con borde `--borde-control` para distinguirla del fondo;
  - el texto «Paso X de N · título» sigue siendo el `role="status"` actual.
- **Móvil (< 768 px):** la barra sigue fija abajo, con los canales desplazables en una fila y la franja de simulación debajo, sin desplazamiento horizontal de la página.
- **Variables:** no se agregan colores nuevos; todo usa las variables de D1, así que la prueba de D4 sigue aplicando.
- La variante de cajas individuales y franja blanca de la revisión 2 queda sustituida por decisión explícita del usuario; su evidencia se conserva en `evidencias/revision-2/`.

### D6. Ajustes de presentación para exposiciones (ajuste 4)
El 2026-11-25, Claude recorrió las 8 rutas a 1280 × 800 y a 375 × 812 px. `LuisMaster119` eligió las mejoras M1–M4 y G1–G5, y descartó G6 y G7, con la condición de no romper la unidad del diseño. Todo es CSS y marcado de presentación: no cambia ningún texto, control, dato ni consulta.

- **M1 · Marca en celular:** bajo 768 px, `.marca` pasa a unos 1.5 rem con `white-space: nowrap`, para que quepa en una línea a 375 px.
- **M2 · Insignia:** `.insignia-mock` con `white-space: nowrap`.
- **M3 · Franja compacta en celular:**
  - bajo 768 px, la franja de simulación usa una sola fila para la etiqueta, el selector y «Reiniciar», con el texto del paso en una línea debajo y `text-overflow: ellipsis`;
  - el nombre accesible del progreso y el `role="status"` conservan el texto completo;
  - el progreso baja a 4 px en celular;
  - objetivo: barra con guion ≤ 20 % del alto (162 px a 812 px), medida con el `ResizeObserver` que ya existe (`--alto-barra-demo`);
  - los controles conservan 44 × 44 px.
- **M4 · Indicador de deslizar:** cuando la fila de canales desborda, un degradado decorativo de `transparent` a `--sd-fondo-suave` sobre el borde derecho (o el izquierdo, si ya se deslizó), sin capturar clics (`pointer-events: none`). Se puede resolver con CSS (`mask-image`, o sombras de desplazamiento con `background-attachment: local`), o con una clase que se active al desbordar. Es decorativo y no entra al árbol accesible.
- **G1 · Títulos:** el `h1` de las vistas, salvo la portada, pasa a `clamp(2rem, 4vw, 3rem)`. El margen vertical de `.contenido` baja a unos `clamp(2rem, 5vw, 3.5rem)`. La portada conserva su título grande con una clase propia.
- **G2 · Paso legible:** en escritorio, el texto del paso pasa a 0.9375 rem con `--tinta`, y el progreso a 8 px de alto (relleno `--sd-marca`, pista `--linea` con borde `--borde-control`, como en D5).
- **G3 · Anclaje:** `#contenido` y los `h1` reciben `scroll-margin-top: calc(var(--alto-barra-demo, 0px) + 1rem)` en escritorio. Así, cuando `Layout` enfoca el contenido al cambiar de ruta, el título no queda bajo la barra fija. En celular la barra está abajo, así que no aplica.
- **G4 · Admin en tarjetas:**
  - solo «Trámites por estado» e «Indicadores disponibles» de `/admin` usan una variante de `.datos`, como `.datos-tarjetas`; la clase `.datos` de las demás vistas no cambia;
  - cuadrícula `repeat(auto-fill, minmax(10rem, 1fr))` con 0.75 rem de separación;
  - cada tarjeta: fondo `--sd-fondo-suave`, borde de 1 px `--linea`, radio de 0.5 rem, relleno de 1 rem, **sin sombras**;
  - el valor (`dd`) a 1.75 rem en peso 600 y `--tinta`; la etiqueta (`dt`) a 0.8125 rem en `--tinta-secundaria`.
  - No se usa verde en texto ni se agregan colores. El orden del DOM (`dt` antes que `dd`) se conserva; el valor se coloca arriba con `order` o con grid, sin reordenar el marcado.
- **G5 · Estados vacíos:**
  - una clase común `.estado-vacio`: fondo `--sd-fondo-suave`, borde de 1 px `--linea`, radio de 0.5 rem, relleno de 1.25 rem, texto `--tinta-secundaria` y enlaces `--sd-enlace`, sin íconos;
  - se aplica a los mensajes «no hay…» existentes: citas de `/app`, llegadas de `/clinica`, panel de huecos, alertas, línea de tiempo y bandeja, además de los de contexto ausente;
  - se conservan su texto, su elemento (`p` o el componente actual) y sus enlaces.
- **Unidad del diseño:** no se agregan colores, sombras, íconos ni familias tipográficas. Todo sale de las variables de D1, así que la prueba de D4 sigue vigente.
- Alternativas descartadas por el usuario: G6 (canales de la portada en tarjetas) y G7 (cita y ficha en tarjetas).

### D7. Acento verde de identidad (ajuste 5)
Salud Digna usa el verde en su logo y el azul en su interfaz. El 2026-11-25, `LuisMaster119` eligió conservar el azul y sumar el verde como sello de identidad, con la condición de que no se rompa la interfaz actual. La proporción buscada es de un 70 % de neutros, 20 % de azul (lo que se pulsa) y 10 % de verde (identidad y lo positivo).

- **Variables nuevas** (derivadas del verde del logo; son las únicas excepciones a «sin colores nuevos» de D6):

  | Variable | Valor | Uso | Contraste |
  |---|---|---|---|
  | `--sd-exito` | `#006B45` | Texto de mensajes de éxito | 6.59:1 sobre blanco; 5.81:1 sobre `--sd-fondo-exito` |
  | `--sd-fondo-exito` | `#E6F4EE` | Fondo de mensajes de éxito | — |

- **Línea de marca:** una franja de 3 px `--sd-marca` a todo el ancho, en el borde superior de la página (por ejemplo, `border-top` en `.layout` o un pseudo-elemento de `body`). Es decorativa, no desplaza el contenido de forma visible y está presente en las 8 rutas y en los dos modos.
- **Mensajes de éxito:** una clase `.estado-exito` con fondo `--sd-fondo-exito`, texto `--sd-exito`, borde izquierdo de 3 px `--sd-marca`, el mismo relleno que `.aviso` y sin íconos. Se aplica solo a las confirmaciones de una acción completada: «Llegada registrada» (`LlegadaClinica.tsx`) y «La cita se canceló.» (`App.tsx`). «Pendiente de aprobación», las cargas, los avisos y los errores no cambian. El texto, el elemento y el `role="status"` se conservan.
- **Tarjetas de logro en Admin:** las tarjetas de `huecosRecuperados`, `horasRecursoRecuperadas` y `diasAdelantadosPromedio` llevan un borde superior de 3 px `--sd-marca`, mediante una clase de presentación como `.tarjeta-logro`. La asigna `Admin.tsx` con un conjunto local de claves, como `ETIQUETAS_KPI`, y es presentación, no una regla de negocio. Fondo, tipografía y valor no cambian, y el valor sigue en `--tinta`.
- **Sin cambios:** el canal activo, los botones y los enlaces siguen en azul; el progreso sigue en verde.
- **Prueba:** la prueba de identidad (D4) acepta las dos variables nuevas, comprueba `--sd-exito` sobre `--sd-fondo-exito` ≥ 4.5:1 y verifica que el verde (`--sd-marca` o `--sd-exito`) no aparezca como fondo ni color de botones, enlaces o controles.
- Alternativa descartada: pasar toda la interfaz a verde. El verde del logo no alcanza AA en texto normal ni como fondo de botones con texto blanco; su versión oscura se parece menos a la marca; y el sitio actual de Salud Digna usa azul para la interacción.

## Risks / Trade-offs

- [La paleta no viene de un manual oficial] → Se documenta su origen y la fecha. Si llega una guía, solo cambian los valores de D1.
- [El verde `#008959` no alcanza 4.5:1 en texto normal] → Se usa solo en la marca grande y en acentos, y la prueba lo verifica.
- [El cambio visual afecta todas las vistas] → La disposición y los textos no cambian. Se revisan las rutas en 375 px y 1280 px, en los modos simulado y real.
- [Usar el nombre de Salud Digna en un prototipo] → Es el cliente del reto y el encabezado ya lo mencionaba. No se usa su logo, y el pie conserva «Entorno de demostración · Datos ficticios».

## Migration Plan

Sin migración. Rama `feat/marca-salud-digna-360` desde `main` `0b59599`. Rollback: revertir el commit; nada fuera de `apps/web` cambia, salvo `pnpm-lock.yaml`.

## Open Questions

Ninguna. El alcance (solo el nombre visible) y el uso de la paleta (como en su sitio) los decidió `LuisMaster119` el 2026-11-25.
