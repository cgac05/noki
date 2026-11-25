# Proposal

## Why

El 2026-11-25 Christian, en la demo (`main` `51e4df6`), empezó en `/wa` con el número `3112111818`, eligió «Química sanguínea» en «Clínica Tepic» y después pasó a `/callcenter` para continuar con el mismo número. Call Center no mostró ningún trámite pendiente.

Causa (Claude la verificó en Postgres):
- Los contactos son por canal (`contacto_canal(canal, valor_externo)` único), así que `whatsapp/3112111818` y `callcenter/3112111818` son dos contactos con hilos distintos.
- «Llamada entrante» envía `IniciarTramite` y `CasosTramite.iniciar` siempre crea un trámite nuevo en el hilo del contacto `callcenter`. Quedaron un `COTIZADO` en el hilo de WhatsApp y un `BORRADOR` vacío en el de Call Center.
- La continuidad entre canales solo existe hacia WhatsApp (token, vínculo, teléfono capturado). No hay camino de WhatsApp a Call Center.

La normalización del número no es la causa: ambos guardan `3112111818`.

## What Changes

- `CasosTramite.iniciar`, cuando el comando es una llamada de un asesor en `callcenter` con contacto, busca por los últimos 10 dígitos los trámites en proceso del número en hilos de `whatsapp` y `callcenter` y retoma uno (regla en el delta) en lugar de crear otro. Registra `CanalCambiado{..., metodo: 'LLAMADA_CC'}` si cambia el canal y deja el hilo en `callcenter`.
- Nuevo valor `LLAMADA_CC` en `MetodoVinculo` (dominio) y en `docs/eventos.md`. No se usa en vínculos, así que no requiere migración.
- `ContactosPort` agrega una consulta de hilos por teléfono para `whatsapp` y `callcenter` (Postgres con el índice `contacto_telefono` existente, y memoria).
- La web no cambia: la respuesta de `IniciarTramite` ya trae el trámite con su `hiloId` y `/callcenter` muestra la ficha de ese hilo.

### Fuera de alcance

- Vincular el contacto `callcenter` al paciente o verificar identidad por la llamada.
- Retomar trámites `CONFIRMADA` o posteriores (una llamada de alguien con cita confirmada abre un trámite nuevo, como hoy).
- Cambios en `apps/web`, contratos HTTP o migraciones.

## Capabilities

### Modified Capabilities
- `continuidad-canales`: requisito nuevo «Llamada entrante retoma el trámite en proceso del número» y ajuste de «Último canal del hilo al iniciar un trámite».

## Impact

- `packages/domain/src/vocabulario.ts`, `packages/application/src/CasosTramite.ts`, `packages/application/src/ports/nucleo.ts`, `packages/adapters/out-postgres/src/ContactosPostgres.ts`, `packages/adapters/memory/src/ContactosMemoria.ts`, `docs/eventos.md`; pruebas en `tests/unit/nucleo/` y `tests/integracion/`.
- Riesgo: el asesor ve servicio, sede y, si hay paciente, el nombre de pila del trámite del número que llama (ANI). Es personal autenticado y es el mismo alcance de la prioridad 3; un ANI falsificado podría ver ese resumen.
