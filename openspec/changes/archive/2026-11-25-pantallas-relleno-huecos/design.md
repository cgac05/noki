# Design

## Context

Ver `proposal.md` (Why). Estado actual de `apps/web` que condiciona el enfoque:

- `ClienteMock` recorre un solo guion lineal (`GUION_FLUJO_A`): cada paso espera un comando o un mensaje de WhatsApp exacto, entrega lecturas fijas y emite sus `eventosSocket` a todos los oyentes. `unirse` no hace nada en modo simulado. `PasoGuionSchema` enumera los IDs de paso del Flujo A.
- `HistorialWa` guarda por número, en `sessionStorage`, lo que el usuario envía y lo que el bot responde a `POST /api/canales/wa/mensajes`. No tiene forma de recibir mensajes que inicia la empresa.
- `ProveedorCliente` invalida todas las lecturas al llegar cualquier evento de `EVENTOS_SOCKET` (modo real) o al cambiar el guion (modo simulado). Por eso `wa:mensajes` y los eventos de `admin` ya refrescan las lecturas sin trabajo extra.
- `useAccion` envía comandos con clave de idempotencia y reintenta con la misma clave. `/app` aún no envía comandos.
- Contrato disponible (sin cambios): `CancelarCita` (`payload.motivo` opcional), `payloadBoton`, `MensajeBot`, `wa:mensajes`, `wa:<waId>`, `HuecoVista`, `panelHuecos`. Beto es `5210000000002` y Carla `5210000000003` en la semilla del frente A (`relleno-huecos`, revisión 2), que también incluye la oleada: Carla puede recibir ofertas y `OfertaPerdida`.

## Goals / Non-Goals

**Goals:**
- Que el Flujo C se pueda ensayar completo en modo simulado, y que pasar a `VITE_API=real` no requiera cambiar las vistas.
- Que las vistas solo muestren lo que llega: ningún texto de oferta, estado ni orden se decide en la web.

**Non-Goals:**
- Registrar el interés de adelanto desde la interfaz, la oleada, la baja con un toque y el horario de silencio (fuera de alcance del relleno de huecos, ver `contratos-relleno-huecos`).
- Recuperar mensajes de `wa:mensajes` emitidos con la pestaña cerrada: no hay reenvío en el contrato.
- Reprogramar desde `/app` y el recordatorio `T48` como disparadores.

## Decisions

### D1. Los mensajes que inicia la empresa entran a `HistorialWa`
`HistorialWa` gana un método para agregar mensajes del bot a un número, con la misma redacción y proyección a `sessionStorage` que las respuestas, y un registro de los números de la sesión: los tres números de demo (Ana, Beto y Carla) más cualquiera con el que se converse. Así los botones, las listas, la regla de «solo el último mensaje del bot tiene botones activos» y la persistencia funcionan sin cambios en `ChatWa`.
- Alternativa descartada: un estado aparte en `/wa` para los mensajes empujados. Duplicaría la lógica de botones y se perdería al cambiar de vista.

### D2. Escucha a nivel de aplicación, no de vista
Un componente o efecto dentro de `ProveedorCliente` se une a `wa:<waId>` de cada número de la sesión y se suscribe a `wa:mensajes`, filtrando por `waId` del dato. Debe vivir fuera de `/wa` porque en el Flujo C la solicitud de aprobación llega mientras Ana está en `/app`, y la oferta llega a Beto mientras se ve el número de Ana. En modo simulado `unirse` sigue sin efecto y el filtro por `waId` hace el trabajo. Los números de demo son constantes de la web, junto a `CONTACTO_DEMO`.
- Alternativa descartada: unirse solo al número visible en `/wa`. Pierde los dos mensajes clave del Flujo C en modo real.
- Riesgo de privacidad: el mismo que ya se aceptó en el contrato (sala por número, `proposal.md` de `contratos-relleno-huecos`); la web no agrega datos.

### D3. Aviso de mensajes en otro número
`HistorialWa` marca como «con mensajes nuevos» un número de la sesión que recibe mensajes sin estar visible, y lo desmarca al mostrarlo. `/wa` muestra un aviso con un botón por número marcado que cambia el número del simulador. No hay contador ni notificación fuera de `/wa`.

### D4. `/app` cancela con `useAccion` y trata el 403 como «pendiente»
El botón «Cancelar cita» abre una confirmación en línea (sin modal nuevo); al confirmar, `useAccion` envía `CancelarCita` con `canal: 'app'`, `actor: 'paciente'`, `tramiteId` de la cita y `payload: {}`. Según D6 de `relleno-huecos`, la API responde 403 `STEP_UP_REQUERIDO` (con `BOTON_APROBACION`) mientras espera la aprobación, sin cambiar el trámite, y manda la solicitud al WhatsApp vinculado de Ana. `ClienteReal` ya convierte ese 403 en `ErrorCliente` con `codigo`; la vista reconoce `STEP_UP_REQUERIDO` y muestra «pendiente de aprobar en WhatsApp» en lugar del error. Al aprobar, la API emite `tramite:actualizado` y `/app` vuelve a leer las citas, que ya llegan `CANCELADA`. Volver a pulsar «Cancelar cita» es una acción nueva con clave nueva (si se reusara la clave, la idempotencia devolvería el 403 guardado y no reenviaría el mensaje, D1 de `relleno-huecos`); «Reintentar» tras un fallo de red conserva la clave. La confirmación y el resultado viven por cita, con la llave del trámite.

