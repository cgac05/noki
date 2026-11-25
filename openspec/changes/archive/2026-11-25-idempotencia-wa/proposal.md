# Proposal

## Why

Al preparar el recorrido de `pantallas-clinica-alertas` (`main` `b66e393`), Luis encontró que, con el paciente asignado desde el call center, WhatsApp responde HTTP 500 `INTERNO` después de «Acepto la preparación» y el trámite se queda en `LISTO_PARA_RESERVAR`. El detalle está en `openspec/changes/archive/2026-11-24-pantallas-clinica-alertas/implementacion.md` y en `evidencias/04-preparacion-citas.json` de esa carpeta.

**Causa (Claude la reprodujo contra Postgres en `b66e393`):**

1. Con el paciente ya asignado, cumplir el último requisito deja el trámite en `LISTO_PARA_RESERVAR`.
2. En el mismo mensaje, `ConversacionWa` reserva el horario preferido.
3. Las dos operaciones usan el mismo `ContextoComando` y, por lo tanto, la misma `idempotencyKey`. Cada una registra un solo evento, así que `Tramite` les asigna a los dos la clave sin sufijo.
4. Al guardar la reserva, Postgres rechaza el evento por la restricción `evento_idempotency_key_key` (`duplicate key value violates unique constraint`). Ese error no es de dominio y termina en 500.

En el flujo normal no falla porque la identificación por WhatsApp registra varios eventos (`clave:1`, `clave:2`) y la reserva se queda con la clave sola. Las pruebas en memoria no lo detectan porque `TramiteRepoMemoria` acepta claves repetidas.

## What Changes

- **`ConversacionWa`:** dentro de un mismo mensaje, la primera operación del núcleo usa la `Idempotency-Key` del mensaje y cada operación siguiente usa una clave nueva (UUID v7) con el mismo `correlation_id`.
- **Paridad en memoria:** `TramiteRepoMemoria` y `EventosSinTramiteMemoria` agregan un modo estricto que rechaza una `idempotency_key` repetida, igual que Postgres. `crearApiPruebas` lo activa. Las pruebas del núcleo no cambian.
- **«Acepto la preparación» con su evento propio (revisión 2, H-02):** en WhatsApp, el botón del requisito `ACEPTAR_PREPARACION` usa un caso de uso nuevo, `CasosTramite.aceptarPreparacion`, que delega en `Tramite.aceptarPreparacion` (ya existente) y registra `PreparacionAceptada { servicioId }` en lugar de `RequisitoCumplido`. Los demás requisitos siguen con `cumplirRequisito`.
- **Pruebas de regresión** del recorrido de Luis, en memoria y en Postgres.

### Fuera de alcance

- Archivos compartidos y contratos. Tampoco cambian el vocabulario de errores ni la regla de sufijos `:n` de `Tramite`.
- Convertir errores de base de datos en errores de dominio.
- Cambiar la capa de idempotencia HTTP.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `canal-whatsapp`: requisito nuevo «Varias operaciones en un mismo mensaje».
- `persistencia-tramites`: requisito nuevo «Clave de idempotencia única también en memoria».

## Impact

- Archivos del frente A:
  - `packages/adapters/in-http/src/ConversacionWa.ts` y `packages/application/src/CasosTramite.ts` (revisión 2);
  - `packages/adapters/memory/src/{TramiteRepoMemoria,EventosSinTramiteMemoria}.ts`;
  - `apps/api/src/pruebas.ts`;
  - las pruebas de `tests/unit/api` y `tests/integracion`.
- Sin migraciones ni dependencias.
- Riesgo: el modo estricto puede destapar otras pruebas HTTP o de WhatsApp que repiten claves. Se corrigen en este cambio, y se avisa si alguna revela otro defecto.
- Responsable: frente A (`J3sus-esb` y `cgac05`); basta uno.
