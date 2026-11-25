# Tasks

Requisitos: CI = `consolas-internas`, CA = `cliente-api-canales`. Decisiones: D1–D3 de `design.md`. Cada grupo escribe primero sus pruebas y conserva el fallo previo en `evidencias/0N-rojo.txt`.

## 1. Cotización desde el catálogo (B1)

- [x] 1.1 Escribir en rojo y después implementar en `CallCenter.tsx` el texto de D1, para CI «Cotización desde el catálogo». Las pruebas usan `ClienteReal` con `fetch` falso y un catálogo de 4 servicios × 3 sedes: 12 botones con textos distintos que nombran servicio, sede y precio, y el botón del paquete en Tepic envía los identificadores de esa oferta. Verificar: rojo en `evidencias/01-rojo.txt` y verde después; el recorrido simulado de `vistas.test.tsx` sigue pasando con el texto nuevo.

## 2. Contexto al día en modo real (B2)

- [x] 2.1 Escribir en rojo las pruebas de CA «Contexto de consulta en modo real» con `ClienteReal`, `fetch` falso y navegación de la aplicación, para los escenarios «Cita confirmada en la misma pestaña» y «Refresco tras un mensaje de WhatsApp» (incluido que un mensaje fallido no refresca). Verificar: fallan por lo ausente; `evidencias/02-rojo.txt`.
- [x] 2.2 Implementar D2 y D3. Verificar: las pruebas de 2.1 pasan, y las de `contexto.test.tsx`, `historialWa.test.tsx` y `conversacion.test.tsx` siguen pasando. Una prueba comprueba que `alResponder` no recibe argumentos.

## 3. Verificación

- [x] 3.1 Punto de control: `pnpm lint`, `pnpm lint:deps`, `pnpm test` y `pnpm test:integracion` con código 0 sobre la rama rebasada en `main` vigente; `evidencias/03-{lint,deps,test,integracion}.txt`.
- [x] 3.2 Repetir en navegador, con la API de `main` en local (`DEMO_MODE=true`) y la web con `VITE_API=real` y `VITE_DEMO=true`, los pasos afectados del recorrido:
  - paso 1: los botones de cotizar distinguen la oferta;
  - paso 3: `/app` muestra la cita confirmada en la misma pestaña sin pulsar «Actualizar».

  Ejecutar `pnpm demo:reset` antes, por la falla A3 del frente A. Verificar: capturas `evidencias/03-*.jpg` a 375 px y 1280 px, JSON del recorrido y manifiesto `evidencias/03-archivos-entregados.json`, sin cambios fuera de `apps/web/**` y la carpeta del cambio.
