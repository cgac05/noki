# Proposal

## Why

`/wa` es la vista que el jurado opera desde su celular en el paso 2 del Flujo A (`PLAN.md` §12): "abre `/wa` con el token, el sistema retoma en el horario, verifica (modal enmascarado) y confirma". Hoy `/wa` muestra solo los últimos mensajes del bot, sin historial, el modal tipo Flow es un aviso sin campos, y la conversación sale de una consulta que solo existe en modo simulado (`conversacion`), así que con la API real `/wa` no funciona. Este cambio lo convierte en un simulador de WhatsApp usable de verdad, en modo simulado y en modo real, sin tocar contratos.

## What Changes

- **Historial en el cliente.** La conversación se arma en la web con lo que el usuario envía y lo que devuelve `POST /api/canales/wa/mensajes`, igual que un webhook real. Se elimina la consulta de demo `conversacion`. El historial se guarda por número de WhatsApp en `sessionStorage`, solo con burbujas ya redactadas: sobrevive a la recarga y a que el navegador móvil descarte la pestaña, y se borra al cerrarla, con "Nueva conversación" o al reiniciar el guion.
- **Entrada por enlace de continuación.** `/wa?continuar=<código>` envía una sola vez `CONTINUAR <código>` al abrir la vista. En `/callcenter`, "Continuar por WhatsApp" muestra ese enlace (y su QR) en lugar de un botón que avanzaba el guion por su cuenta. Así el jurado puede continuar en su propio celular cuando haya API real.
- **Sin envíos dobles.** Los controles se deshabilitan al primer toque, se muestra "escribiendo…" mientras llega la respuesta y cada mensaje lleva su propio `Idempotency-Key`, reutilizado en sus reintentos.
- **Modo simulado visible.** Insignia "Modo simulado" en todas las vistas cuando `VITE_API=mock`. El simulado sigue siendo el valor por defecto en desarrollo, pero la build de producción falla si `VITE_API` no está definido explícitamente.
- **Código fuera de la URL.** Tras usarlo, se retira con `history.replaceState`; la aplicación declara `Referrer-Policy: no-referrer`, y en el historial queda `CONTINUAR ••••`.
- **Número de WhatsApp de demo.** Un campo para elegir el número (por defecto, el de la paciente Ana de `AGENTS.md` §10), validado con el contrato.
- **Interfaz tipo WhatsApp, móvil primero:** burbujas del usuario y del bot, botones (hasta 3) bajo el mensaje y listas que se abren en una hoja de opciones con sus secciones.
- **Modal tipo Flow real.** Un mensaje `flow` muestra un botón que abre un modal con sus campos: `texto`, `fecha`, `sensitive` (enmascarado) y `passcode` (PIN, sin valor inicial). Envía `flowResponse` y en el historial queda solo un resumen enmascarado, nunca los valores.
- **Privacidad:** los valores del Flow nunca se guardan en el historial, `sessionStorage`, `localStorage` ni la consola, y se descartan al terminar el envío o al cerrar el modal.
- **Guion simulado:** la continuación se dispara con el mensaje `CONTINUAR <código>`, y el paso de verificación pide un Flow con la fecha de nacimiento (`sensitive`). El simulado solo comprueba que lleguen los campos requeridos; no valida identidad ni repite valores.

Fuera de alcance: plantillas enviadas por la empresa sin acción del usuario (requieren un evento de tiempo real que no está en el contrato); ofertas de hueco, recordatorios, turno en vivo, devolución de llamada y factura; búsqueda difusa y ubicación (son del núcleo); la lista de trámites abiertos como lógica propia de la web (se muestra cuando el bot la envía como mensaje de lista); WhatsApp Cloud API real; cambios a `@noki/contracts`.

## Capabilities

### New Capabilities
- `simulador-whatsapp`: conversación con historial, entrada por enlace de continuación, interfaz de botones y listas, y modal tipo Flow con captura protegida.

### Modified Capabilities
- `navegacion-canales`: el contenido mínimo de `/wa` pasa de "aviso de Flow" a simulador con Flow real.
- `cliente-api-canales`: la continuidad del guion simulado llega por el mensaje `CONTINUAR <código>`, y la conversación deja de ser un tipo de demo.

## Impact

- Solo `apps/web` (frente B). No toca archivos compartidos ni contratos, así que basta la autorización del responsable del frente B.
- Dependencias nuevas: ninguna; el QR del enlace reutiliza `qrcode`.
- Contratos: este cambio **no modifica `packages/contracts`**. El delta de `cliente-api-canales` solo describe cómo la web usa los contratos existentes.
- Frente A: ninguno ahora. En la integración, `POST /api/canales/wa/mensajes` debe aceptar `CONTINUAR <código>`, `flowResponse` y el encabezado `Idempotency-Key` por mensaje (`AGENTS.md` §7 lo exige para comandos; aquí se extiende a WhatsApp como comportamiento, sin cambiar esquemas).
- Los mensajes iniciados por la empresa se proponen aparte en el cambio compartido `mensajes-salientes`.
- Riesgo: hasta que exista `mensajes-salientes`, el jurado abre el enlace o escribe; se documenta como límite conocido.
- Privacidad: las burbujas del bot pueden incluir nombre de pila, estudio, sede y fecha de la cita; se guardan solo en la sesión de esa pestaña. En equipos compartidos se usa "Nueva conversación" o "Reiniciar guion".
