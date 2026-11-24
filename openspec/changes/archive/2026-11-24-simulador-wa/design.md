# Design

## Context

`apps/web/src/vistas/Wa.tsx` consulta `conversacion`, una lectura solo de demo que devuelve los mensajes del paso actual del guion, y envía con `useAccion`. `componentes/MensajeBot.tsx` muestra texto, botones y listas en línea, y un aviso para `flow`. En `/callcenter`, "Continuar por WhatsApp" envía un mensaje de demo (`payloadBoton: 'enviar-continuacion'`) que avanza el guion; la ficha ya trae `codigoContinuacion` (`CONTINUAR <token>`). El paso `VERIFICACION` del guion emite un `flow` con un campo `sensitive` genérico. El contrato `SolicitudMensajeWaSchema` acepta `texto`, `payloadBoton` o `flowResponse` (`record<string,string>`), y `waId` con 10–15 dígitos. Motivación: ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Que `/wa` funcione igual con el cliente simulado y con el real, usando solo el contrato de mensajes.
- Que el jurado pueda continuar en su celular con un enlace.
- Que ningún dato capturado en el Flow quede visible, guardado o registrado.

**Non-Goals:**
- Mensajes iniciados por la empresa sin acción del usuario (requieren un evento de tiempo real nuevo en el contrato).
- Lógica de negocio en la web: el simulador no decide qué preguntar; solo presenta lo que el bot envía.

## Decisions

### D1. Historial en un almacén del cliente
`cliente/historialWa.ts`: un almacén (un `Map<waId, EntradaHistorial[]>` con suscripción, expuesto con `useSyncExternalStore`) creado una vez por `ProveedorCliente`, que se hidrata y se escribe en `sessionStorage` con la llave `noki:wa:<waId>`. Solo se serializan entradas ya redactadas: el texto del usuario (salvo `CONTINUAR <código>`, que se guarda como `CONTINUAR ••••`), el título de la opción, el resumen enmascarado del Flow y los `MensajeBot` recibidos. La solicitud pendiente de reintento y los valores del Flow no se serializan nunca. Todo acceso a `sessionStorage` va en `try/catch`: si falla, el historial sigue en memoria. `EntradaHistorial = { id, origen: 'usuario' | 'bot', tipo: 'texto' | 'opcion' | 'flow-resumen' | 'mensaje-bot', texto?, mensaje?: MensajeBot }`. `useConversacionWa(waId)` devuelve el historial y `enviar(solicitud, resumen)`. `enviar` agrega primero la entrada del usuario (el texto, el título de la opción o el resumen enmascarado), llama a `cliente.enviarMensajeWa` y agrega cada `MensajeBot` de la respuesta. Ante un error, marca la entrada del usuario como fallida, con "Reintentar", que reutiliza la misma solicitud.
- "Nueva conversación" y el reinicio del guion (`cliente.demo.alCambiar` con el paso `INICIO`) vacían el número activo en memoria y en `sessionStorage`.
- Envío: cada entrada del usuario guarda un `idempotencyKey` (`crypto.randomUUID()`) que se pasa a `enviarMensajeWa(solicitud, { idempotencyKey })`; el reintento reutiliza la entrada y su clave. Mientras haya un envío en curso, `enviando` es verdadero: se deshabilitan la caja, los botones y la hoja de lista, y `ChatWa` muestra "escribiendo…". El bloqueo se activa de forma síncrona en el manejador del toque, antes del primer `await`, para que el doble toque no pase.
- `ClienteApi.enviarMensajeWa` acepta `{ idempotencyKey?: string }`, igual que `enviarComando`; `ClienteReal` lo usa en el encabezado y en su reintento automático de red.
- Se elimina `conversacion` de `ESQUEMAS_DEMO`, del guion y del mock (`lecturas.conversacion`). Las respuestas de WhatsApp del guion salen de los mensajes de cada paso.
- Alternativa: seguir con la consulta de demo. Descartada: no existe en la API real.

### D2. Enlace de continuación
- `Wa.tsx` lee `?continuar=` con `useSearchParams`. Si el código no está vacío y no se envió en esta sesión (un `Set` en memoria con los códigos ya enviados; no se guarda en almacenamiento), envía `CONTINUAR <código>` y reemplaza la URL por `/wa` con `navigate('/wa', { replace: true })`, que usa `history.replaceState`.
- `apps/web/index.html` declara `<meta name="referrer" content="no-referrer">` para toda la aplicación: en una SPA, una política por vista es frágil.
- `CallCenter.tsx`: "Continuar por WhatsApp" pasa a mostrar un enlace interno `/wa?continuar=<código>` y un QR de la URL absoluta (`location.origin` + la ruta), con `qrcode`. No envía nada. El código se toma de `ficha.codigoContinuacion` quitando el prefijo `CONTINUAR `.
- Mock: el paso `CONTINUAR_WA` deja de esperar el mensaje de demo del call center. La transición `COTIZADO → CONTINUAR_WA` se produce al recibir el texto `CONTINUAR <token>` (ya figura en `entradasWa`), y responde con los mensajes del paso del horario. Se elimina la acción `enviar-continuacion`.

### D3. Número de WhatsApp
Campo con `inputMode="numeric"`, validado con `SolicitudMensajeWaSchema.shape`, o con el patrón `^\d{10,15}$` si el esquema refinado no expone la forma, y `CONTACTO_DEMO` como valor inicial. El historial mostrado corresponde al número activo. El número no se guarda en almacenamiento persistente.

