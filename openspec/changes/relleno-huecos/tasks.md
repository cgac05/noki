# Tasks

Requisito: RH = `relleno-huecos` (escenarios por nombre). Decisiones: D1–D12 de `design.md`. Cada grupo escribe primero sus pruebas y conserva el fallo en `evidencias/0N-rojo.txt`. Base: `main` `d37b8c2`, que ya incluye `contratos-relleno-huecos`.

## 1. Dominio

- [x] 1.1 Pruebas en rojo: los 11 eventos en `EVENTOS_DOMINIO` (40 en `tests/unit/dominio.test.ts`), máquinas de hueco y oferta, `candidatoCompatible` (escenarios «Filtro de ayuno», «Adelanto real», «Silencio y límite semanal», «Orden justo»), `elegirEstrategia` y `Tramite.adelantar`. Verificar: `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar D2–D4 y D7 en `packages/domain` (sin dependencias, sin zonas horarias, sin `Date.now` ni `Math.random`). Verificar: pruebas de 1.1 en verde y `pnpm lint:deps`.

## 2. Aplicación y memoria

- [x] 2.1 Pruebas en rojo con adaptadores en memoria y `RelojFalso`: «Ana pide cancelar desde la app», «Ana aprueba», «Botón reutilizado o de otro número», «Conservar la cita», «Cancelación libera un hueco», «Evento duplicado», «Oferta a Beto…», «Sin datos del otro paciente», «Rechazo o vencimiento», «Beto adelanta su cita», «Compensación de la saga», «Se ofrece a Carla» y «Fuera del modo demo». Verificar: `evidencias/02-rojo.txt`.
- [x] 2.2 Puertos en `application/src/ports/` (repositorios de hueco e interés, `NotificadorWa`, lecturas) con adaptador en memoria; usos de token `APROBACION` y `OFERTA`; casos de uso de D1, D5, D9 y D13; temporizador `OFERTA` de D8 sin cambiar el comportamiento de `HOLD`, `INASISTENCIA` e `INACTIVIDAD`. Verificar: pruebas de 2.1 y las existentes de temporizadores en verde.

## 3. Persistencia, API y tiempo real

- [x] 3.1 Pruebas de integración en rojo: migración `005_huecos`, «Un solo ganador en oleada» contra Postgres, «Reintento con la misma clave», «Reenvío al abrir el chat», «Panel tras el Flujo C», «Límite del panel», KPI y la emisión de `admin:metricas` con `OfertaEnviada` y `HuecoAsignado`. Las pruebas van en `tests/` (unitarias e integración). Verificar: `evidencias/03-rojo.txt`.
- [x] 3.2 Implementar `infra/migraciones/005_huecos.sql`, repositorios y lecturas en `out-postgres`, `OFERTA` en `out-redis`, tokens en `ConversacionWa` y `textosWa.ts` (D6), `panelHuecos` en `rutasConsultas.ts`, KPI (D10), `wa:mensajes` y reenvío en `apps/api/src/tiempoReal.ts`, y el consumidor `huecos` en `main.ts`. Verificar: pruebas de 3.1 en verde.

## 4. Semilla y documentación

- [x] 4.1 Semilla y reinicio de demo de D11, con la prueba «Flujo C desde una base recién sembrada». Verificar: la prueba en verde y `corepack pnpm seed` con código 0 sobre una base vacía.
- [x] 4.2 Texto del silencio y del reloj de demo en `implementacion.md` para el README, y los payloads de D2 para el cambio compartido de D12 (sin tocar `docs/eventos.md`). Verificar: revisión del texto frente a D2 y D7.

## 5. Verificación

- [x] 5.1 Control final sobre la rama rebasada en `main` vigente: `pnpm lint`, `pnpm lint:deps`, `pnpm test` y `pnpm test:integracion` (Postgres de prueba en 55432) con código 0, y pruebas obligatorias de `AGENTS.md` §9 en verde. Verificar: `evidencias/05-{lint,deps,test,integracion}.txt` y el manifiesto `evidencias/05-archivos-entregados.json`, sin cambios fuera de los archivos de `proposal.md` (Impact) y la carpeta del cambio.
