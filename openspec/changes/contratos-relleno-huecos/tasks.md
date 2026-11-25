# Tasks

Requisitos: CC = `contratos-canales`, CQ = `contratos-consultas`. Decisiones: D1–D5 de `design.md`. Las pruebas se escriben primero y el fallo previo se conserva en `evidencias/01-rojo.txt`.

## 1. Contrato

- [ ] 1.1 Escribir en rojo, en `tests/unit/contratos.test.ts` y `tests/unit/consultas.test.ts`:
  - CC: escenarios «Sala mal formada» (seis prefijos), «Sala de WhatsApp» y «Mensajes salientes de WhatsApp»;
  - CQ: «Hueco sin datos de pacientes», «Estado de hueco inválido» y «Panel de huecos»;
  - el conteo de la tabla pasa a 12;
  - el recorrido de claves sensibles incluye el esquema de hueco.

  Verificar: `pnpm exec vitest run --project unitarios tests/unit/contratos.test.ts tests/unit/consultas.test.ts` falla por lo ausente; `evidencias/01-rojo.txt`.
- [ ] 1.2 Implementar D1–D3 en `packages/contracts/src/{tiempoReal.ts,consultas.ts,index.ts}`, exportando `HuecoVista`, el tipo del dato de `wa:mensajes` y la nueva `Sala`. Verificar: las pruebas de 1.1 pasan y `contracts` sigue dependiendo solo de `zod`.

## 2. Adaptación y documentación

- [ ] 2.1 Aplicar D5: `panelHuecos: []` en `apps/web/src/cliente/mock/guionFlujoA.ts`. Verificar: `pnpm -r exec tsc --noEmit` con código 0, `apps/web` en verde sin cambios de comportamiento, y ningún archivo del frente A modificado.
- [ ] 2.2 Documentar en `docs/contratos.md` el evento, la sala, `HuecoVista`, la ruta `/api/admin/huecos` y las claves de KPI de D4, y en `AGENTS.md` §7 el evento, la sala y la consulta. Verificar: revisión del texto frente a D1–D4, sin contradecir `docs/eventos.md` ni `PLAN.md` §10.1.

## 3. Verificación

- [ ] 3.1 Control final sobre la rama rebasada en `main` vigente: `pnpm lint`, `pnpm lint:deps`, `pnpm test` y `pnpm test:integracion` con código 0. Verificar: `evidencias/03-{lint,deps,test,integracion}.txt` y el manifiesto `evidencias/03-archivos-entregados.json`, sin cambios fuera de los archivos listados en `proposal.md` (Impact) y la carpeta del cambio.
