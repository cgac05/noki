# Recorrido 5.2 del Flujo C en modo real

- Revisión: `feat/pantallas-relleno-huecos` en `a14a9fe`, rebasada sobre `origin/main` `0157047` (con el núcleo de `relleno-huecos`).
- Ejecutado por: Claude (revisor), 2026-11-25, en el navegador integrado.
- Infraestructura: Postgres y Redis en Docker; `pnpm demo:reset` con autorización del responsable del frente B; API (`DEMO_MODE=true`, puerto 4000), sd-mock (4001) y web con `VITE_API=real` (5173).
- Reloj: la hora de Tepic era 03:04, dentro del horario de silencio. Se adelantó el reloj de demo 300 min, hasta las 08:04.
- Pestañas: `/app`, `/wa` y `/admin` abiertas a la vez. Las latencias se midieron con `Date.now()` antes del clic y un `MutationObserver` en la pestaña que recibe el cambio.

| Paso | Resultado observado | Latencia |
|---|---|---|
| Cancelar en `/app` (Ana, paciente `…014`, cita del 3 dic 09:15) | 403 `STEP_UP_REQUERIDO`; la vista muestra «La cancelación espera aprobación en WhatsApp.» con «Abrir WhatsApp» y sin error; la cita sigue `CONFIRMADA` | — |
| Solicitud de aprobación en `/wa` de Ana | «¿Confirmas que quieres cancelar tu cita de Ultrasonido abdominal en Clínica Tepic del jueves 3 de diciembre, 09:15?» con «Sí, cancelar» y «No, conservarla» | 0,13 s |
| Aprobar con «Sí, cancelar» | «Tu cita quedó cancelada.»; aviso «Ver mensajes de 5210000000002» | 0,97 s |
| Panel en `/admin` sin recargar | Hueco del 3 dic, «Ofrecido», con oferta «Ofrecida» | 1,04 s |
| Oferta a Beto | «Se liberó un espacio para Ultrasonido abdominal en Clínica Tepic el jueves 3 de diciembre, 09:15. ¿Quieres adelantar tu cita?», sin datos de Ana | (mismo evento) |
| Beto acepta con «Sí, adelantar» | «Listo, tu cita quedó el jueves 3 de diciembre, 09:15.»; aviso «Ver mensajes de 5210000000003» | 0,77 s |
| Efecto dominó en `/admin` | Primero el hueco del 10 dic, «Ofrecido»; después el del 3 dic, «Asignado», con oferta «Aceptada». KPI: Huecos liberados 2, recuperados 1, horas de recurso 0.5, días adelantados 7 | 0,90 s |
| Oferta a Carla | Oferta del jueves 10 de diciembre, 09:15, con sus botones | (mismo evento) |
| Recargar `/wa` (la API reenvía las ofertas vigentes al unirse a la sala) | Una sola burbuja de la oferta de Carla en `sessionStorage`, con aviso del número | — |

Capturas: `06-real-oferta-carla.jpg` y `06-real-panel.jpg`.

Intento previo descartado: antes del reinicio, la base conservaba ensayos del Flujo A y `/api/demo/contexto` apuntaba al hilo de Beto. Cancelar en `/app` pidió la aprobación a `5210000000002`, lo cual es correcto para ese paciente. Esa solicitud no se aprobó, y la base se reinició.
