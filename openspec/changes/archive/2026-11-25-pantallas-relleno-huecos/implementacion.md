# Implementación: pantallas-relleno-huecos

- Resumen: `/app` solicita cancelar con confirmación por cita y trata `STEP_UP_REQUERIDO` como aprobación pendiente; `/wa` recibe mensajes desde el proveedor para Ana, Beto, Carla y los números conversados, conserva el historial redactado, renueva los payloads reenviados sin duplicar ofertas y avisa de mensajes en otro número; `/admin` muestra huecos y ofertas en el orden recibido y los cuatro KPI. La barra permite ensayar el Flujo C y volver al A.
- Revisión entregada: cambios locales sin commit en `feat/pantallas-relleno-huecos`, sobre HEAD `026181cee0a8b85b5a017e25c8405fc832e898d0`. `git pull` se ejecutó primero y respondió `Already up to date.`; `git fetch origin main` confirmó `d37b8c2dc434ad226cb895f9671fea20d58c8239`, que ya es ancestro de HEAD. No fue necesario rebase. Ver `evidencias/05-base.txt`.
- Autorización: inicialmente revisión 2 conforme a la petición de esta sesión. Durante la ejecución aparecieron los artefactos de revisión 3 y la autorización explícita de LuisMaster119 («Autorizo por B») en `handoff.md`. Se conservaron esos archivos de planificación y se ajustaron los grupos 1 y 2 a la revisión 3. La instrucción de esta sesión de no crear commits ni hacer push se respetó.
- Archivos modificados de producto y pruebas, todos bajo `apps/web/src`: `cliente/{ClienteApi.ts,ProveedorCliente.tsx,cliente.test.ts,demo.ts,historialWa.ts,historialWa.test.tsx}`, `cliente/mock/{ClienteMock.ts,guionFlujoA.ts,guionFlujoC.ts}`, `componentes/BarraDemo.tsx`, `styles.css`, `vistas/{Admin.tsx,App.tsx,Wa.tsx,cancelarCita.test.tsx,panelHuecos.test.tsx,clinicaAlertas.test.tsx,consolas.test.tsx,relojDemo.test.tsx,vistas.test.tsx,wa.test.tsx}`. También se actualizaron las casillas de `tasks.md` y se agregó este informe con las evidencias. El inventario exacto, incluidos los artefactos de revisión 3 recibidos durante la ejecución, está en `evidencias/05-archivos-entregados.json` con SHA-256.
- Tareas: 1.1–5.1 completas (11/12); 5.2 BLOQUEADA. Estado vigente en `tasks.md`. Sin sincronización de especificaciones principales, archivado, commits ni publicación remota.

## Decisiones menores y alcance

- Los textos, botones, fechas y estados prefabricados del Flujo C viven en `cliente/mock/guionFlujoC.ts`, con los textos de D6 del núcleo reflejados en la revisión 3. Las referencias `demo.ref.*` son opacas y ficticias. Los mensajes de oferta no nombran a quien canceló.
- La revisión del guion remonta el contenido del proveedor al reiniciar o cambiar de guion, para descartar también confirmaciones y mutaciones temporales de las vistas. Una prueba adicional demostró primero el fallo al reiniciar desde `/app` y luego su corrección. No reinicia el cliente ni la escucha de WhatsApp.
- Las pruebas existentes de administración recibieron la respuesta de prueba de `panelHuecos`, conservando sus verificaciones de alertas, KPI desconocidos y reloj. No se eliminaron ni desactivaron pruebas.
- No se modificaron contratos, archivos del frente A, dependencias ni configuración compartida. `.claude/launch.json` ya estaba sin seguimiento al inicio: se dejó intacto y se excluye de la entrega.

## Validaciones reales

Todos los comandos se ejecutaron desde la raíz con `corepack pnpm`. Los logs conservan el código de salida de la herramienta, aunque el comando de captura también imprima su resumen.

