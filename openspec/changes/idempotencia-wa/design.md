# Design

## Context

Ver `proposal.md` (Why).

- `Tramite` asigna una `idempotencyKey` a cada evento pendiente: la clave sola si hay un evento, `clave:n` si hay varios (`Tramite.ts`, `anotar`).
- El `CHECK` de `002_persistencia` solo admite un UUID con un sufijo `:n` opcional. No se puede agregar un segundo sufijo.
- `ConversacionWa.responder` arma un solo `contexto` con la `Idempotency-Key` y lo pasa a todas las llamadas a `casos`: `retomar`, `iniciar`, `confirmar`, `identificarPaciente`, `aplicar` (servicio, sede, requisito, elegibilidad, confirmar) y `reservar`.
- La capa de idempotencia HTTP (`idempotencia.ts`) guarda la respuesta del mensaje y la repite cuando llega la misma clave.

## Goals / Non-Goals

**Goals:** que ningún mensaje de WhatsApp repita una clave de evento, y que las pruebas en memoria lo detecten.

**Non-Goals:** cambiar la regla de sufijos, el contrato o el manejo de errores de infraestructura.

## Decisions

### D1. Una clave por operación dentro del mensaje
`ConversacionWa` reemplaza el `contexto` fijo por una función `contextoOperacion()`. La primera llamada devuelve el contexto con la `Idempotency-Key` del mensaje. Las siguientes devuelven una copia con `idempotencyKey: ids.nuevo()` y el mismo `correlationId`. Todas las llamadas a `casos` del mensaje la usan. Si se repite el mensaje completo, lo sigue cubriendo la capa HTTP. Es el mismo patrón que usa `CerrarAtencion` para los `TurnoActualizado`.

*Alternativa descartada:* claves deterministas (UUID v5 a partir de la clave del mensaje). Solo sirven si un reintento parcial vuelve a ejecutar operaciones ya guardadas, cosa que la capa HTTP no hace, y además agregan una dependencia o un helper criptográfico.

*Alternativa descartada:* que `Tramite` siempre use sufijo. Cambiaría las claves de todos los canales, los datos guardados y las pruebas obligatorias.

### D2. Modo estricto opcional en memoria
`TramiteRepoMemoria` y `EventosSinTramiteMemoria` reciben `{ claveUnica: true }` en el constructor. En ese modo:

- comparten un conjunto de claves vistas, que se inyecta para que tampoco choquen un evento con trámite y uno sin trámite;
- rechazan el guardado antes de cambiar el estado.

Por defecto el modo está apagado, porque las pruebas del núcleo reutilizan claves fijas (`cc`, `wa`) en muchos comandos.

### D3. «Acepto la preparación» registra `PreparacionAceptada` (revisión 2)
El escenario de `canal-whatsapp` nombra `PreparacionAceptada`, que es el evento propio del dominio (`Tramite.aceptarPreparacion`, `PLAN.md` y `docs/eventos.md`). Antes, WhatsApp usaba el caso genérico `cumplirRequisito`, que registra `RequisitoCumplido { requisitoId: 'ACEPTAR_PREPARACION' }`. Se agrega `CasosTramite.aceptarPreparacion`, que delega en el agregado, y `ConversacionWa` lo usa solo para ese requisito. Ningún consumidor, lectura ni KPI depende de `RequisitoCumplido` para la preparación. Lo decidió Christian el 2026-11-25 (opción a de H-02 en `revision.md`).

*Alternativa descartada:* conservar `RequisitoCumplido` y cambiar el escenario. Deja sin uso el evento propio del dominio.

## Risks / Trade-offs

- **Pruebas que fallan en modo estricto porque la prueba misma repite claves** → se corrigen en la prueba. Si la clave repetida sale del código de producción, se detiene la parte afectada y se avisa.
- **Reintento parcial** (una operación guardada y la siguiente con error) → sigue dependiendo de la capa HTTP, igual que hoy.
