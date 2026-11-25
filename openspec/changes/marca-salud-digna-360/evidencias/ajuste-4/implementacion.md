# Implementación: marca-salud-digna-360 — ajuste 4 (D6)

- Resumen: presentación más compacta y legible dentro de la identidad existente. En móvil, marca e insignia ocupan una línea y la barra con guion mide **155,5 px** a 375 × 812 (límite: 162 px). El paso se muestra en una línea con su texto accesible completo. Los canales indican hacia dónde queda contenido. En escritorio, los títulos de vista se moderan y quedan visibles bajo la barra; el paso usa 15 px y el progreso 8 px. Solo las dos series de Admin se muestran como tarjetas y los estados vacíos aprobados comparten una superficie.
- Autorización aplicada: frente B, ajuste 4 preparado por Claude y registrado en `handoff.md`; reiterado por el responsable en esta sesión el 2026-11-25: «Implementa solo el ajuste 4 autorizado […] el grupo 6 […] y después repite 4.1». Se implementan exclusivamente M1–M4 y G1–G5. G6/G7 y cualquier cambio funcional quedan fuera. No se modificaron propuesta, diseño ni delta.
- Hashes de planificación comprobados antes de implementar: propuesta `296f31d275fc`, diseño `22e20a797204`, tareas `697974348dc1`, delta `a95704785abc`. Solo las casillas de tareas cambian después para registrar evidencia.
- Revisión entregada: rama `feat/marca-salud-digna-360`, HEAD y `origin/main` `51e4df6222fdcec0c099d1a0e053f3f80ca7e9fa`, más el diff sin commit identificado en `evidencias/04-archivos-entregados.json`. El cierre del manifiesto detectó que `origin/main` había avanzado respecto a la base local `0b59599`; se aplicó `git rebase --autostash origin/main`. El único conflicto, en `Clinica.tsx`, se resolvió conservando la guarda y `sedeContextoId` del main nuevo junto con la clase `estado-vacio` de D6. La rama no tiene commits propios. Los controles previos están en `evidencias/pre-rebase/`; rojo, web, capturas antes/después y controles finales se repitieron en la base vigente. La referencia local `main` no se modificó: se usa `origin/main` como base actualizada.
- Archivos de producto modificados en este ajuste: `src/styles.css`, `src/componentes/BarraDemo.tsx`, `EstadoContexto.tsx`, `LineaTiempo.tsx`, `src/vistas/Portada.tsx`, `Admin.tsx`, `App.tsx`, `Clinica.tsx` y `Bandeja.tsx`, todos bajo `apps/web`. Nuevas pruebas: `apps/web/src/presentacion.test.tsx` y `presentacionEstilos.test.ts`.
- Archivos de seguimiento: `tasks.md`, `handoff.md` (referencia real de ejecución), este informe y los archivos `evidencias/06-*`, `evidencias/presentacion.mjs`, controles `04-*` y manifiesto. Las capturas y archivos sin seguimiento también se enumeran con SHA-256. El manifiesto excluye su propio hash para evitar circularidad.
- Trabajo previo conservado: los cambios de revisiones anteriores se mantienen; el informe y los controles del ajuste 3 quedaron en `evidencias/ajuste-3/`. No se cambiaron dependencias, lockfile, metadatos, fuentes, clientes ni pruebas existentes. `Layout.tsx` no necesitó cambios en este ajuste: su marca y el foco existentes se resuelven mediante CSS.
- Tareas: 6.1–6.3 y la repetición de 4.1 completas sobre la base vigente; OpenSpec 12/12. Estado vigente en `tasks.md`.
- Contratos: no cambian eventos, puertos, esquemas ni API. Sin modificaciones al frente A ni documentación compartida.

## Decisiones menores de presentación

- M1/M2: marca de 24 px en móvil y `nowrap` en marca e insignia, con un ajuste de separación del encabezado para que ambas quepan a 375 px. No se cambia ningún texto.
- M3: grid de tres columnas para etiqueta, selector y reinicio; el avance ocupa la segunda fila completa. El texto «Guion de demo» sigue visible sobre el selector (0,625 rem), que conserva sus 44 px de alto. El botón mantiene «Reiniciar guion», completo. El texto del paso y su `role="status"`, y la relación `aria-labelledby` del progreso, quedan intactos. No se cambia su orden en el DOM ni sus callbacks.
- M4: una envoltura de presentación para la fila de canales y dos pseudo-elementos vacíos con degradado `transparent → var(--sd-fondo-suave)`. Consultas CSS `scroll-state(scrollable: left/right)` muestran solo los extremos hacia los que queda contenido. Los degradados tienen `pointer-events: none`; no agregan nodos de texto accesible, eventos ni lógica JavaScript. La fila sigue desplazándose horizontalmente dentro de la barra. Se comprobó inicio, mitad, fin y ausencia de desbordamiento tras redimensionar a 767 px.
- G1/G3: `h1` de vistas con `clamp(2rem, 4vw, 3rem)`, excepción `.titulo-portada` con su escala original, `.contenido` con `clamp(2rem, 5vw, 3.5rem)` y margen de desplazamiento de contenido/títulos desde 768 px. El foco de `Layout` no cambia.
- G2: paso de escritorio a 0,9375 rem y tinta principal; progreso de 8 px. En móvil el progreso mide 4 px y la línea del estado usa elipsis sin recortar su contenido accesible.
- G4: `.datos-tarjetas` se añade solo a los dos `dl` de métricas de Admin; `.datos` conserva sus reglas y usos previos. `dd` queda arriba mediante `order: -1`; el DOM conserva `dt` antes de `dd`.
- G5: `.estado-vacio` se añade a los mismos elementos que ya contenían mensajes vacíos y contexto ausente, sin reemplazarlos ni cambiar sus enlaces o botones.
- La comparación en `06-solo-presentacion.json` confirma que, al retirar únicamente las clases literales y la envoltura decorativa de canales, los TSX previos y actuales son idénticos. El bloque `:root` es exactamente el anterior y no hay `box-shadow`. No se introducen colores, sombras, íconos ni fuentes.
- Sin desviaciones de alcance, arquitectura o comportamiento.

