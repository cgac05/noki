# Revisión: pantallas-relleno-huecos

- Dictamen: PASS para las tareas 1.1–5.1 (revisión 3). La 5.2 está BLOQUEADA porque depende del núcleo del frente A; queda pendiente tal como prevé `tasks.md`.
- Revisión inspeccionada: cambios locales sin commit en `feat/pantallas-relleno-huecos` sobre `026181c` (`origin/main` = `d37b8c2`, que es su ancestro; no hace falta rebase), según `implementacion.md` y `evidencias/05-archivos-entregados.json`. Revisado por Claude el 2026-11-25.
- Cobertura:
  - Requisitos de los cuatro deltas: SW «Mensajes que inicia la empresa», NC «Cancelar una cita desde la app», CI «Panel de huecos en el tablero» y CA «Guion simulado del Flujo C».
  - Decisiones D1–D6 y tareas 1.1–5.2.
  - Diff de los 11 archivos de producto bajo `apps/web/src` y de las 9 pruebas, incluidas las nuevas `cancelarCita.test.tsx` y `panelHuecos.test.tsx`.
  - `guionFlujoC.ts` contrastado con D6 de `relleno-huecos` revisión 3 (`c7650ad`, `origin/claude/project-thread-nqfp68`).
  - Dependencias: `useAccion`, `main.tsx` (el router vive dentro de `ProveedorCliente`) y el uso de `HistorialWa` en `useConversacionWa`.

## Evidencia comprobada independientemente

- Artefactos: los SHA-256 de `proposal.md`, `design.md` y los cuatro specs coinciden con la revisión 3 registrada en `handoff.md`. En `tasks.md` solo cambian las casillas: al desmarcar 2.1–5.1, el hash vuelve a `474c333d31c4`. `openspec validate pantallas-relleno-huecos --type change --strict --no-interactive` responde que el cambio es válido.
- Manifiesto: los 54 hashes de `05-archivos-entregados.json` coinciden con los archivos actuales; el manifiesto se excluye a sí mismo. `git status` no muestra nada fuera de `apps/web/src` y de la carpeta del cambio, salvo `.claude/launch.json`, que ya existía y no forma parte de la entrega. `git diff --check` está limpio. No se tocaron `packages/contracts` ni archivos del frente A.
- Controles (`corepack`, en esta máquina):
  - `eslint .` da código 0.
  - `pnpm -r exec tsc --noEmit` y `tsc --project tests/tsconfig.json` dan código 0.
  - `pnpm lint:deps` da código 0, sin violaciones en 237 módulos.
  - `pnpm test` pasa con 71 archivos y 433 pruebas.
  - Nota: en mi shell, `corepack pnpm lint` falla porque su script llama a `pnpm` y ese comando no está en el PATH. Por eso ejecuté sus dos pasos por separado; no es un defecto del cambio.
- Textos del guion: la aprobación, la oferta, «Tu cita quedó cancelada.» y «Listo, tu cita quedó el …» coinciden con D6 de `relleno-huecos` revisión 3. Las ofertas no mencionan a Ana y los `payload` son `demo.ref.*`, opacos. El orden del panel (horario anterior de Beto primero) es coherente con su D10. `CancelarCita` se rechaza con `STEP_UP_REQUERIDO` validado contra `CuerpoErrorSchema`, y aun así se emiten los eventos del paso (`ClienteMock.avanzar` se ejecuta antes que `responderComando`).
- Escenarios de los deltas, todos con prueba dedicada:
  - SW: seis de seis, incluido `sala:unirse` para `wa:` de los tres números en modo real (`wa.test.tsx:192`) y el reenvío que reemplaza la burbuja.
  - NC: cinco de cinco, más la respuesta `CANCELADA` y la doble pulsación.
  - CI: cinco de cinco, más el orden recibido y la ausencia del canal y de datos de pacientes.
  - CA: cuatro de cuatro, más la validación de lecturas y eventos con el contrato.