### D4. Presentación tipo WhatsApp
- `componentes/ChatWa.tsx`: lista de burbujas (`role="log"`, `aria-live="polite"`) con alineación usuario/bot y desplazamiento al último mensaje.
- Botones: solo el último mensaje del bot tiene opciones activas; los anteriores se muestran deshabilitados.
- Lista: botón con el texto del mensaje ("Ver opciones") que abre `HojaOpciones` (un `<dialog>` modal con las secciones y filas). Al elegir, envía `payloadBoton` y agrega al historial el título.
- `SiguientePregunta` ya no se usa en `/wa`: en WhatsApp la guía viaja en los mensajes. `EntradaPregunta` sigue para otras vistas, si alguna la usa.
- Caja de texto fija abajo en móvil, encima de la barra de demo, sin desplazamiento horizontal a 375 px.

### D5. Modal tipo Flow
- `componentes/ModalFlow.tsx` con `<dialog>` modal (foco atrapado y Escape nativos), título del Flow y un control por campo:
  - `texto` → `<input type="text">`.
  - `fecha` → `<input type="date">`.
  - `sensitive` → `<input type="password" autoComplete="off">`, con un botón de mostrar u ocultar que dura solo mientras el modal está abierto.
  - `passcode` → `<input type="password" inputMode="numeric" autoComplete="off">`, sin `valorInicial`.
- Los valores viven en estado local del modal. Al enviar se arma `flowResponse` (`{ [campo.id]: valor }`) y el resumen para el historial (`etiqueta ••••` por campo, sin longitud real). Al terminar con éxito o al cerrar, el estado se reinicia. En un error se conservan hasta que el usuario reintente o cierre.
- La solicitud con `flowResponse` no pasa por `useAccion` (evita que quede en el estado de mutación de TanStack Query): el almacén la envía directamente y solo conserva la solicitud mientras haya un reintento pendiente.
- No se escribe nada con `console.*`, coherente con la regla de logs sin datos personales.

### D6. Guion simulado
- `VERIFICACION` emite `flow` "Verificación de identidad" con `{ id: 'fechaNac', etiqueta: 'Fecha de nacimiento', captura: 'sensitive', requerido: true }`, seguido de un texto que indica abrir el formulario.
- El mock acepta el avance si el `flowResponse` trae valores no vacíos para todos los campos `requerido` del flow del paso; no compara valores ni los repite. Si falta alguno, responde con el texto de ayuda del paso.
- Después de la verificación, el paso siguiente ofrece el botón "Confirmar cita", como hoy.

### D7. Modo simulado visible y build de producción
- `Layout` muestra una insignia fija "Modo simulado" cuando `cliente.modo === 'mock'`, con texto y no solo color.
- `apps/web/vite.config.ts`: en `vite build` (modo `production`), si `VITE_API` no está definido en el entorno ni en los archivos `.env*` de la web, la configuración lanza un error que pide `VITE_API=mock` o `VITE_API=real`. En desarrollo y en las pruebas, el valor por defecto sigue siendo `mock`.
- Quien compila para la demo debe elegir el modo.

### D8. Pruebas
- Almacén: historial acumulado, hidratación desde `sessionStorage`, redacción de `CONTINUAR ••••`, error y reintento con la misma solicitud y la misma clave, "Nueva conversación" y reinicio del guion vacían `sessionStorage`, `Set` de códigos enviados, almacenamiento no disponible.
- `Wa`: enlace `?continuar=` envía una vez y limpia la URL; código vacío no envía; número inválido bloquea el envío; botones viejos deshabilitados; hoja de lista envía `payload`; modal Flow (envío, requerido vacío, Escape, valores descartados); resumen enmascarado sin valores en `document.body.textContent`.
- Privacidad: tras el recorrido, `localStorage` vacío y `sessionStorage` sin valores del Flow ni el código; espía sobre `console` sin llamadas que contengan los valores.
- Doble toque: dos clics síncronos en la misma opción producen un solo envío; "escribiendo…" aparece y desaparece.
- Modo simulado: insignia presente en `mock` y ausente en `real`; la función de configuración de Vite lanza el error en producción sin `VITE_API`.
- `index.html` contiene la política `no-referrer`.
- Mock: verificación con Flow completo e incompleto; continuidad por `CONTINUAR <código>`.
- `CallCenter`: muestra el enlace y su QR, y no envía nada al mostrarlo.
- Recorrido del Flujo A completo en `vistas.test.tsx` actualizado al nuevo camino (enlace de continuación y Flow).

## Risks / Trade-offs

- [Sin mensajes iniciados por la empresa] → El jurado abre el enlace o el QR del call center. Se documenta como límite; un cambio compartido futuro puede agregar un evento `wa:mensaje` al contrato.
- [`<dialog>` en `jsdom`] → `jsdom` no implementa `showModal` completo; las pruebas usan un *polyfill* mínimo o comprueban el atributo `open`, y la verificación de foco atrapado se hace en el navegador.
- [El historial en `sessionStorage` incluye nombre de pila, estudio y cita] → Solo en la sesión de esa pestaña y sin valores del Flow ni el código; "Nueva conversación" y el reinicio lo borran en equipos compartidos.
- [La build de producción exige `VITE_API`] → Quien despliega elige el modo de forma consciente; la insignia evita presentar el simulado como real.
- [El frente A debe respetar `Idempotency-Key` en el endpoint de WhatsApp] → Se le avisa al integrar; no cambia esquemas.
- [El código de continuación en la URL] → Es el token de un solo uso de `PLAN.md` §8; se retira de la URL tras usarlo y el núcleo lo invalida en el primer uso.

## Migration Plan

Rama `feat/simulador-wa` desde `main` `d8a8584`. Integrar con dictamen PASS y la autorización del frente B.
