# Design

## Context
Ver `proposal.md` (Why). `CasosTramite.iniciar` resuelve el contacto con `contactos.buscar(canal, valor)` (único por canal) y crea siempre un trámite. `retomar` ya sabe cambiar de canal: `HiloAtencion.retomar(canal, metodo)` devuelve el `CanalCambiado` y `Tramite.retomar(contexto, metodo, identidad?, cambioHilo)` lo registra. `ContactosPostgres.buscarTelefonoCapturado` ya compara los últimos 10 dígitos, pero solo para `callcenter`.

## Decisions

### D1. Retomar dentro de `iniciar`, solo para llamadas de asesor
La web ya envía `IniciarTramite` al recibir la llamada; reutilizarlo evita cambiar contrato y pantalla. La regla aplica solo con `canal === 'callcenter'`, actor `asesor:*` y contacto; otros canales no cambian.

### D2. Qué trámite se retoma
Trámites del mismo tipo en proceso (`BORRADOR`…`HORARIO_RESERVADO`) en los hilos de contactos `whatsapp` o `callcenter` del número. Gana el más reciente por `ultima_actividad` que no esté en `BORRADOR`; si todos son `BORRADOR`, el más reciente. Así un borrador vacío de una llamada anterior no tapa el trámite real de WhatsApp (caso de Christian).

### D3. `LLAMADA_CC` sin vínculo
Se agrega `LLAMADA_CC` a `MetodoVinculo` solo para `CanalCambiado`. No se crea vínculo, por lo que la restricción de `vinculo.metodo` de `003_identidad` no se toca. El contacto `callcenter` sigue en su hilo; la respuesta lleva el `hiloId` del trámite retomado y la web muestra esa ficha.

*Alternativa descartada:* unificar contactos por teléfono en un solo hilo. Cambia el modelo de contactos y la migración.

## Risks / Trade-offs
- Revelación al asesor por ANI (ver proposal). Aceptado para la demo, como la prioridad 3.
- Si el número tiene trámites de dos pacientes distintos en proceso, se retoma el más reciente; el asesor ve la ficha y puede iniciar otro.