### D5. Segundo guion seleccionable en `ClienteMock`
`ClienteMock` recibe un conjunto de guiones (`flujoA`, `flujoC`) y un guion activo. `demo` gana `guion()` y `elegirGuion(id)`, que reinicia como `reiniciar()` (sube `revision`, vacía el historial a través del aviso que ya escucha `ProveedorCliente`). `BarraDemo` muestra un selector «Flujo A / Flujo C» junto al paso. El tipo `PasoFixture` y la lógica de espera se reutilizan; `PasoGuionSchema` amplía sus IDs con los del Flujo C. Cada paso puede declarar eventos `wa:mensajes` en `eventosSocket`, que ya se validan con el contrato. `demo.ids` depende del guion activo.
- Un paso puede declarar que su comando se rechaza con un error de API (`codigo` y mensaje) en lugar de una respuesta; `ClienteMock` lanza `ErrorCliente('API', mensaje, codigo)` y aun así avanza y emite los eventos del paso. Así el mock se comporta como la API en `CancelarCita`.
- Pasos del Flujo C, con los textos y botones de D6 de `relleno-huecos`: `C_INICIO` (cita de Ana `CONFIRMADA`, panel vacío) → `C_APROBACION_PEDIDA` (espera `CancelarCita`; lo rechaza con `STEP_UP_REQUERIDO`; emite `wa:mensajes` a Ana: «¿Confirmas que quieres cancelar tu cita de {servicio} en {sede} del {fecha y hora}?» con «Sí, cancelar» y «No, conservarla») → `C_CANCELADA` (espera «Sí, cancelar» de Ana; responde «Tu cita quedó cancelada.»; cita `CANCELADA`; emite `tramite:actualizado` y `wa:mensajes` a Beto: «Se liberó un espacio para {servicio} en {sede} el {fecha y hora locales}. ¿Quieres adelantar tu cita?» con «Sí, adelantar» y «No, gracias»; panel con hueco `OFRECIDO`) → `C_ADELANTADA` (espera «Sí, adelantar» de Beto; responde «Listo, tu cita quedó el {fecha y hora}.»; panel con el hueco `ASIGNADO` y, antes, el horario anterior de Beto `OFRECIDO`; emite `wa:mensajes` a Carla con la oferta de ese horario; KPI actualizados). Carla no necesita responder en el guion.
- Alternativa descartada: añadir el Flujo C al final del Flujo A. La cita de Ana termina `ATENDIDA` y no se puede cancelar; además alarga cada ensayo del Flujo A.

### D6. Panel de huecos en `/admin`
Sección propia con `useConsulta('panelHuecos', {})`, con sus estados de carga, vacío y error independientes de las métricas. Etiquetas en español para los estados de hueco y oferta en un mapa local, como `ETIQUETAS_KPI`; la fecha con `fechaEnSede` y las horas de oferta con el formato de horas del tablero. La clave de cada oferta es su posición, porque el contrato no le da ID. `ETIQUETAS_KPI` gana las cuatro claves de huecos.

## Risks / Trade-offs

- [El frente A cambia otra vez los textos] → Las vistas muestran lo que llega; solo cambian los datos de `guionFlujoC.ts`.
- [La API reenvía las ofertas vigentes cada vez que la pestaña se une a `wa:<waId>`] → Un mensaje igual al último del bot lo reemplaza en vez de duplicarse (requisito de `simulador-whatsapp`).
- [Los botones de WhatsApp solo funcionan con `DEMO_MODE=true` (D13 de `relleno-huecos`)] → La prueba en modo real (5.2) se corre con la API en `DEMO_MODE=true`; fuera de él, `/app` sigue mostrando «pendiente» y no llega ningún mensaje, que es lo esperado.
- [El núcleo no emite ningún evento de `admin` al cambiar un hueco] → El panel no se refrescaría en vivo en modo real. Dependencia anotada para el frente A: el criterio de `PLAN.md` §10.1 pide panel y KPI en vivo, y `admin:metricas` cambia con los KPI de huecos.
- [Mensajes perdidos con la pestaña cerrada o antes de unirse a la sala] → Aceptado para la demo; se documenta en la guía de la demo que `/wa` debe estar abierta en alguna pestaña. Sin reenvío en el contrato.
- [Dos pestañas abiertas reciben el mismo mensaje] → Cada pestaña tiene su `sessionStorage`; se ve en ambas, sin duplicarse dentro de una.
- [Selector de guion en la barra de demo agrega un control a todas las vistas] → Solo aparece en modo simulado, como el paso y «Reiniciar guion».

## Migration Plan

Sin migración. La rama sale de `feat/contratos-relleno-huecos` y se rebasa sobre `main` cuando esa rama se integre; después, sobre `main` cada vez que el frente A integre. Rollback: revertir el commit; nada fuera de `apps/web` cambia.

## Open Questions

Ninguna. Las cuatro preguntas al frente A se resolvieron con `relleno-huecos` revisión 3 (rama `claude/project-thread-nqfp68`, `c7650ad`): textos y botones en su D6; `CancelarCita` en espera responde 403 `STEP_UP_REQUERIDO` (D4 de aquí); la aprobación vence en 10 minutos (su D1) y la oferta sigue `PLAN.md` §10.1; las ofertas llegan en orden de `enviada_en` (su D10).
