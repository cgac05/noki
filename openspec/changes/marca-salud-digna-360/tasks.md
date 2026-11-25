# Tasks

Requisito: IV = `navegacion-canales` («Identidad visual Salud Digna 360»). Decisiones D1–D4 de `design.md`. Todos los archivos están en `apps/web`. Pruebas con `corepack pnpm exec vitest run --project web <archivos>`; evidencia en `openspec/changes/marca-salud-digna-360/evidencias/`.

## 1. Pruebas en rojo

- [x] 1.1 Escribir en rojo los escenarios de IV:
  - En una prueba de rutas: en cada ruta, la marca «Salud Digna 360» enlaza a `/`; el título del documento contiene «Salud Digna 360»; ningún texto visible contiene «noki»; la insignia «Modo simulado» sigue visible con el cliente simulado.
  - En una prueba de estilos nueva (D4): contraste de 4.5:1 en los pares de texto de D1 y de 3:1 en el foco y los bordes de control; `--sd-marca` solo en la marca; ningún color hexadecimal fuera de `:root`; ninguna fuente pedida a un dominio externo, y ningún archivo del logo de Salud Digna en `apps/web`.

  Se conservan las pruebas actuales, incluido el `h1` de la portada. Verificar: fallan por lo ausente; `evidencias/01-rojo.txt`.

## 2. Paleta y tipografía

- [x] 2.1 Implementar D1 en `src/styles.css`: variables de `:root` con los valores y usos de la tabla, fondo blanco, y reemplazo de todos los colores escritos a mano por variables, conservando el significado de error, aviso y deshabilitado. Verificar: la prueba de estilos de 1.1 pasa en contraste y en ausencia de colores sueltos.
- [x] 2.2 Implementar D2: Open Sans como dependencia de `apps/web` con la versión exacta fijada, importada en la entrada (pesos 400, 600 y 700, subconjunto latino) y declarada primero en la pila de fuentes. Verificar: la prueba de fuentes sin terceros pasa; `corepack pnpm install` y `corepack pnpm --filter @noki/web build` terminan con código 0.

## 3. Nombre visible

- [x] 3.1 Implementar D3:
  - en `index.html`: título «Salud Digna 360 · Atención conectada», una descripción con el nuevo nombre y `theme-color` `#008959`;
  - en `src/componentes/Layout.tsx`: marca «Salud Digna 360» con `aria-label` «Salud Digna 360 · Portada» y contexto «HackaTec» junto a la insignia.

  Verificar: las pruebas de rutas de 1.1 pasan.
- [x] 3.2 Recorrer en el navegador las rutas `/`, `/web`, `/wa`, `/app`, `/callcenter`, `/clinica`, `/admin` y `/bandeja`, a 375 × 812 px y a 1280 px, con `VITE_API=mock` (con un paso de cada guion) y con `VITE_API=real`. Verificar: no hay desplazamiento horizontal, los estados de error, deshabilitado y «Modo simulado» se distinguen, y las peticiones de red no salen del dominio de la aplicación ni de la API. Capturas en `evidencias/03-recorrido.md`.

## 5. Barra de demo continua con divisores (ajuste 3 autorizado, D5)

- [x] 5.1 Escribir en rojo, en las pruebas de la web, el escenario «Barra de demo con grupos separados»:
  - con el cliente simulado: la franja con la etiqueta «Simulación», el progreso accesible con valor 1 y máximo 14, el texto «Paso 1 de 14 · Esperando llamada» y el canal actual marcado con `aria-current="page"`;
  - con el cliente real: sin franja de simulación;
  - en la prueba de estilos: fondo azul claro continuo en ambos grupos, canales sin borde ni caja, divisores verticales cortos de contraste ≥ 3:1, colores de D5 desde variables, texto blanco sobre `--sd-accion` ≥ 4.5:1 y progreso ≥ 3:1 contra su pista.

  Verificar: fallan por lo ausente; `evidencias/05-rojo.txt`.
- [x] 5.2 Implementar D5 en `src/componentes/BarraDemo.tsx` y `src/styles.css`, sin cambiar qué hace cada control. Verificar: las pruebas de 5.1 y las existentes de la barra, los guiones y las rutas pasan.
- [x] 5.3 Revisar la barra en el navegador a 375 × 812 px y a 1280 px, en modo simulado (pasos 1 y 2 de cada guion) y en modo real. Verificar: fondo azul claro continuo, canales sin cajas separados por divisores verticales, selección diferenciada, foco visible, sin desplazamiento horizontal de página y compositor de `/wa` sin tapar. Capturas en `evidencias/05-barra.md`.

