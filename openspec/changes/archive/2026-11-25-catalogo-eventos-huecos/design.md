# Design

## Context

Ver `proposal.md` (Why).

- `EVENTOS_DOMINIO` y `PayloadsEvento` (`packages/domain/src/eventos.ts`) definen hoy 40 eventos: los 29 originales y los once que agregó `relleno-huecos`.
- `tests/unit/dominio.test.ts` fija ese número, que los once estén presentes, la correspondencia entre la lista y la unión, la exhaustividad del `switch` y la ausencia de claves sensibles.
- `docs/eventos.md` solo tiene la tabla de los 29 originales y deja los once en «Familias reservadas».
- `ConsumidorStreams` acepta un evento si su `tipo` está en `EVENTOS_DOMINIO`.
- La envoltura exige `hiloId` y admite `tramiteId` nulo.
- `prediccion-riesgo` dejó preliminares para la T3: actor `sistema`, nivel 0, último canal del trámite y clave de `GeneradorId` (sus D3 y D4). También dejó el tipo de dominio `RiesgoEstimado { tramiteId, nivel, probabilidad, origen, versionModelo, estimadoEn }` en `packages/domain/src/prediccion/nivel.ts`.

## Goals / Non-Goals

**Goals:**
- Que `docs/eventos.md` describa los eventos de huecos tal como están en el código, y que una prueba lo mantenga así.
- Fijar el nombre y el payload de `RiesgoEstimado` antes de que la T3 lo emita.

**Non-Goals:**
- Cambiar los payloads, la emisión o los consumidores de los eventos de huecos: ya están integrados con `relleno-huecos`.
- Identificadores con marca para hueco, oferta e interés. `main` los usa como `string` en todo el núcleo, y cambiarlos sería un refactor del frente A. Quedan para un cambio propio si se necesitan.
- Emitir `RiesgoEstimado`: lo hará la T3.
- Las demás familias reservadas (resultados, seguimiento, atención, facturación).

## Decisions

### D1. Los payloads de huecos son los de `main`
El catálogo adopta los payloads de D2 de `relleno-huecos` tal como están en `eventos.ts` (tabla de su `implementacion.md`). Llevan solo IDs, estados y fechas; no llevan nombres, contactos ni el token de la oferta.
- Alternativa descartada: los payloads de la revisión 1 (con `origenReservaId`, `sedesAceptadas`, ventanas e `interesId` en la oferta). El núcleo ya emite y persiste los de `main`, y cambiarlos tocaría su código y sus pruebas sin una necesidad concreta.

### D2. A qué trámite pertenece cada evento
Según D2 de `relleno-huecos`:
- `HuecoLiberado`, `HuecoAsignado` y `HuecoDesierto` van al trámite y al hilo de la cita que liberó el horario.
- Los eventos de interés, de oferta y `CitaAdelantada` van al trámite `AGENDAR` y al hilo del candidato.

Así la línea de tiempo de cada paciente solo muestra lo suyo. La privacidad de `PLAN.md` §10.1 se cumple en los propios payloads: ninguno de los del candidato referencia al paciente, al trámite ni a la reserva de quien liberó el horario.

### D3. `RiesgoEstimado` sin repetir la envoltura
El payload lleva `nivel`, `probabilidad`, `origen` y `versionModelo`, con los tipos de `RiesgoEstimado` del dominio (`NivelRiesgo` y `'MODELO' | 'REGLAS'`). `tramiteId` y la hora ya están en la envoltura (`tramiteId`, `ts`), así que no se duplican. Retoma los preliminares D3 y D4 de `prediccion-riesgo` sin cambiarlos.

### D4. Prueba de coincidencia entre documento y código
La prueba de dominio compara los nombres de eventos de las tablas de eventos tipados de `docs/eventos.md` con `EVENTOS_DOMINIO`, y comprueba que ninguno aparezca en «Familias reservadas». Lee el archivo con `node:fs` desde la prueba, no desde el dominio.
- Alternativa descartada: comparar también los campos de cada payload desde el texto. Los tipos solo existen en tiempo de compilación; la prueba de tipos (`expectTypeOf`) cubre los campos y el texto se revisa en la revisión.

## Risks / Trade-offs

- [`RiesgoEstimado` está en la unión, pero nadie lo emite todavía] → No afecta: fuera de la prueba, ningún código recorre la unión de forma exhaustiva, y los consumidores filtran por tipo.
- [El conteo fijo de la prueba choca con otro cambio que también agregue eventos] → Se integra uno y se rebasa el otro, como cualquier cambio a un archivo compartido.
- [Si el frente A cambia un payload de huecos, la prueba de coincidencia no lo detecta, porque solo compara nombres] → La regla de `AGENTS.md` de actualizar `docs/eventos.md` en el mismo cambio sigue aplicando.

## Migration Plan

Sin migración de datos. La rama `feat/catalogo-eventos-huecos` está rebasada sobre `main` `0157047`. Rollback: revertir el commit; nada emite `RiesgoEstimado` todavía.
