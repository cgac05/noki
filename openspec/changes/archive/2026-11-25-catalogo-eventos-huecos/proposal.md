# Proposal

## Why

El núcleo del relleno de huecos (`relleno-huecos`, integrado en `main` en `8f48a71`) ya agregó a `EventoDominio` los once eventos de la familia, con los payloads de su D2. Pero `docs/eventos.md` todavía los lista en «Familias reservadas» y no documenta sus payloads ni a qué trámite pertenecen. Además, `RiesgoEstimado` quedó fuera a propósito en `prediccion-riesgo` (revisión 3) y la T3 lo necesitará. `docs/eventos.md` es un archivo compartido y no se puede cambiar dentro de la rama de un frente (`docs/trabajo-paralelo.md`). Por eso el catálogo se alinea con el código en un cambio pequeño propio, y una prueba evita que el documento y el código se vuelvan a separar.

## What Changes

- `docs/eventos.md`:
  - los once eventos del relleno de huecos pasan de «Familias reservadas» a una tabla de eventos tipados, con los payloads que ya tiene `main`;
  - se agrega `RiesgoEstimado` en una sección de predicción;
  - se documenta a qué trámite e hilo pertenece cada evento.
- `packages/domain/src/eventos.ts`: se agrega `RiesgoEstimado` a `EVENTOS_DOMINIO` y a `PayloadsEvento` (40 → 41). Los once eventos de huecos no cambian.
- `tests/unit/dominio.test.ts`:
  - el conteo pasa a 41;
  - se verifican el payload de `RiesgoEstimado` y la privacidad de los payloads de huecos;
  - se agrega una prueba de que el documento y el código coinciden.
- Nadie emite todavía `RiesgoEstimado`: lo hará la T3 de predicción. Sin cambios de comportamiento.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `contratos-canales`: nuevo requisito con el catálogo de eventos del relleno de huecos y de la predicción, y sus reglas de privacidad.

## Impact

- Archivos:
  - compartido: `docs/eventos.md`;
  - del frente A: `packages/domain/src/eventos.ts` y `tests/unit/dominio.test.ts`. Se incluyen porque el documento describe ese código y deben moverse juntos.
- Sin dependencias nuevas, sin migraciones, sin API ni pantallas. `ConsumidorStreams` acepta el tipo nuevo sin cambios, porque valida contra `EVENTOS_DOMINIO`.
- Consumidores y proyecciones existentes: ninguno recorre la unión de forma exhaustiva fuera de la prueba de dominio; los que filtran por `tipo` ignoran `RiesgoEstimado`.
- Base: `main` `0157047`, que ya incluye `relleno-huecos`.
- Responsable: cambio compartido. Requiere el visto bueno de un responsable de cada frente: `J3sus-esb` o `cgac05` por el frente A, y `LuisMaster119` por el frente B.
