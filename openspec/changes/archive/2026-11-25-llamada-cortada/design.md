# Diseño: llamada-cortada

- **D1. Cierre en Call Center.** Reutiliza `SolicitarContinuacion` (canal `callcenter`, actor `asesor:*`). La acción explícita del asesor al cerrar la llamada sustituye la casilla de consentimiento en este botón. «Continuar por WhatsApp» se conserva.
- **D2. Detección en WhatsApp.** Antes de retomar por vínculo, si la conversación no tiene trámite, buscar por el número normalizado los hilos cuyo contacto (ANI) tenga ese valor y, entre ellos, una continuación vigente sin usar (consulta análoga a `datosContinuacion`). Si existe, obtener su token como hace la ficha y llamar a `casos.retomar({ token, valorContacto: waId })`. El token sigue siendo de un solo uso.
- **D3. Mensaje.** Texto nuevo en `textosWa.ts`: aviso de llamada cortada y resumen de lo guardado; luego la siguiente pregunta, una por mensaje.
- **D4. Seguridad.** Solo retoma si el número de WhatsApp coincide exactamente con el ANI del hilo y hay una continuación vigente emitida por un asesor. Sin datos sensibles en claro.
