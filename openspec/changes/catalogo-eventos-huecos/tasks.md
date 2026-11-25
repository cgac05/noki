# Tasks

Requisito: CC = `contratos-canales` («Eventos del relleno de huecos y de la predicción»). Decisiones D1–D5 de `design.md`. Evidencia en `openspec/changes/catalogo-eventos-huecos/evidencias/`.

## 1. Catálogo en el dominio

- [ ] 1.1 Escribir en rojo, en `tests/unit/dominio.test.ts`, los escenarios de CC: conteo 41 y los doce nombres nuevos; `CitaAdelantada` sin `diasAdelantados` o con el payload de `HuecoLiberado` rechazado por tipos; payloads de interés, oferta y `CitaAdelantada` sin `pacienteId`, `tramiteId` ni `origenReservaId`; la lista de eventos de `docs/eventos.md` igual a `EVENTOS_DOMINIO` y sin los doce en «Familias reservadas» (D5). Las verificaciones existentes (exhaustividad y claves sensibles) se conservan. Verificar: `corepack pnpm exec vitest run --project unitarios tests/unit/dominio.test.ts` falla por lo ausente; `evidencias/01-rojo.txt`.
- [ ] 1.2 Implementar D1, D3 y D4 en `packages/domain/src/{eventos,identificadores}.ts`. Verificar: las pruebas de dominio pasan salvo la de coincidencia con el documento, y `corepack pnpm -r exec tsc --noEmit` termina con código 0.

## 2. Documentación

- [ ] 2.1 Actualizar `docs/eventos.md`: tabla «Relleno de huecos» y sección «Predicción» con los payloads de D1 y D3, la pertenencia de cada evento según D2 y la nota de privacidad de `PLAN.md` §10.1; quitar los once de «Familias reservadas». Verificar: la prueba de coincidencia de 1.1 pasa y el texto no contradice `PLAN.md` §6, §7 y §10.1 ni `docs/contratos.md`.

## 3. Verificación

- [ ] 3.1 Control final sobre la rama rebasada en el `main` vigente: `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test` y `corepack pnpm test:integracion` con código 0 (este último porque `ConsumidorStreams` valida contra la lista ampliada). Verificar: `evidencias/03-{lint,deps,test,integracion}.txt` y el manifiesto `evidencias/03-archivos-entregados.json`, sin cambios fuera de `docs/eventos.md`, `packages/domain/src/{eventos,identificadores}.ts`, `tests/unit/dominio.test.ts` y la carpeta del cambio.
