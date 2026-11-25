# Tasks

Requisitos: SW = `simulador-whatsapp` («Mensajes que inicia la empresa»), CI = `consolas-internas` («Panel de huecos en el tablero»), NC = `navegacion-canales` («Cancelar una cita desde la app»), CA = `cliente-api-canales` («Guion simulado del Flujo C»). Decisiones D1–D6 de `design.md`. Todos los archivos están en `apps/web/src`. Pruebas con `corepack pnpm exec vitest run --project web <archivos>`; evidencia en `openspec/changes/pantallas-relleno-huecos/evidencias/`.

## 1. Mensajes que inicia la empresa (SW; D1–D3)

- [ ] 1.1 Escribir en rojo, en `cliente/historialWa.test.tsx` y en `vistas/wa.test.tsx`, los cinco escenarios de SW: mensaje en el número activo con botones habilitados que envían `payloadBoton`; mensaje recibido estando en `/app`; aviso y cambio a otro número de demo; número `5210000000009` ignorado sin aviso; botones del mensaje anterior deshabilitados. Incluir que el mensaje recibido pasa por la misma redacción y queda solo en `sessionStorage`. Verificar: fallan por lo ausente; `evidencias/01-rojo.txt`.
- [ ] 1.2 Implementar D1 en `cliente/historialWa.ts` (agregar mensajes del bot a un número, números de la sesión con los tres de demo, marca de mensajes nuevos) y las constantes de Beto y Carla junto a `CONTACTO_DEMO` en `cliente/ClienteApi.ts`. Verificar: las pruebas de `HistorialWa` de 1.1 pasan y las existentes del historial siguen en verde.
- [ ] 1.3 Implementar D2 en `cliente/ProveedorCliente.tsx` (unirse a `wa:<waId>` de los números de la sesión y entregar `wa:mensajes` al historial filtrando por `waId`) y D3 en `vistas/Wa.tsx` (aviso por número con mensajes nuevos que cambia el número). Verificar: todas las pruebas de 1.1 pasan; en modo real, una prueba con el cliente real simulado comprueba que se emite `sala:unirse` para los tres números de demo.

## 2. Cancelar desde la app (NC; D4)

- [ ] 2.1 Escribir en rojo, en `vistas/vistas.test.tsx` o un archivo nuevo `vistas/cancelarCita.test.tsx`, los cuatro escenarios de NC: pendiente de aprobación con un solo `CancelarCita` (canal `app`, actor `paciente`, trámite de la cita) y enlace a `/wa`; desistir sin comando; cita `ATENDIDA` sin botón; error de red y reintento con la misma clave. Incluir respuesta `CANCELADA` con su mensaje y doble pulsación con un solo envío. Verificar: fallan por lo ausente; `evidencias/02-rojo.txt`.
- [ ] 2.2 Implementar D4 en `vistas/App.tsx` con `useAccion`. Verificar: las pruebas de 2.1 pasan y las existentes de `/app` (QR con token, sin folio) siguen en verde.

## 3. Panel de huecos (CI; D6)

- [ ] 3.1 Escribir en rojo, en `vistas/consolas.test.tsx` o un archivo nuevo `vistas/panelHuecos.test.tsx`, los cinco escenarios de CI: hueco `OFRECIDO` con oferta y fecha en la zona de la sede; lista vacía; error con reintento sin ocultar el resto; refresco al llegar un evento de `admin`; KPI `horasRecursoRecuperadas` con nombre legible. Incluir que no aparece el canal ni datos de pacientes y que se respeta el orden recibido. Verificar: fallan por lo ausente; `evidencias/03-rojo.txt`.
- [ ] 3.2 Implementar D6 en `vistas/Admin.tsx` (sección del panel y las cuatro etiquetas de KPI). Verificar: las pruebas de 3.1 pasan y las existentes del tablero (KPI desconocido, alertas, reloj de demo) siguen en verde.

## 4. Guion simulado del Flujo C (CA; D5)

- [ ] 4.1 Escribir en rojo, en `cliente/cliente.test.ts` y `vistas/vistas.test.tsx`, los cuatro escenarios de CA: elegir el Flujo C desde la barra; oferta a `5210000000002` y hueco `OFRECIDO` tras cancelar y aprobar; efecto dominó con hueco `ASIGNADO`, horario anterior de Beto primero y KPI cambiados; volver al Flujo A en su primer paso con el historial de WhatsApp de los números de demo limpio. Incluir que todas las lecturas y eventos del guion validan con los contratos, que el mensaje de oferta no menciona a Ana y que los `payload` son referencias opacas. Verificar: fallan por lo ausente; `evidencias/04-rojo.txt`.
- [ ] 4.2 Implementar D5: `cliente/mock/guionFlujoC.ts` nuevo, selección de guion en `cliente/mock/ClienteMock.ts` y `cliente/demo.ts`, selector en `componentes/BarraDemo.tsx`, y en `cliente/ProveedorCliente.tsx` limpiar el historial de los números de demo al reiniciar o cambiar de guion. El Flujo A conserva su comportamiento. Verificar: las pruebas de 4.1 pasan y las del guion del Flujo A siguen en verde.
- [ ] 4.3 Recorrer el Flujo C en el navegador con `VITE_API=mock`: elegir el guion, cancelar en `/app`, aprobar en `/wa` con el número de Ana, cambiar a Beto desde el aviso, aceptar y revisar `/admin`. Verificar: capturas o notas en `evidencias/04-recorrido.md`.

## 5. Verificación

- [ ] 5.1 Control final sobre la rama rebasada en el `main` vigente: `corepack pnpm lint`, `corepack pnpm lint:deps` y `corepack pnpm test`, con código 0. `pnpm test:integracion` no aplica (el cambio solo toca `apps/web`); se registra como no aplicable. Verificar: `evidencias/05-{lint,deps,test}.txt` y el manifiesto `evidencias/05-archivos-entregados.json`, sin cambios fuera de `apps/web/src` y la carpeta del cambio.
- [ ] 5.2 Bloqueado hasta que el frente A integre el núcleo del relleno de huecos: recorrido del Flujo C con `VITE_API=real` según el criterio de `PLAN.md` §10.1 (oferta en `/wa` en menos de 5 s, panel y KPI en vivo). Se hace en la prueba conjunta; si el núcleo no está integrado al cerrar este cambio, queda como pendiente registrado en `revision.md`.
