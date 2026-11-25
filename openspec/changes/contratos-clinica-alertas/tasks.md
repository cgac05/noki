# Tasks

Requisitos: CC = `contratos-canales`, CQ = `contratos-consultas`. Decisiones: D1–D5 de `design.md`. Las pruebas se escriben primero y el fallo previo se conserva en `evidencias/01-rojo.txt`.

## 1. Contrato

- [ ] 1.1 Escribir en rojo, en `tests/unit/contratos.test.ts` y `tests/unit/consultas.test.ts`:
  - CC: escenarios «Identidad comprobada en clínica» y «Cerrar atención»;
  - CQ: «Posición solo en llegadas registradas», «Alerta sin datos personales» y «Alertas de seguridad»;
  - el conteo de la tabla pasa a 11;
  - el recorrido de claves sensibles incluye `AlertaSeguridadSchema`.

  Verificar: `pnpm exec vitest run --project unitarios tests/unit/contratos.test.ts tests/unit/consultas.test.ts` falla por lo ausente; `evidencias/01-rojo.txt`.
- [ ] 1.2 Implementar D1–D4 en `packages/contracts/src/{comandos.ts,consultas.ts,index.ts}`, exportando los tipos `ComprobarIdentidad`, `CerrarAtencion`, `AlertaSeguridad` y la `LlegadaVista` con posición. Verificar: las pruebas de 1.1 pasan; `contracts` sigue sin depender de nada más que `zod`.

## 2. Adaptaciones y documentación

- [ ] 2.1 Aplicar D5: la rama «no disponible» en `packages/adapters/in-http/src/rutasComandos.ts` (frente A) y `alertasSeguridad: []` en `apps/web/src/cliente/mock/guionFlujoA.ts` (frente B). Verificar:
  - `pnpm -r exec tsc --noEmit` con código 0;
  - una prueba de `in-http` comprueba que ambos comandos responden el error de operación no disponible sin cambiar el trámite;
  - `apps/web` sigue en verde sin cambios de comportamiento.
- [ ] 2.2 Documentar en `docs/contratos.md` los dos comandos, la posición, `AlertaSeguridad` y la ruta `/api/admin/alertas`, y en `AGENTS.md` §7 los comandos y la consulta nuevos. Verificar: revisión del texto frente a D1–D4, sin contradecir `docs/eventos.md`.

## 3. Verificación

- [ ] 3.1 Control final sobre la rama rebasada en `main` vigente: `pnpm lint`, `pnpm lint:deps`, `pnpm test` y `pnpm test:integracion` con código 0. Verificar: `evidencias/03-{lint,deps,test,integracion}.txt` y el manifiesto `evidencias/03-archivos-entregados.json`, sin cambios fuera de los archivos listados en `proposal.md` (Impact) y la carpeta del cambio.