## Validación

| Validación / tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 6.1 · D6 · rojo | `corepack pnpm exec vitest run --project web src/presentacion.test.tsx src/presentacionEstilos.test.ts src/identidadVisual.test.ts` antes de implementar | PASS del control de rojo: código 1, 15 fallos por clases/estilos ausentes; las 6 pruebas de identidad pasaban | `evidencias/06-rojo.txt` |
| 6.2 · toda la web | `corepack pnpm exec vitest run --project web --maxWorkers 2` | PASS, código 0; 32 archivos y 243 pruebas sobre `51e4df6`. No se modifican las pruebas existentes ni sus límites | `evidencias/06-verde.txt` |
| 6.2 · identidad y regresión D6 | Incluidas en la ejecución completa de la web | PASS; 11 pruebas nuevas de marcado, 4 de estilos y las 6 de identidad visual, dentro de las 243 anteriores | `evidencias/06-verde.txt` |
| 6.2 · solo presentación | Comparación exacta de TSX sin clases/envoltura; comparación literal de `:root` | PASS; textos, controles, consultas, callbacks, enlaces y orden del DOM intactos sobre el main vigente; mismas variables y sin sombras | `evidencias/06-base-rebasada.json`, `06-solo-presentacion.json`; estado inicial conservado en `06-base.json` |
| 6.3 · antes/después | `node openspec/changes/marca-salud-digna-360/evidencias/presentacion.mjs`, fases `antes`/`despues` | PASS; 44 capturas previas y 52 posteriores, ocho rutas en ambos modos/tamaños; guiones A/C, pasos 1/2; barra máxima 155,5 px; sin desbordamiento de página ni solapamiento del compositor | `evidencias/06-presentacion.md`, `06-antes-resultados.json`, `06-despues-resultados.json`, salidas y PNG enlazados |
| 4.1 · lint y TypeScript | `corepack pnpm lint` | PASS, código 0 sobre `51e4df6` | `evidencias/04-lint.txt`, `04-resultados.json` |
| 4.1 · fronteras | `corepack pnpm lint:deps` | PASS, código 0; 263 módulos y 843 dependencias sin violaciones sobre `51e4df6` | `evidencias/04-deps.txt`, `04-resultados.json` |
| 4.1 · suite completa | `corepack pnpm test --maxWorkers 2` | PASS, código 0; 83 archivos y 516 pruebas sobre `51e4df6`, 141,63 s de Vitest | `evidencias/04-test.txt`, `04-resultados.json` |
| 4.1 · alcance y revisión | `git diff --check`, hashes del manifiesto y comparación con el estado previo | PASS; entrega acotada, cambios anteriores conservados | `evidencias/04-archivos-entregados.json` |
| Estructura OpenSpec | `openspec validate marca-salud-digna-360 --type change --strict --no-interactive` | PASS: cambio válido | Salida del CLI |
| Integración con Postgres | `pnpm test:integracion` | NO APLICA según 4.1: solo frontend | Sin cambios al núcleo o adaptadores |

Los comandos usan la caché instalada `COREPACK_HOME=C:/Users/Luis Rodriguez/AppData/Local/node/corepack`. La suite completa se ejecuta con acceso a sockets locales, necesario para las pruebas existentes de WebSocket, y dos workers. Esto solo limita la concurrencia del ejecutor; no reduce casos, proyectos ni cobertura y no amplía tiempos máximos.

## Incidencias, límites y transferencia

- Antes del rebase, la primera ejecución de toda la web, concurrente con las capturas, obtuvo 238/239 pruebas correctas y agotó los 5 segundos del caso existente del Flujo C. Se conserva el fallo real en `evidencias/06-verde-carga.txt`. La repetición pasó ese mismo caso en 1,983 s y las 239 pruebas. Después del rebase pasan las 243 pruebas de la web actual, sin cambiar pruebas existentes ni límites.
- El rebase se completó sin commits propios de la rama y el trabajo quedó sin staged. Se conserva el autostash `798c08c` como respaldo de recuperación, además del parche `06-wip-antes-rebase.patch` y las copias en `pre-rebase/`. Las modificaciones funcionales del nuevo main se heredan como base y no forman parte del diff de D6.
- El indicador se verificó también cuando ya caben todos los canales. Las consultas CSS finales evitan dejar visible un degradado al redimensionar; no hay código de detección de scroll en JavaScript.
- Se verificó el Chrome instalado, con ventanas de 375 × 812 y 1280 × 800, más una comprobación a 767 px. No se afirma una prueba con teclado virtual en un teléfono físico. La API real se recorrió mediante lecturas; los comandos de demo se ejercitaron solo con el cliente simulado.
- El detector mecánico solo señaló Open Sans como fuente frecuente; se conserva porque la identidad aprobada la exige. No se introdujo una familia distinta.
- `.claude/launch.json` estaba sin seguimiento al comenzar y no se modificó ni forma parte de esta entrega.
- No existía `revision.md` de este cambio. La revisión independiente, la autorización de cierre y la integración corresponden a Claude y al responsable del frente. Siguiente paso: `/opsx:verify marca-salud-digna-360` con dictamen persistido por Claude.
- No se crearon commits, no se publicaron cambios y no se sincronizaron ni archivaron especificaciones.
