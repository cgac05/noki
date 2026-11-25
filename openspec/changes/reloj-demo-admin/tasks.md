# Tasks

Requisitos: CA = `cliente-api-canales`, CI = `consolas-internas`. Decisiones: D1–D3 de `design.md`. Cada grupo escribe primero sus pruebas y conserva el fallo previo en `evidencias/0N-rojo.txt`.

## 1. Cliente

- [x] 1.1 Escribir en rojo las pruebas de CA «Reloj de demo en el cliente» con `ClienteReal` y `fetch` falso: adelantar en modo demo, minutos fuera de rango sin petición, sin modo demo (real sin `VITE_DEMO` y simulado), respuesta mal formada. Verificar: fallan por lo ausente; `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar D1 en `ClienteApi.ts` y `real/ClienteReal.ts`. Verificar: las pruebas de 1.1 pasan y `ClienteMock` no define `relojDemo`.

## 2. Tablero

- [x] 2.1 Escribir en rojo las pruebas de CI «Reloj de demo en el tablero»:
  - adelantar una hora con refresco de lecturas;
  - doble clic con un solo envío;
  - campo fuera de rango;
  - error con «Reintentar» que repite los mismos minutos, sin ocultar el tablero;
  - modo simulado sin sección;
  - un evento de la sala `admin` tras el adelanto que refresca el conteo sin recargar.

  Verificar: fallan; `evidencias/02-rojo.txt`.
- [x] 2.2 Implementar D2 y D3 en un componente nuevo usado por `Admin.tsx`. Verificar: las pruebas de 2.1 pasan, y el texto de aviso y los controles son accesibles por teclado y lector de pantalla.
- [x] 2.3 Actualizar `apps/web/README.md`: el reloj de demo, cuándo aparece (`VITE_API=real` y `VITE_DEMO=true`, API con `DEMO_MODE=true`), qué temporizadores dispara hoy y cómo volver con `pnpm demo:reset`. Verificar: revisión del texto frente a D1–D3.
- [x] 2.4 Punto de control: `pnpm lint`, `pnpm lint:deps`, `pnpm test`, `pnpm test:integracion` y `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` con código 0 sobre `main` vigente; `evidencias/02-*.txt`.

## 3. Verificación real

- [x] 3.1 Recorrido real a 375 px y 1280 px, con la API de `main` (`DEMO_MODE=true`, Postgres y Redis locales) y la web con `VITE_API=real` y `VITE_DEMO=true`:
  - en WhatsApp, apartar un horario sin confirmar;
  - en `/admin`, pulsar «+15 min»: el conteo pasa el trámite de `HORARIO_RESERVADO` a `LISTO_PARA_RESERVAR` sin recargar y se muestra la nueva hora;
  - en `/admin` en modo simulado, la sección no aparece.

  Verificar: capturas `evidencias/03-*.jpg`, JSON del recorrido y manifiesto `evidencias/03-archivos-entregados.json`, sin cambios fuera de `apps/web/**` y la carpeta del cambio.
