# Tasks

Requisitos: CI = `consolas-internas`, CA = `cliente-api-canales`, NC = `navegacion-canales`. Decisiones: D1–D9 de `design.md`. Cada grupo escribe primero sus pruebas y conserva el fallo previo en `evidencias/0N-rojo.txt`.

## 1. Cliente: tiempo real con salas y contexto en modo real

- [x] 1.1 Escribir las pruebas en rojo del tiempo real con un socket falso inyectado (D1, D2), para CA "Tiempo real con salas": sala inválida sin emisión; conteo de referencias (una sola unión y una sola salida por sala); reunión de las salas activas tras reconectar; evento mal formado descartado sin lanzar ni usar `console.*`; en modo simulado, `unirse` no tiene efecto. Verificar: `pnpm exec vitest run --project web <archivo>` falla por la funcionalidad ausente; guardar `evidencias/01-rojo.txt`.
- [x] 1.2 Agregar `socket.io-client` `4.8.1` exacta a `apps/web/package.json` (D3) e implementar `unirse` en `ClienteApi`, `ClienteReal` (conexión perezosa, fábrica inyectable) y `ClienteMock`, más el hook `useSala`. Verificar: las pruebas de 1.1 pasan; `pnpm install --frozen-lockfile` funciona con el lockfile actualizado; `grep` en `apps/web/src/vistas` no encuentra `socket.io` ni `fetch`.
- [x] 1.3 Escribir en rojo y después implementar el orden del contexto (D4), para CA "Contexto de consulta en modo real": guion > última respuesta > `contextoDemo` (solo real); nulos o `NO_DISPONIBLE` → sin contexto; "Actualizar" vuelve a consultar. Verificar: pruebas de los tres escenarios con `ClienteReal` y `fetch` falso, incluida la de `/app` con `pacienteId` de `contextoDemo`.
- [x] 1.4 Punto de control: `pnpm lint`, `pnpm lint:deps` y `pnpm test` con código 0, en ese orden y con corte ante fallo. Guardar `evidencias/01-{lint,deps,test}.txt`.

## 2. Call center: ANI, ficha y continuación por WhatsApp

- [x] 2.1 Escribir las pruebas en rojo de CI "Llamada entrante con ANI", "Ficha del hilo para el asesor" y "Continuar por WhatsApp con consentimiento":
  - número por defecto y `contacto` en el comando; número inválido que deshabilita y explica; ANI ausente de la ficha;
  - "—" con nulos; solo lectura que deshabilita todo;
  - casilla de consentimiento obligatoria; doble clic que envía un solo `SolicitarContinuacion`; enlace y QR tras el código; error con reintento y la misma clave.
  
  Verificar: fallan por lo ausente; `evidencias/02-rojo.txt`.
- [x] 2.2 Ajustar el guion simulado (D7): `IniciarTramite` con `contacto: CONTACTO_DEMO`, paso `CONTINUACION_SOLICITADA` con `ConsentimientoContactoWA`, código solo desde ese paso, y versiones, índices y totales coherentes. Actualizar `guionWa.test.ts`, `cliente.test.ts` y el recorrido de `vistas.test.tsx` para CA "Guion simulado del Flujo A" (escenarios "Código solo tras la solicitud" y "Llamada con ANI"). Verificar: esas pruebas pasan y cada respuesta y evento del guion sigue cumpliendo su esquema.
- [x] 2.3 Implementar `/callcenter` (D5, D6) con la sala `hilo:<hiloId>` (D9, CI "Consolas en vivo por sala"). Verificar: las pruebas de 2.1 pasan, más una que comprueba la unión a la sala y el cambio de sala al cambiar de hilo.
- [x] 2.4 Punto de control: `pnpm lint`, `pnpm lint:deps` y `pnpm test` con código 0; `evidencias/02-{lint,deps,test}.txt`.

## 3. Clínica, administración y app

- [x] 3.1 Escribir las pruebas en rojo de CI "Recepción de llegadas en la clínica" (registrar, registrada sin acción, vacío, sin contexto con "Actualizar") y "Tablero de administración" (KPI documentado con nombre legible, KPI desconocido con su clave, sin hilo), y de la unión a salas de `/clinica`, `/admin` y `/app` (D9). Verificar: fallan por lo ausente; `evidencias/03-rojo.txt`.
- [x] 3.2 Implementar `/clinica` con la sala `sede:<sedeId>` y el estado sin contexto. Verificar: sus pruebas de 3.1 pasan.
- [x] 3.3 Implementar `/admin` con el mapa de etiquetas de KPI (D8), el estado sin hilo y las salas `admin` y `hilo:<hiloId>`. Verificar: sus pruebas de 3.1 pasan; `grep` en `Admin.tsx` no encuentra operaciones aritméticas sobre KPIs.
- [x] 3.4 Ajustar `/app` para el contexto de modo real y la sala `paciente:<pacienteId>`, con el estado sin contexto. Verificar: sus pruebas de 3.1 y la de 1.3 pasan; el QR sigue codificando el token (NC "QR con token, no con folio").
- [x] 3.5 Actualizar `apps/web/README.md`: ANI y consentimiento en el call center, paso nuevo del guion, `VITE_DEMO=true` necesario para el contexto en modo real, salas por vista y versión de Socket.IO. Verificar: revisión del texto frente a D3, D4 y D7.
- [x] 3.6 Punto de control: `pnpm lint`, `pnpm lint:deps` y `pnpm test` con código 0; `evidencias/03-{lint,deps,test}.txt`.

## 4. Verificación integrada

- [x] 4.1 Recorrido manual en navegador del Flujo A en modo simulado a 375 px y 1280 px: llamada con ANI → cotizar → consentimiento y continuación → `/wa` por el enlace → confirmar → `/app` → `/clinica` registra → `/admin` con la línea de tiempo y los conteos. Verificar: capturas `evidencias/04-*.jpg` y JSON del recorrido, sin desplazamiento horizontal y sin datos sensibles en pantalla.
- [x] 4.2 Modo real sin servidor: `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` con código 0, y `VITE_API=mock pnpm --filter @noki/web build` con código 0. Verificar: `evidencias/04-build-{real,mock}.txt`. El recorrido real de punta a punta queda BLOQUEADO hasta que `api-comandos` esté en `main`: registrarlo así en `implementacion.md`.
- [x] 4.3 Control final sobre la rama rebasada: `pnpm lint`, `pnpm lint:deps`, `pnpm test` y `pnpm test:integracion` con código 0 (requisito de integración de `docs/trabajo-paralelo.md`). Verificar: `evidencias/04-{lint,deps,test,integracion}.txt` y el manifiesto `evidencias/04-archivos-entregados.json`, sin cambios fuera de `apps/web/**`, `pnpm-lock.yaml` y la carpeta del cambio.
