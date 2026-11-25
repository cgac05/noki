# Design

## Context

Ver `proposal.md` (Why). `EVENTOS_DOMINIO` y `PayloadsEvento` (`packages/domain/src/eventos.ts`) definen hoy 29 eventos; `tests/unit/dominio.test.ts` fija ese número, la correspondencia lista-unión, la exhaustividad del `switch` y la ausencia de claves sensibles. `docs/eventos.md` repite la tabla y deja la familia de huecos en «Familias reservadas». `ConsumidorStreams` acepta un evento si su `tipo` está en `EVENTOS_DOMINIO`. La envoltura exige `hiloId` y admite `tramiteId` nulo. `prediccion-riesgo` dejó preliminares para T3: actor `sistema`, nivel 0, último canal del trámite y clave de `GeneradorId` (sus D3 y D4), y el tipo de dominio `RiesgoEstimado { tramiteId, nivel, probabilidad, origen, versionModelo, estimadoEn }`.

## Goals / Non-Goals

**Goals:**
- Fijar nombres y payloads antes de que `relleno-huecos` y la T3 los emitan, para que ninguno de los dos toque `docs/eventos.md` en su rama.

**Non-Goals:**
- Emitir los eventos, migraciones, tablas de huecos, consumidores y proyecciones: son de `relleno-huecos` y de la T3.
- Las demás familias reservadas (resultados, seguimiento, atención, facturación).

## Decisions

### D1. Payloads solo con IDs y datos del hueco
Cada payload lleva los identificadores necesarios para reconstruir el hueco y la oferta desde los eventos, más los datos que `PLAN.md` §7 marca (`diasAdelantados`) y los de la tabla `hueco` de §6 (`sedeId`, `recursoId`, `inicio`, `origenReservaId`). Sin nombres, contactos ni el token de la oferta (`token_jti` se queda en la tabla).
- Alternativa descartada: incluir `servicioId` en `HuecoLiberado`. Se deduce del recurso y de la reserva de origen; agregarlo después no rompe a nadie.

### D2. A qué trámite pertenece cada evento
El hueco nace de la cita que se canceló o reprogramó, así que `HuecoLiberado`, `HuecoAsignado` y `HuecoDesierto` van en ese trámite (su `hiloId` es el del paciente que liberó). Lo que vive el candidato (interés, ofertas, `CitaAdelantada`) va en su trámite `ADELANTO`. Así la línea de tiempo de cada paciente solo muestra lo suyo y la privacidad de §10.1 se cumple en los propios payloads (requisito «Oferta sin datos de quien canceló»).
- Alternativa descartada: eventos de hueco con `tramiteId` nulo y un hilo propio del sistema. Obliga a crear hilos sin paciente y saca el hueco de la línea de tiempo de la cancelación en `/admin`.

### D3. `RiesgoEstimado` sin repetir la envoltura
El payload lleva `nivel`, `probabilidad`, `origen` y `versionModelo`. `tramiteId` y la hora ya están en la envoltura (`tramiteId`, `ts`), así que no se duplican. Retoma los preliminares D3 y D4 de `prediccion-riesgo` sin cambiarlos.

### D4. Identificadores con marca
`HuecoId`, `OfertaHuecoId` e `InteresAdelantoId` se agregan a `identificadores.ts` con el mismo patrón `Identificador<T>`. Los usarán `relleno-huecos` y sus adaptadores; nada más cambia.

### D5. Prueba de coincidencia documento-código
La prueba de dominio compara la lista de eventos de `docs/eventos.md` (las filas de las tablas de eventos tipados) con `EVENTOS_DOMINIO`, para que el documento no se vuelva a desalinear. Lee el archivo con `node:fs` desde la prueba, no desde el dominio.

## Risks / Trade-offs

- [`relleno-huecos` del frente A ya define otros payloads o identificadores en su rama] → Se resuelve antes de autorizar: el frente A revisa D1–D4 contra su diseño y, si hace falta, se ajusta esta propuesta. Después su rama se rebasa sobre este cambio.
- [Eventos en la unión que nadie emite todavía] → No afecta: ningún código fuera de la prueba recorre la unión de forma exhaustiva y los consumidores filtran por tipo.
- [El conteo fijo de la prueba choca con otro cambio que también agregue eventos] → Se integra uno y se rebasa el otro, como cualquier cambio a un archivo compartido.

## Migration Plan

Sin migración de datos. Rama `feat/catalogo-eventos-huecos` desde `main` `230d246`; se integra a `main` antes de `relleno-huecos` y de la T3, que se rebasan sobre él. Rollback: revertir el commit; nada emite estos eventos todavía.