| Validación / tarea | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 1.1–1.3, SW | `corepack pnpm exec vitest run --project web apps/web/src/cliente/historialWa.test.tsx apps/web/src/vistas/wa.test.tsx` | Rojo esperado antes de implementar; revisión 3: 27 pruebas PASS | `evidencias/01-rojo.txt`, `01-verde.txt`, `01-r3-rojo.txt`, `01-r3-verde.txt` |
| 2.1–2.2, NC | `corepack pnpm exec vitest run --project web apps/web/src/vistas/cancelarCita.test.tsx apps/web/src/vistas/vistas.test.tsx` | Rojo esperado antes de implementar; revisión 3: 20 pruebas PASS en esa revisión del grupo | `evidencias/02-rojo.txt`, `02-verde.txt`, `02-r3-rojo.txt`, `02-r3-verde.txt` |
| 3.1–3.2, CI | `corepack pnpm exec vitest run --project web apps/web/src/vistas/panelHuecos.test.tsx apps/web/src/vistas/consolas.test.tsx apps/web/src/vistas/clinicaAlertas.test.tsx apps/web/src/vistas/relojDemo.test.tsx` | Rojo esperado; 38 pruebas PASS | `evidencias/03-rojo.txt`, `03-verde.txt` |
| 4.1–4.2, CA | `corepack pnpm exec vitest run --project web apps/web/src/cliente/cliente.test.ts apps/web/src/vistas/vistas.test.tsx apps/web/src/cliente/guionWa.test.ts apps/web/src/cliente/tiempoReal.test.ts apps/web/src/cliente/historialWa.test.tsx` | Rojo por ausencia de guion/selector; 67 pruebas PASS, incluidos reinicio y Flujo A | `evidencias/04-rojo.txt`, `04-reinicio-rojo.txt`, `04-verde.txt` |
| 4.3 | Recorrido en navegador integrado, `VITE_API=mock` | PASS: cancelar → aprobar → oferta → aceptar → Carla → panel → volver a A | `evidencias/04-recorrido.md`, `04-oferta-beto.jpg`, `04-panel-final.jpg`, `04-panel-movil.jpg` |
| 5.1, lint | `corepack pnpm lint` | PASS, código 0; ESLint y TypeScript completos | `evidencias/05-lint.txt` |
| 5.1, dependencias | `corepack pnpm lint:deps` | PASS, código 0; 237 módulos, 750 dependencias, sin violaciones | `evidencias/05-deps.txt` |
| 5.1, pruebas | `corepack pnpm test` | PASS, código 0; 71 archivos, 433 pruebas, ninguna omitida | `evidencias/05-test.txt` |
| Artefactos / diff | `openspec validate pantallas-relleno-huecos --type change --strict --no-interactive`; `git diff --check`; inventario de rutas | PASS; solo las dos raíces autorizadas en la entrega | `evidencias/05-openspec.txt`, `05-archivos-entregados.json` |
| Integración Postgres/Redis | `corepack pnpm test:integracion` | NO APLICA: cambio exclusivo de web; no se ejecutó | Alcance de este informe y tarea 5.1 |
| 5.2 | Flujo C con `VITE_API=real` y API `DEMO_MODE=true` | BLOQUEADO por el núcleo del frente A, no integrado en `origin/main` | `handoff.md`, `tasks.md` |

Los dos primeros intentos del lint detectaron un alias de `this` y el uso de `findLastIndex` fuera de la biblioteca ES2022. Ambos se corrigieron dentro de `apps/web/src`; se conservan en `05-lint-intento1.txt` y `05-lint-intento2.txt`. Los controles finales se ejecutaron uno tras otro, en orden lint → deps → test, sobre el código entregado. El detector visual mecánico no reportó hallazgos (`05-diseno.json`).

## Limitaciones y transferencia

- La evidencia mock no demuestra entrega real en menos de 5 segundos, persistencia del núcleo ni seguridad de sus tokens. 5.2 queda para la prueba conjunta con A y debe figurar como pendiente en la revisión independiente de Claude.
- Se verificó visualmente la ventana móvil disponible de 572 píxeles CSS, sin desbordamiento horizontal. El compositor fijo de WhatsApp puede tapar un botón hasta desplazar la página; el recorrido documenta el desplazamiento necesario. No se afirma una comprobación manual a 375 píxeles ni una prueba con un teléfono físico.
- Los mensajes emitidos con la pestaña cerrada no se recuperan por la web. En la demo debe permanecer abierta una pestaña con la aplicación; la escucha vive en el proveedor aunque se vea `/app` o cualquier otra ruta.
- Las fechas y KPI del guion son fixtures, no cálculos de negocio. El guion cubre la ruta de aprobación y aceptación; las alternativas de sus botones reciben ayuda del guion lineal, igual que las opciones fuera del Flujo A.
- Próximo responsable: Claude, para revisar de forma independiente el diff y las evidencias y escribir `revision.md`. No se emitió dictamen de revisión ni autorización de cierre en nombre de Claude o del usuario.
