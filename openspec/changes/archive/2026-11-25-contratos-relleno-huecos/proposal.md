# Proposal

## Why

El relleno de huecos (`PLAN.md` §10.1, Flujo C de §12) es el siguiente extra P1 de §11 y el diferenciador principal de la demo: Ana cancela, Beto recibe en WhatsApp la oferta del espacio liberado, la acepta y `/admin` muestra el hueco recuperado en vivo. En la exploración del 2026-11-25, `LuisMaster119` eligió que Ana cancele en `/app` con **botón de aprobación**.

El contrato compartido no alcanza para eso:

- WhatsApp solo responde a lo que escribe el paciente. No hay forma de que la empresa le envíe a Ana la aprobación ni a Beto la oferta.
- `/admin` no tiene de dónde leer los huecos y sus ofertas.
- Las claves de KPI de §10.8 sobre huecos no están documentadas.

Según `docs/trabajo-paralelo.md`, el contrato se cambia en un cambio propio con el visto bueno de ambos frentes.

## What Changes

Todo es agregado y compatible hacia atrás:

- **Mensajes salientes de WhatsApp**:
  - evento de tiempo real `wa:mensajes` con `{ waId, mensajes }` (de 1 a 5 `MensajeBot`);
  - sala nueva `wa:<waId>` (10 a 15 dígitos), a la que se une el cliente con `sala:unirse`.

  Sirve para la aprobación de la cancelación de Ana y para la oferta a Beto. Sus botones llevan como `payload` un token opaco, y la respuesta viaja por `POST /api/canales/wa/mensajes`, que ya existe, como `payloadBoton`.
- **Modelo `HuecoVista` y consulta `panelHuecos`** (`GET /api/admin/huecos`, sin parámetros):
  - como máximo 50 huecos, del más reciente al más antiguo;
  - cada uno con servicio, sede, inicio, zona horaria, estado (`DETECTADO | OFRECIDO | ASIGNADO | DESIERTO`) y sus ofertas (estado, enviada, vence);
  - sin IDs ni datos de pacientes.
- **Documentación compartida**:
  - en `docs/contratos.md`, lo anterior y las claves de KPI de huecos que agregará el núcleo: `huecosLiberados`, `huecosRecuperados`, `horasRecursoRecuperadas` y `diasAdelantadosPromedio`;
  - en `AGENTS.md` §7, el evento, la sala y la consulta nuevos.
- **Adaptación mínima del frente B** para que `apps/web` siga compilando: el guion simulado devuelve `panelHuecos: []`.

### Fuera de alcance

- Lógica del núcleo y de la API (frente A, en su propio cambio): tablas y migración, la máquina de `ADELANTO`, la búsqueda de candidatos, la estrategia secuencial con vencimiento, la saga, la aprobación de la cancelación, la emisión de `wa:mensajes`, la semilla con el interés de Beto, las claves de KPI y los eventos del catálogo (`docs/eventos.md`).
- Pantallas (frente B, en su propio cambio): «Cancelar» en `/app`, mensajes salientes en `/wa` y el panel de huecos en `/admin`.
- Registrar el interés desde la interfaz, la oleada, los límites de ofertas por semana y el horario de silencio.
- Comandos nuevos: la aprobación y la aceptación usan `payloadBoton`, y la cancelación usa `CancelarCita`, que ya existe.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `contratos-canales`: «Tiempo real con nombres compartidos» agrega el evento `wa:mensajes` y la sala `wa:<waId>`.
- `contratos-consultas`: «Modelos de lectura compartidos» agrega `HuecoVista`; «Tabla de rutas de consulta» agrega `panelHuecos`.

## Impact

- Archivos compartidos: `packages/contracts/src/{tiempoReal.ts,consultas.ts,index.ts}`, `tests/unit/{contratos,consultas}.test.ts`, `docs/contratos.md` y `AGENTS.md` §7.
- Archivo del frente B: `apps/web/src/cliente/mock/guionFlujoA.ts`, solo la lectura vacía.
- Sin cambios en archivos del frente A: la consulta sin registrar responde 404 y el evento nuevo no lo emite nadie hasta su cambio.
- Sin dependencias nuevas.
- Riesgo de privacidad (sala por número): quien conozca un número de WhatsApp puede unirse a su sala y ver los mensajes salientes de ese número. Es el mismo modelo que WhatsApp real (el teléfono es factor de posesión, `PLAN.md` §8). Se acepta para la demo porque esos mensajes nunca llevan datos sensibles ni del otro paciente (§8 y §10.1), y los tokens de sus botones son de un solo uso.
- Coordinación: el cambio de predicción de riesgo del frente A (en curso) también tocará archivos compartidos. Conviene integrar uno y hacer rebase del otro.
- Responsable: cambio compartido. Requiere el visto bueno de un responsable de cada frente: `J3sus-esb` o `cgac05` por el frente A y `LuisMaster119` por el frente B. Propuesta: lo implementa el frente A, como `contratos-clinica-alertas`, incluida la lectura vacía en `apps/web`.
