# Recorrido del Flujo C en navegador

- Revisión: artefactos de revisión 3 autorizados en `handoff.md`; cambios locales sin commit sobre `026181c`.
- Fecha local: 2026-11-25 (America/Mexico_City).
- Servidor: `$env:VITE_API = 'mock'; corepack pnpm --filter @noki/web dev --host 127.0.0.1 --port 5174`.
- Navegador: navegador integrado de Codex, `http://127.0.0.1:5174/app`.
- Resultado: PASS del recorrido 4.3. Todos los datos son ficticios.

1. Elegí «Flujo C» en «Guion de demo»: paso 1 de 4, cita de Ultrasonido abdominal en Tepic `CONFIRMADA`, QR y «Cancelar cita».
2. Pulsé «Cancelar cita» y «Confirmar cancelación»: apareció la aprobación pendiente y «Abrir WhatsApp» sin error visible.
3. Abrí WhatsApp: la solicitud estaba en el historial de Ana, aunque se recibió mientras se mostraba `/app`. Aprobé con «Sí, cancelar».
4. Usé «Ver mensajes de 5210000000002»: apareció la oferta de Ultrasonido abdominal en Tepic el 26 de noviembre, 09:15, con «Sí, adelantar» / «No, gracias», sin el nombre de Ana. Captura: `04-oferta-beto.jpg`.
5. Acepté «Sí, adelantar». Usé «Ver mensajes de 5210000000003»: Carla tenía la oferta del 3 de diciembre, 09:15.
6. Abrí `/admin`: hueco del 3 de diciembre `Ofrecido` primero; hueco del 26 de noviembre `Asignado` después, con oferta `Aceptada`. KPI recibidos: 2 huecos liberados, 1 recuperado, 0.5 horas de recurso recuperadas y 7 días adelantados en promedio. Capturas: `04-panel-final.jpg` (página completa) y `04-panel-movil.jpg`.
7. Elegí «Flujo A» y abrí WhatsApp: paso 1 de 14 «Esperando llamada», conversación vacía y sin avisos del guion C.

Comprobación visual: en la ventana móvil disponible (572 píxeles CSS de ancho), no había desbordamiento horizontal. La barra, el selector, las ofertas y los datos del panel resultaron legibles. El compositor fijo de WhatsApp requiere desplazar la página para alcanzar un botón que queda debajo de él; al desplazar, el botón funciona. El primer clic automatizado después de una captura de página completa enfocó el compositor; se comprobó que no había avance ni envío y se completó con el botón visible, sin duplicados.

Las pruebas de `vistas/vistas.test.tsx` cubren además el panel `OFRECIDO` antes de aceptar y el borrado de `sessionStorage` de los tres números. `5.2` no se ejecutó: sigue bloqueada hasta integrar el núcleo del frente A. Esta evidencia de modo mock no demuestra el tiempo de entrega real menor a 5 segundos.
