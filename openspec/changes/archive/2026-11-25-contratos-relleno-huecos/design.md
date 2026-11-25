# Design

## Context

Ver `proposal.md` (Why). Estado en `main` `6c015ab`:

- **Contrato**:
  - `packages/contracts/src/tiempoReal.ts`: `EVENTOS_SOCKET` (5 eventos), `ESQUEMAS_EVENTOS_SOCKET` (`satisfies Record<NombreEventoSocket, ZodType>`) y `SalaSchema`, una unión de `admin` y plantillas con UUID v7.
  - `packages/contracts/src/consultas.ts`: `RUTAS_CONSULTAS` con 11 entradas; `tests/unit/consultas.test.ts` fija el conteo.
  - Las lecturas usan `z.object`, que descarta los campos desconocidos.
- **Núcleo**:
  - `CancelarCita` exige, para el actor `paciente`, vínculo más OTP o botón de aprobación (`politica.ts`, `cancelar`), y responde `STEP_UP_REQUERIDO`, que ya está en `CodigoErrorDominioSchema`.
  - `aceptarOfertaHueco` exige vínculo más token.
  - No hay tablas, eventos ni casos de uso de huecos.
- **API**:
  - El servidor de Socket.IO valida `sala:unirse` con `SalaSchema`, así que una sala nueva del contrato se acepta sin cambios.
  - `rutasConsultas.ts` registra cada consulta por nombre; una consulta sin registrar responde 404.
- **Web**: `LecturasCliente` exige un valor por consulta en el guion simulado. `ProveedorCliente` se suscribe a todos los `EVENTOS_SOCKET`, así que un evento nuevo solo provoca invalidaciones.

## Goals / Non-Goals

**Goals:** el mínimo de contrato para el Flujo C secuencial con aprobación por WhatsApp, sin comandos nuevos y sin romper `main`.

**Non-Goals:** el diseño del núcleo (tablas, saga, candidatos), las pantallas y el registro de interés desde la interfaz.

## Decisions

### D1. Un solo canal para lo que inicia la empresa
`wa:mensajes { waId, mensajes }` se emite a la sala `wa:<waId>`. Los mensajes son `MensajeBot`, así que `/wa` los pinta con el mismo componente que ya usa para las respuestas. Sus botones llevan como `payload` el token opaco de un solo uso que genera el núcleo, y el paciente responde con `POST /api/canales/wa/mensajes` y `payloadBoton`, de modo que la aprobación y la aceptación no necesitan comandos nuevos.
- Alternativa: una consulta de mensajes pendientes por número. Se descarta porque el número quedaría en la URL y porque la oferta debe llegar en menos de 5 s (§10.1), algo que el tiempo real ya resuelve.
- Alternativa: comandos `AprobarCancelacion` y `AceptarOferta`. Se descartan porque duplican lo que el token y `payloadBoton` ya expresan, y la política ya define `aceptarOfertaHueco` con token.
- El `waId` va en el dato para que el cliente sepa a qué historial agregar los mensajes. No revela nada que la sala no revele ya.

### D2. Sala por número de WhatsApp
`SalaSchema` gana `wa:<10–15 dígitos>`, con una regla `refine` o una expresión regular. El riesgo de privacidad está aceptado y descrito en la propuesta (Impact).
- **Pendiente de confirmar por el frente A:** si prefieren otro prefijo, por ejemplo `contacto:`.

### D3. `HuecoVista` sin pacientes
Lleva nombres de servicio y sede (como `CitaVista`), `inicio` en UTC con su `zonaHoraria` para mostrarlo en la zona de la sede, el estado del hueco y sus ofertas, con estado y fechas. Nada identifica a Ana ni a Beto, en línea con la regla de privacidad de §10.1: B nunca sabe quién canceló. `panelHuecos` devuelve como máximo 50, del más reciente al más antiguo; el orden lo garantiza el núcleo y la web no reordena.
- **Pendiente de confirmar por el frente A:** el límite de 50 y si quieren exponer también el canal de cada oferta.

### D4. KPIs como documentación, no como esquema
`MetricasVista.kpis` es un `record<string, number>`, así que las claves nuevas no cambian el esquema. Este cambio solo las documenta en `docs/contratos.md`; las implementa el núcleo en `consultas-api`. La web ya muestra las claves desconocidas con su nombre crudo, y les pondrá etiqueta en su cambio de pantallas.

### D5. Sin romper `main`
- `apps/web/src/cliente/mock/guionFlujoA.ts` devuelve `panelHuecos: []` en todos los pasos.
- `tests/unit/consultas.test.ts` pasa a esperar 12 consultas.
- No se toca ningún archivo del frente A: la consulta responde 404 y el evento no se emite hasta su cambio del núcleo.

## Risks / Trade-offs

- [Sala por número legible por terceros] → Riesgo aceptado para la demo (proposal, Impact); los mensajes no llevan datos sensibles y los tokens son de un solo uso.
- [El núcleo necesita más campos de los previstos, por ejemplo el texto exacto de la oferta] → El texto va dentro de `MensajeBot`, que ya es flexible. Cualquier campo nuevo de lectura vuelve a ser un cambio compartido.
- [Choque con el cambio de predicción del frente A en archivos compartidos] → Integrar uno primero y hacer rebase del otro.

## Migration Plan

Sin migración de datos (la del núcleo va en su cambio). Reversión: revertir el commit; todo es agregado.
