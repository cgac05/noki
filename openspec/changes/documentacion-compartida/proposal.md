# Proposal

## Why

Christian decidió cerrar `PLAN.md` §11 con tres trabajos: `clinica-alertas` (frente A), las pantallas de clínica y administración (frente B) y un cambio compartido que ponga al día los archivos compartidos. Este es el tercero. Junta los pendientes que los cambios anteriores dejaron fuera por tocar archivos compartidos:

- **Sin comprobación de identidad en clínica.** El 2026-11-25 Christian descartó `ComprobarIdentidad` con INE: no todos tienen INE, y la identidad ya se confirmó al agendar (teléfono y fecha de nacimiento, o CURP). En clínica basta el QR firmado. El comando sigue en el contrato (`contratos-clinica-alertas`), y `PLAN.md` §7 y §8 todavía mencionan la INE.
- **`contratos-clinica-alertas`, sugerencia H-01:** `metodo?: 'GET'` aparece solo en una entrada de `RUTAS_CONSULTAS`. Además, `docs/contratos.md` y `AGENTS.md` §7 dicen que la ruta de alertas responde 404, y eso deja de ser cierto con `clinica-alertas`.
- **`temporizadores`:** el grupo `temporizadores` no figura en `AGENTS.md` §7, y el `jobId` físico de BullMQ (`${tipo}-${tramiteId}`) no está documentado junto al lógico (`${tipo}:${tramiteId}`). Tampoco hay contrato para `POST /api/demo/reloj`, que el botón «Adelantar reloj» de `/admin` necesita, ni instrucciones en el README.
- **`persistencia-eventos`:** `docs/eventos.md` todavía dice que la base no implementa outbox ni consumidores.

## What Changes

- **Quitar `ComprobarIdentidad`:**
  - del `ComandoRequestSchema`;
  - de la rama 404 temporal de `rutasComandos.ts`;
  - de las pruebas de contratos;
  - de `docs/contratos.md` y `AGENTS.md` §7;
  - de `PLAN.md`: la acción «INE verificada» de `/clinica` en §7, y en §8 la nota de que la clínica valida la INE y el nivel 2 «INE en clínica», que queda reservado sin método.
  - `MetodoVinculo` conserva `INE_CLINICA` en el dominio como valor reservado sin uso.
- **Tabla de rutas uniforme:** quitar `metodo?: 'GET'` de `DefinicionConsulta` y de `alertasSeguridad`, y restaurar en `docs/contratos.md` la frase «el método es uniforme y no se repite por entrada».
- **Alertas al día:** quitar de `docs/contratos.md` y `AGENTS.md` §7 las notas de «404 hasta el cambio del núcleo».
- **Contrato del reloj de demo:**
  - `AdelantarRelojSchema`, `RespuestaRelojSchema` y la constante de ruta `/api/demo/reloj` (solo demo) en `@noki/contracts`;
  - `rutaRelojDemo.ts` usa esos esquemas en lugar de su Zod local;
  - el botón de `/admin` lo hace el frente B en su cambio de pantallas.
- **`AGENTS.md` §7:** agregar el grupo `temporizadores` y anotar el `jobId` físico de BullMQ.
- **`docs/eventos.md`:** actualizar las dos frases sobre outbox y consumidores con lo que ya existe (outbox en Postgres y Redis Streams con consumidores idempotentes).
- **`README.md`:** sección «Reloj de demo» con el uso de `POST /api/demo/reloj` y del botón de `/admin`.

### Fuera de alcance

- Las pantallas de `/clinica` y `/admin`, incluido el botón «Adelantar reloj» (frente B).
- Implementar la lógica de `clinica-alertas` (frente A).
- Cambiar el vocabulario de eventos o de `MetodoVinculo`.
- Cambiar el cuerpo de error 400 de `/api/demo/reloj` (`{ codigo: 'CUERPO_INVALIDO' }`), que no sigue `CuerpoErrorSchema`. Se anota como pendiente.
- Los demás extras de §11.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `contratos-canales`: «Comando y respuesta comunes a todos los canales» quita `ComprobarIdentidad`; requisito nuevo «Contrato del reloj de demo».

## Impact

- **Archivos compartidos:**
  - `packages/contracts/src/{comandos,consultas}.ts` y un módulo nuevo `demo.ts`, exportado en `index.ts`;
  - `tests/unit/{contratos,consultas}.test.ts`;
  - `docs/contratos.md`, `docs/eventos.md`, `AGENTS.md`, `PLAN.md` y `README.md`.
- **Archivos del frente A:** `packages/adapters/in-http/src/{rutasComandos,rutaRelojDemo}.ts` y sus pruebas, solo para quitar la rama de `ComprobarIdentidad` y adoptar el esquema del reloj.
- **Orden:** se integra **después** de `clinica-alertas`, porque documenta su estado final (alertas disponibles) y quita la rama 404 que `clinica-alertas` conserva.
- **Responsables:** cambio compartido. Hace falta el visto bueno de un responsable de cada frente: `J3sus-esb` o `cgac05` por el frente A, y `LuisMaster119` por el frente B, escrito por él o transmitido textualmente.
