# Correcciones H-02, H-03 y H-04

Fecha: 2026-11-24. Base: `99833d7067079d0ce9d5230256ce09c55bd3bac9`, rama `feat/esqueleto-canales`, diff sin commit. La revisión de archivos de esta corrección se identifica en `revision-sha256.txt`.

## Validación automatizada

- Se escribió primero la prueba del precio del paquete y se ejecutó con `pnpm exec vitest run --project web apps/web/src/cliente/cliente.test.ts -t 'mantiene el precio del paquete'`: FAIL esperado, `expected 55000 to be 25000`. Las demás pruebas quedaron fuera de esa ejecución filtrada; no se añadieron `skip` al código.
- Después del cambio se ejecutó `pnpm lint && pnpm lint:deps && pnpm test && pnpm --filter @noki/web build`: PASS, código final 0.
- Fronteras: 99 módulos y 202 dependencias, sin violaciones.
- Pruebas: 9 archivos, 60/60 (19 unitarias existentes y 41 web), sin pruebas omitidas en la ejecución completa. El nuevo caso comprueba catálogo, cotización y fichas; la prueba de presentación espera $250.00.
- Build: Vite 7.2.2, 239 módulos; CSS 10.70 kB (gzip 3.16), JS 428.01 kB (gzip 133.84). Se mantienen los avisos conocidos de directivas `use client` ignoradas por Rollup en React Router/TanStack.
- `impeccable.cmd detect --json apps/web/src/styles.css`: `[]`. `git diff --check`: sin errores.

## H-02 — preparación del ensayo

Se siguió el arranque limpio documentado, usando un puerto alternativo para conservar el servidor ajeno de 5173:

```powershell
$env:VITE_API='mock'
pnpm --filter @noki/web dev --force --host 127.0.0.1 --port 5175
```

Salida observada: `Forced re-optimization of dependencies`, seguida de `VITE v7.2.2 ready` y `http://127.0.0.1:5175/`. Se abrió una pestaña nueva y la consola permaneció sin errores durante los dos recorridos; no apareció Invalid hook call. El README indica además detener con Ctrl+C antes de cada ensayo y recargar la pestaña después de reiniciar.

## H-03 — precio

Se observó $250.00 en la ficha de Call Center y en la cotización de Web. El mini guion de Web toma el precio de `CATALOGO_DEMO`, y las fichas del Flujo A ya comparten ese catálogo. La referencia de la semilla se leyó en `apps/api/src/semilla/datosDemo.ts` y no se modificó. `mediciones.json` conserva el precio visible de Web.

## H-04 — navegador

Comprobación con CUA en el navegador integrado, usando ventanas emuladas de 375 × 812 y 1280 × 900. Se repitió el Flujo A completo en ambas: llamada → cotización → WhatsApp → horario → aviso Flow → confirmar → App → registrar llegada en Clínica. También se abrieron Admin, Bandeja y Web.

- Las siete rutas se midieron en ambos tamaños: 14 mediciones, `scrollWidth === clientWidth` en todas. El desplazamiento horizontal queda limitado al listado de canales en móvil, intencional y autorizado.
- La barra móvil mide aproximadamente 123.2 px en esta comprobación, con una sola fila de canales y paso/reinicio debajo. Todos los enlaces conservan 44 px de alto y al menos 49.5 px de ancho; el botón Reiniciar mide 44 px de alto. La lista conserva los siete enlaces en el DOM y los muestra al desplazarse.
- Se recorrieron con Tab los siete enlaces y Reiniciar guion: foco visible en los ocho controles. Al avanzar al extremo del listado, el navegador desplazó la fila de 0 a 164 px, permitiendo acceder a Admin y Bandeja.
- Al abrir `/app` en móvil, sin desplazar la página (`scrollY = 0`), el QR completo de 224 × 224 ocupa desde `y = 352.2` hasta `576.2`, y la barra empieza en `688.8`: no se superponen. Véase `movil-qr.jpg`.
- En escritorio el QR conserva la composición lateral: `y = 516.25` hasta `740.25`, también con `scrollY = 0` y completo dentro de 900 px. Véase `escritorio-qr.jpg`.
- El paso actual permaneció visible al cambiar de canal y terminó en Paso 9 de 9 al registrar la llegada. No hubo errores de consola; el tamaño del navegador se restableció al terminar.

`mediciones.json` conserva las geometrías, los focos y los resultados de consola. Ambas capturas son de datos ficticios y fueron inspeccionadas visualmente. Esta evidencia verifica la disposición en el navegador integrado y la interacción con teclado; no se presenta como prueba de gesto táctil en un teléfono físico.

## Alcance conservado

`archivos-protegidos.json` registra los hashes previos de configuración compartida, lockfile, reglas, planificación, handoff y `revision.md`. Se comprobaron sin cambios después de la corrección. Los únicos cambios de producto son los cinco archivos web enumerados en `implementacion.md`, además de estas evidencias y el informe solicitado. No se crearon commits ni se cambió el dictamen de Claude.
