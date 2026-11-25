# Tasks

Requisitos: CI = `consolas-internas`, CA = `cliente-api-canales`. Decisiones: D1–D5 de `design.md`. Cada grupo escribe primero sus pruebas y conserva el fallo previo en `evidencias/0N-rojo.txt`. Requisito previo: `contratos-clinica-alertas` integrado en `main` y la rama rebasada sobre él.

Las tareas 1.1–3.2 se completaron en la revisión 1; su evidencia sigue en `evidencias/`. El grupo 4 aplica la revisión 2.

## 1. Clínica

- [x] 1.1 Escribir en rojo, con `ClienteReal` y `fetch` falso, las pruebas de CI:
  - «Fila de atención en clínica»: dos turnos y fila en vivo con `sede:fila`;
  - «Comprobación de identidad en recepción»: confirmar, cancelar y operación no disponible con reintento;
  - «Cierre de atención en clínica»: avanzar la fila y doble clic.

  Verificar: fallan por lo ausente; `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar D1–D3 en `Clinica.tsx` y los componentes necesarios. Verificar: las pruebas de 1.1 pasan; ningún envío lleva datos de la INE; el diálogo atrapa el foco y se cierra con Escape sin enviar.
- [x] 1.3 Punto de control: `pnpm lint`, `pnpm lint:deps` y `pnpm test` con código 0; `evidencias/01-{lint,deps,test}.txt`.

## 2. Tablero y guion

- [x] 2.1 Escribir en rojo las pruebas de CI «Alertas de seguridad en el tablero» (alerta con bloqueo, sin alertas, consulta no disponible sin ocultar el resto, refresco con eventos de `admin`) y de CA «Guion simulado del Flujo A» («Turno en la clínica», «INE y cierre en la clínica»). Verificar: fallan; `evidencias/02-rojo.txt`.
- [x] 2.2 Implementar D4 en `Admin.tsx` y D5 en `cliente/mock/guionFlujoA.ts`. Actualizar el recorrido de `vistas.test.tsx` y `guionWa.test.ts` hasta los 15 pasos. Verificar: pruebas en verde; cada respuesta y evento del guion cumple su esquema.
- [x] 2.3 Actualizar `apps/web/README.md`: fila, «INE verificada», «Cerrar atención», alertas, pasos nuevos del guion, y que en real dependen del núcleo del frente A. Verificar: revisión del texto frente a D1–D5.
- [x] 2.4 Punto de control: `pnpm lint`, `pnpm lint:deps` y `pnpm test` con código 0; `evidencias/02-{lint,deps,test}.txt`.

## 3. Verificación de la revisión 1

- [x] 3.1 Recorrido en navegador del Flujo A simulado completo, a 375 px y 1280 px, hasta «Atención cerrada», con `/admin` mostrando «Sin alertas de seguridad». Verificar: capturas `evidencias/03-*.jpg` y JSON del recorrido, sin desplazamiento horizontal.
- [x] 3.2 Control final sobre la rama rebasada en `main` vigente: `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:integracion` y `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` con código 0. Verificar: `evidencias/03-*.txt` y el manifiesto `evidencias/03-archivos-entregados.json`, sin cambios fuera de `apps/web/**` y la carpeta del cambio.
La antigua 3.3 (recorrido real de clínica y alertas, bloqueado entonces por el núcleo del frente A) se sustituye por 4.4 en la revisión 2. El núcleo ya está en `main` `71f01f5`.

## 4. Revisión 2: sin «INE verificada» y recorrido real

- [x] 4.1 Escribir en rojo las pruebas de CI «Cierre de atención en clínica» (escenarios «Error al cerrar» y «Sin INE verificada») y de CA «Guion simulado del Flujo A» («Cierre en la clínica», con 14 pasos y sin `ComprobarIdentidad`). Verificar: fallan con la implementación de la revisión 1; `evidencias/04-rojo.txt`.
- [x] 4.2 Retirar «INE verificada» según D2, D3 y D5:
  - quitar el botón, el estado «Identidad comprobada» y `componentes/ConfirmarIne.tsx`;
  - quitar el paso `INE_VERIFICADA` del guion y sus pruebas;
  - actualizar los recorridos de `vistas.test.tsx` y `guionWa.test.ts` a 14 pasos y el `README.md`.

  Verificar: las pruebas de 4.1 pasan, y `grep` de `ComprobarIdentidad`, `INE_CLINICA` e «INE verificada» en `apps/web/src` no encuentra nada.
- [x] 4.3 Punto de control sobre `main` `71f01f5` o posterior: `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:integracion` y `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` con código 0; `evidencias/04-{lint,deps,test,integracion,build}.txt`.
- [x] 4.4 Recorrido real a 375 px y 1280 px, con la API de `main` (`DEMO_MODE=true`, Postgres y Redis locales) y la web con `VITE_API=real` y `VITE_DEMO=true`:
  - dos llegadas registradas en Tepic muestran «Turno 1» y «Turno 2»;
  - «Cerrar atención» del primero lo saca de la lista y el otro pasa a «Turno 1» sin recargar;
  - tras tres fechas de nacimiento equivocadas en WhatsApp, `/admin` muestra las alertas con «Bloqueado» en la tercera, sin recargar.

  Verificar: capturas `evidencias/04-*.jpg`, JSON del recorrido con cómo se obtuvieron las dos citas, y manifiesto `evidencias/04-archivos-entregados.json`.
