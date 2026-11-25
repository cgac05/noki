# Proposal

## Why

El prototipo se presenta a Salud Digna con el nombre interno «noki» y con una paleta verde propia que no se parece a la marca del cliente. Para las exposiciones, el equipo quiere que la interfaz se presente como **Salud Digna 360** y que use la identidad visual que Salud Digna ya usa en su logo y en `salud-digna.org`.

## What Changes

- El nombre visible pasa de «noki» a «Salud Digna 360»: marca del encabezado, título del documento y descripción de la página.
- La interfaz adopta la paleta de Salud Digna tomada de su logo oficial y de su sitio:
  - el verde del logo para la marca y los acentos;
  - el azul de su interfaz para los botones, los enlaces y el foco;
  - grises oscuros para el texto.

  Todos los colores quedan como variables en un solo lugar y con contraste WCAG AA.
- La tipografía pasa a Open Sans, la que usa su sitio, servida por la propia aplicación.
- No se copian el logo ni otros archivos gráficos de Salud Digna: la marca se escribe como texto.
- La barra de demo usa una superficie azul claro continua; los canales se separan con divisores verticales cortos, sin cajas individuales, y el actual destaca con el color de acción. Conserva los controles y el progreso de simulación (D5, ajuste autorizado en Codex).

- Ajustes de presentación para las exposiciones (D6, ajuste 4), sin cambiar textos ni funciones:
  - en celular: marca e insignia en una línea, barra de simulación compacta e indicador para deslizar los canales;
  - títulos de vista más moderados y siempre visibles bajo la barra;
  - paso del guion legible en un proyector;
  - indicadores de Admin en tarjetas;
  - estados vacíos con un estilo común.

- Acento verde de identidad (D7, ajuste 5): el azul se queda para todo lo que se pulsa; el verde del logo se suma como sello, con una línea superior de marca, mensajes de éxito en verde y las tarjetas de logro del relleno de huecos en `/admin`. Agrega dos variables derivadas del logo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `navegacion-canales`: nuevo requisito «Identidad visual Salud Digna 360» (nombre visible, paleta, contraste, tipografía y uso de la marca).

## Impact

- Solo `apps/web` (frente B):
  - `index.html`;
  - `src/componentes/Layout.tsx`;
  - `src/componentes/BarraDemo.tsx`;
  - el marcado de presentación de `Portada.tsx`, `Admin.tsx` y de las vistas o componentes con estados vacíos (solo clases; ajuste 4);
  - `src/styles.css`;
  - la carga de la fuente;
  - las pruebas de la web;
  - `apps/web/package.json` si se agrega la fuente como dependencia, con su efecto en `pnpm-lock.yaml`.
- Fuera del cambio:
  - los nombres internos (`@noki/*`, las bases `noki` y `noki_test`, las claves `noki:wa:*` de `sessionStorage`, el repositorio);
  - `README.md` y los documentos compartidos;
  - los textos de las vistas que no muestran el nombre.

  Si se quiere renombrar algo de esto, va en un cambio aparte.
- Sin cambios en contratos, API, dominio ni comportamiento de las vistas. Los guiones simulados y el modo real siguen igual.
- Fuente de la paleta: Salud Digna no publica un manual de marca. Los colores se tomaron el 2026-11-25 del SVG del logo (`LogoSaludDigna.svg`, de su CDN) y de las variables CSS de `salud-digna.org`. Si Salud Digna entrega una guía oficial, solo cambian los valores de las variables.
- Responsable: frente B (`LuisMaster119`). No toca archivos compartidos.
