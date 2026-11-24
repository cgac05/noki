# publicacion-eventos Specification

## Purpose

Define cómo los eventos guardados salen del outbox hacia Redis Streams particionados y cómo los consume un consumidor idempotente que tolera reinicios, duplicados y fallos repetidos.

## Requirements

### Requirement: Relay del outbox a Redis Streams
Un relay SHALL publicar cada fila de outbox pendiente en el stream `eventos:{particion}` con la envoltura completa del evento y su `idempotencyKey`, en el orden en que se guardaron dentro de cada partición, y MUST marcarla publicada solo después de que Redis confirme la escritura. Si la publicación falla, la fila MUST quedar pendiente con su contador de intentos incrementado y un mensaje genérico, y el relay MUST NOT publicar eventos posteriores de esa misma partición en ese ciclo. Cada relay MUST tener acceso exclusivo a una partición desde que lee sus filas pendientes hasta que registra el resultado de publicarlas; si otro relay la tiene, MUST omitirla en ese ciclo. El relay MUST orquestarse en la capa de aplicación sobre puertos, con adaptadores Postgres, Redis y en memoria, y MUST arrancar y detenerse con `apps/api`.

#### Scenario: Publicación en orden
- **WHEN** hay tres eventos pendientes del mismo paciente y el relay ejecuta un ciclo
- **THEN** los tres aparecen en `eventos:{n}` en el orden en que se guardaron y sus filas de outbox tienen `publicado_en`

#### Scenario: Redis no disponible
- **WHEN** Redis no responde durante un ciclo del relay
- **THEN** ninguna fila se marca publicada, sus intentos aumentan y, al volver Redis, el siguiente ciclo las publica

#### Scenario: Caída entre publicar y marcar
- **WHEN** el relay publica un evento y el proceso termina antes de marcarlo
- **THEN** el evento se publica de nuevo en el siguiente arranque y los consumidores lo procesan una sola vez

#### Scenario: Dos relays a la vez
- **WHEN** dos instancias del relay ejecutan un ciclo al mismo tiempo y la publicación en Redis tarda lo suficiente para que el segundo relay lea el outbox mientras el primero aún no marca sus filas
- **THEN** ninguna fila se publica dos veces y cada partición la procesa un solo relay en ese ciclo

#### Scenario: Relay caído con la partición tomada
- **WHEN** un relay termina abruptamente mientras tiene tomada una partición con filas sin marcar
- **THEN** otro relay puede tomar esa partición en su siguiente ciclo y publicar las filas pendientes

### Requirement: Consumidor idempotente con reproceso
El consumidor base SHALL leer las 8 particiones con un grupo de consumidores por tipo de consumidor, procesar primero sus mensajes pendientes al iniciar y después los nuevos, y confirmar (`XACK`) cada mensaje solo después de procesarlo. MUST descartar un evento cuya `idempotencyKey` ya registró ese mismo grupo, y MUST registrar cada evento procesado de forma persistente.

#### Scenario: Reinicio sin pérdidas ni duplicados
- **WHEN** el consumidor se detiene a mitad de un lote de 20 eventos y se vuelve a iniciar
- **THEN** el manejador terminó procesando cada uno de los 20 eventos exactamente una vez según el registro de procesados

#### Scenario: Evento duplicado en el stream
- **WHEN** el mismo evento llega dos veces al stream
- **THEN** el manejador se ejecuta una sola vez y ambos mensajes quedan confirmados

#### Scenario: Grupos independientes
- **WHEN** dos grupos distintos consumen el mismo stream
- **THEN** cada grupo procesa cada evento una vez, sin interferir con el otro

### Requirement: Cola de mensajes fallidos
Cuando el manejador falla por tercera vez con el mismo mensaje, el consumidor SHALL copiarlo a `eventos:fallidos` con el grupo, la `idempotencyKey`, el tipo y un motivo genérico, y MUST confirmarlo en su stream para no bloquear la partición. El motivo MUST NOT contener el payload ni datos personales.

#### Scenario: Tercer fallo
- **WHEN** el manejador lanza un error en las tres entregas de un evento
- **THEN** el evento aparece una vez en `eventos:fallidos` con su grupo y su clave, deja de estar pendiente y los eventos siguientes de la partición se procesan