## 6. Ajustes de presentación (ajuste 4, D6)

- [x] 6.1 Escribir en rojo los escenarios «Celular compacto», «Título visible al navegar», «Indicadores en tarjetas» y «Estado vacío»:
  - en las pruebas de la web: la clase de tarjetas en las dos secciones de `/admin`, la clase común en cada estado vacío (con el mismo texto y los mismos enlaces) y el texto accesible completo del paso;
  - en la prueba de estilos: en móvil, `nowrap` en la marca y la insignia y `text-overflow` en el paso; el `h1` de las vistas ≤ 3 rem; el paso ≥ 0.875 rem con `--tinta`; el progreso ≥ 8 px en escritorio; `scroll-margin-top` en el contenido; las tarjetas y los vacíos sin `box-shadow` y solo con variables de D1.

  Verificar: fallan por lo ausente; `evidencias/06-rojo.txt`.
- [x] 6.2 Implementar D6 (M1–M4 y G1–G5) en `src/styles.css` y en el marcado de presentación de `Layout.tsx`, `BarraDemo.tsx`, `Portada.tsx`, `Admin.tsx` y de las vistas o componentes con estados vacíos. No cambiar textos, controles, consultas ni comportamiento. Verificar: las pruebas de 6.1 y todas las existentes de la web pasan.
- [x] 6.3 Recorrer en el navegador las 8 rutas a 1280 × 800 y a 375 × 812 px, en modo simulado (pasos 1 y 2 de cada guion) y en modo real. Medir:
  - el alto de la barra con guion a 375 × 812 (≤ 162 px);
  - que la marca y la insignia ocupen una línea;
  - que el título de `/admin` quede bajo la barra al navegar;
  - que los canales indiquen el desplazamiento;
  - que no haya desplazamiento horizontal de la página y que el compositor de `/wa` no quede tapado.

  Capturas antes y después en `evidencias/06-presentacion.md`.

## 7. Acento verde de identidad (ajuste 5, D7)

- [x] 7.1 Escribir en rojo el escenario «Acento verde de identidad»:
  - en las pruebas de la web: la clase de éxito en «Llegada registrada» y en «La cita se canceló.», con el mismo texto y `role`; la clase de logro solo en las tres tarjetas de huecos de `/admin`;
  - en la prueba de estilos: las variables `--sd-exito` y `--sd-fondo-exito`, el contraste del éxito ≥ 4.5:1, la línea superior de 3 px `--sd-marca` y ningún verde en el fondo o el texto de botones, enlaces o controles.

  Verificar: fallan por lo ausente; `evidencias/07-rojo.txt`.
- [x] 7.2 Implementar D7 en `src/styles.css`, `Layout.tsx` (si la línea va en el contenedor), `LlegadaClinica.tsx`, `App.tsx` y `Admin.tsx`, solo con clases y estilos. Verificar: las pruebas de 7.1 y todas las existentes de la web pasan.
- [x] 7.3 Revisar en el navegador las 8 rutas a 1280 × 800 y a 375 × 812 px, en modo simulado y real. En el Flujo A, registrar la llegada en `/clinica`; en el Flujo C, cancelar en `/app` y revisar `/admin`. Verificar que la línea superior aparece en todas las rutas, que el éxito y los logros se ven en verde y lo demás no cambia, y que la interfaz de los ajustes 1–4 sigue igual (sin desplazamiento horizontal, barra ≤ 162 px en celular y botones en azul). Capturas antes y después en `evidencias/07-verde.md`.

## 4. Verificación

- [ ] 4.1 (Se repite después del grupo 7; ya se había completado en la revisión 1 y en los ajustes 3 y 4.) Control final sobre la rama rebasada en el `main` vigente: `corepack pnpm lint`, `corepack pnpm lint:deps` y `corepack pnpm test`, todos con código 0. `pnpm test:integracion` no aplica, porque solo cambia `apps/web`. Verificar: `evidencias/04-{lint,deps,test}.txt` y el manifiesto `evidencias/04-archivos-entregados.json`, sin cambios fuera de `apps/web`, `pnpm-lock.yaml` y la carpeta del cambio.