- Diseño:
  - D1: la redacción y la proyección a `sessionStorage` son las mismas que en las respuestas.
  - D2: la escucha vive en `ProveedorCliente`, fuera de `/wa`.
  - D3: `mostrar`/`ocultar` y el aviso por número funcionan como se diseñó.
  - D4: hay una clave nueva por cada confirmación, la misma clave al reintentar y el 403 se presenta como «pendiente».
  - D5: hay un selector de guion y el reinicio detecta el paso 1 de cualquier guion.
  - D6: el panel tiene estados de carga, vacío y error independientes, y existen las cuatro etiquetas de KPI.
  - Ninguna vista decide textos, estados ni orden.
- Evidencia de Codex (no repetida): estados en rojo de 1.1, 2.1, 3.1 y 4.1, y el recorrido 4.3 en `04-recorrido.md`. Revisé la captura `04-panel-final.jpg`: coincide con el escenario «Efecto dominó». No repetí el recorrido manual en el navegador.

## Controles no ejecutados

- 5.2 (Flujo C con `VITE_API=real` y la API en `DEMO_MODE=true`, oferta en menos de 5 s, panel y KPI en vivo): BLOQUEADO hasta que el frente A integre el núcleo de `relleno-huecos` en `main`.
- `pnpm test:integracion`: NO APLICA, porque el cambio solo toca `apps/web`.
- Recorrido manual a 375 px y en un teléfono físico: no ejecutado, ni por Codex (lo probó a 572 px) ni por Claude.

## Hallazgos

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | SUGGESTION | CI / 3.2 | `vistas/Admin.tsx:56-57` | Las horas de envío y vencimiento de las ofertas usan la zona del navegador (9:00 en la captura), mientras que la fecha del hueco está en la zona de la sede (`America/Mazatlan`). El requisito no fija una zona, así que no es un incumplimiento, pero conviene mostrarlas en la zona de la sede o indicar la zona. Opcional. |
| H-02 | SUGGESTION | SW / 1.2 | `cliente/historialWa.ts:43` | Al recargar la pestaña, `#numeros` vuelve a los tres números de demo. Un número conversado antes conserva su historial en `sessionStorage`, pero no se vuelve a escuchar hasta que se le envíe otro mensaje. No afecta al Flujo C ni a los escenarios. Opcional. |
| H-03 | SUGGESTION | CA / 4.2 | `cliente/mock/guionFlujoC.ts:56` | En modo simulado, pedir otra aprobación desde `/app` durante el Flujo C devuelve la ayuda del guion lineal como error. Codex lo documenta como limitación. En la demo conviene no pulsar dos veces; la vista sí cumple NC (lo cubre `cancelarCita.test.tsx:40`). |

No hay hallazgos CRITICAL ni WARNING.

## Riesgos residuales

- La entrega real en menos de 5 s, el refresco en vivo del panel con eventos `admin` emitidos por el núcleo y la seguridad de los tokens dependen de A. Si el núcleo no emite eventos de `admin` al cambiar un hueco, el panel no se refrescará en modo real (riesgo ya anotado en `design.md`).
- Los mensajes emitidos con la pestaña cerrada se pierden; para la demo debe quedar abierta una pestaña de la app.
- En pantallas móviles, el compositor fijo de `/wa` puede tapar un botón hasta que se desplaza la página.

## Condiciones para recomendar el cierre

- Recomiendo cerrar las tareas 1.1–5.1 con la revisión inspeccionada; los hallazgos son opcionales. Antes hace falta que el responsable decida una de estas dos opciones:
  - cerrar ahora y dejar 5.2 como pendiente registrado en esta revisión, para la prueba conjunta con A;
  - o esperar a que A integre el núcleo, ejecutar 5.2 y actualizar esta revisión.
- Si A integra en `main` cambios de `packages/contracts` o `apps/web` antes del cierre, hay que hacer rebase y repetir lint, lint:deps y test.
- La autorización de cierre del frente B sigue PENDIENTE en `handoff.md`. Este PASS no es una autorización.

- Próximo responsable: el usuario (`LuisMaster119`, frente B), para decidir el cierre o la espera de 5.2 y, si quiere, pedir a Codex que atienda H-01 o H-02.
