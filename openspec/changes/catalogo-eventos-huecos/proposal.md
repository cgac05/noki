# Proposal

## Why

El núcleo del relleno de huecos (frente A, `relleno-huecos`) y la T3 de la predicción de riesgo necesitan registrar eventos que hoy no existen en `EventoDominio`: la familia del relleno de huecos está solo «reservada» en `docs/eventos.md` y `RiesgoEstimado` quedó fuera a propósito en `prediccion-riesgo` (revisión 3). `docs/eventos.md` es un archivo compartido y no se puede cambiar dentro de la rama de un frente (`docs/trabajo-paralelo.md`), así que el catálogo se acuerda e integra primero en un cambio pequeño propio y los dos cambios del frente A se rebasan sobre él.

## What Changes

- `docs/eventos.md`: la familia del relleno de huecos pasa de «Familias reservadas» a una tabla de eventos tipados con su payload, y se agrega `RiesgoEstimado` en una sección de predicción. Se documenta a qué trámite e hilo pertenece cada evento.
- `packages/domain/src/eventos.ts`: los 12 eventos nuevos en `EVENTOS_DOMINIO` y en `PayloadsEvento` (29 → 41), con los mismos payloads que el documento.
- `packages/domain/src/identificadores.ts`: identificadores con marca para hueco, oferta de hueco e interés de adelanto.
- `tests/unit/dominio.test.ts`: el conteo pasa a 41 y se verifican los payloads nuevos.
- Ningún evento nuevo lo emite todavía nadie: lo harán `relleno-huecos` y la T3 de predicción. Sin cambios de comportamiento.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `contratos-canales`: nuevo requisito con el catálogo de eventos del relleno de huecos y de la predicción, y sus reglas de privacidad.

## Impact

- Archivos compartidos: `docs/eventos.md`. Archivos del frente A: `packages/domain/src/{eventos,identificadores}.ts` y `tests/unit/dominio.test.ts`; se incluyen porque el documento describe ese código y deben moverse juntos.
- Sin dependencias nuevas, sin migraciones, sin API ni pantallas. `ConsumidorStreams` acepta los tipos nuevos sin cambios porque valida contra `EVENTOS_DOMINIO`.
- Consumidores y proyecciones existentes: ninguno recorre la unión de forma exhaustiva fuera de la prueba de dominio; los que filtran por `tipo` ignoran los eventos nuevos.
- Coordinación: el frente A tiene `relleno-huecos` en curso y es probable que defina los mismos identificadores y payloads. Este cambio fija el catálogo; `relleno-huecos` lo usa tras rebase, y si su diseño necesita otro payload, se ajusta aquí antes de autorizar.
- Base: `main` `230d246`. No depende de `feat/contratos-relleno-huecos`.
- Responsable: cambio compartido. Requiere el visto bueno de un responsable de cada frente: `J3sus-esb` o `cgac05` por el frente A y `LuisMaster119` por el frente B. Propuesta: lo implementa el frente A, porque el código es suyo.
