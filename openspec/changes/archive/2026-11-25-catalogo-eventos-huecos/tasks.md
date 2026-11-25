# Tasks

Requisito: CC = `contratos-canales` («Eventos del relleno de huecos y de la predicción»). Decisiones D1–D4 de `design.md`. Evidencia en `openspec/changes/catalogo-eventos-huecos/evidencias/`.

## 1. Catálogo en el dominio

- [x] 1.1 Escribir en rojo, en `tests/unit/dominio.test.ts`, los escenarios de CC:
  - conteo de 41, con `RiesgoEstimado` incluido;
  - `RiesgoEstimado` sin `nivel`, o con el payload de `HuecoLiberado`, rechazado por los tipos;
  - payloads de interés, de oferta y `CitaAdelantada` sin `pacienteId`, `tramiteId` ni `origenReservaId`;
  - los nombres de las tablas de eventos tipados de `docs/eventos.md` iguales a `EVENTOS_DOMINIO`, y ninguno de los doce en «Familias reservadas» (D4).

  Se conservan las verificaciones existentes: exhaustividad, claves sensibles y presencia de los once de huecos. Verificar: `corepack pnpm exec vitest run --project unitarios tests/unit/dominio.test.ts` falla por lo ausente; `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar D3 en `packages/domain/src/eventos.ts`: `RiesgoEstimado` en `EVENTOS_DOMINIO` y en `PayloadsEvento`, con los tipos de `prediccion/nivel.ts`. Los payloads de los once eventos de huecos no cambian (D1). Verificar: las pruebas de dominio pasan, salvo la de coincidencia con el documento, y `corepack pnpm -r exec tsc --noEmit` termina con código 0.

## 2. Documentación

- [x] 2.1 Actualizar `docs/eventos.md`:
  - tabla «Relleno de huecos» con los payloads de D1 y la pertenencia de D2;
  - sección «Predicción» con `RiesgoEstimado` (D3);
  - nota de privacidad de `PLAN.md` §10.1;
  - quitar los once eventos de «Familias reservadas».

  Verificar: la prueba de coincidencia de 1.1 pasa, y el texto no contradice `eventos.ts`, `PLAN.md` §6, §7 y §10.1 ni `docs/contratos.md`.

## 3. Verificación

- [x] 3.1 Control final sobre la rama rebasada en el `main` vigente: `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test` y `corepack pnpm test:integracion`, todos con código 0. `test:integracion` se incluye porque `ConsumidorStreams` valida contra la lista ampliada. Verificar:
  - `evidencias/03-{lint,deps,test,integracion}.txt`;
  - el manifiesto `evidencias/03-archivos-entregados.json`, sin cambios fuera de `docs/eventos.md`, `packages/domain/src/eventos.ts`, `tests/unit/dominio.test.ts` y la carpeta del cambio.
