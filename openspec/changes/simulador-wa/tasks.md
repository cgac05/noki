# Tasks

Cada grupo es un punto de control: sus verificaciones deben quedar en verde y registradas en `implementacion.md` antes de empezar el siguiente. Escribir primero las pruebas de cada grupo y registrar su fallo.

## 1. Punto de control 1: historial en el cliente y guion

- [x] 1.1 Crear `cliente/historialWa.ts` y `useConversacionWa` (design D1), conectados a `ProveedorCliente`, con `sessionStorage` redactado e `Idempotency-Key` por mensaje en `ClienteApi`, `ClienteMock` y `ClienteReal`; verificar con pruebas historial acumulado, hidratación tras recarga, "Código de continuación redactado", reintento con la misma solicitud y clave ("Clave por mensaje", "Clave en el reintento"), "Borrar el historial", vaciado al reiniciar el guion, registro de códigos enviados y almacenamiento no disponible.
- [x] 1.2 Quitar `conversacion` del módulo de demo, del guion y del mock, y adaptar `Wa.tsx` lo mínimo para mostrar el historial del almacén. Sin cambiar todavía las transiciones del guion: el botón de demo "Continuar por WhatsApp" de `/callcenter` envía su mensaje a través del almacén del número de demo (provisional hasta 2.4), para que `/wa` muestre la respuesta. Actualizar el recorrido del Flujo A de `vistas.test.tsx` a este camino sin debilitar lo que comprueba; verificar "Sin conversación de demo", "Fuera del guion" y el recorrido.
- [x] 1.3 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 2. Punto de control 2: interfaz del simulador

- [x] 2.1 Implementar `ChatWa`, el campo de número, la caja de texto, "Nueva conversación", el bloqueo síncrono y "escribiendo…" (design D1, D3–D4); verificar "Historial acumulado", "Cambio de vista y recarga", "Modo real" (con `fetch` simulado), "Número inválido", "Doble toque" e "Indicador de espera".
- [x] 2.2 Implementar la insignia "Modo simulado" y el error de build de producción sin `VITE_API` (design D7), y agregar la política `no-referrer` a `index.html`; verificar "Insignia en modo simulado", "Sin insignia en modo real", "Producción sin modo explícito" y "Sin referer".
- [x] 2.3 Implementar botones del último mensaje y `HojaOpciones` para listas; verificar "Elegir una fila de lista", "Opciones de mensajes anteriores" y "Mensaje de lista".
- [x] 2.4 Implementar la continuación por enlace en `Wa.tsx`, el enlace con QR en `CallCenter.tsx` y, en el guion, la continuación por el texto `CONTINUAR <código>` en lugar del mensaje de demo provisional de 1.2 (design D2); actualizar el recorrido del Flujo A al enlace de continuación; verificar "Enlace del call center", "Sin reenvío", "Código inválido", "Enlace de continuación en el call center", "Continuidad simulada" y el recorrido.
- [x] 2.5 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 3. Punto de control 3: modal tipo Flow y privacidad

- [x] 3.1 Implementar `ModalFlow` (design D5) y, en el guion, la verificación con Flow (design D6); actualizar el recorrido del Flujo A para completar el Flow; verificar "Envío del Flow", "Campo requerido vacío", "Accesibilidad del modal" (Escape en prueba; foco atrapado en navegador), "Flow con modal", "Verificación con Flow", "Flow incompleto" y el recorrido.
- [x] 3.2 Verificar "Resumen enmascarado", "Valores descartados" y "Solo almacenamiento de sesión", y que `console` no recibe valores capturados.
- [x] 3.3 Comprobar que el recorrido final del Flujo A de `vistas.test.tsx` sigue el camino completo (enlace de continuación → horario → Flow → confirmar → app → clínica) y conserva todo lo que comprobaba antes del cambio.
- [x] 3.4 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test && pnpm --filter @noki/web build` en verde; registrar en `implementacion.md`.

## 4. Punto de control 4: navegador y documentación

- [x] 4.1 Con un servidor de la web recién iniciado (`--force`) en modo mock, recorrer el Flujo A a 375 × 812 y 1280 × 900: abrir `/wa` desde el enlace del call center, elegir horario, completar el Flow con el teclado (foco atrapado, Escape), confirmar y seguir a app y clínica; sin desplazamiento horizontal ni errores de consola, y sin valores capturados visibles. Guardar la evidencia en `openspec/changes/simulador-wa/evidencias/`, sin rutas locales.
- [x] 4.2 Compilar con `VITE_API=real` y comprobar que `/wa` sin API muestra un error de red comprensible en el mensaje enviado, con "Reintentar".
- [x] 4.3 Actualizar `apps/web/README.md`: uso del enlace de continuación, número de demo, Flow, historial en la sesión y "Nueva conversación", insignia de modo simulado, `VITE_API` obligatorio en producción y límite conocido de los mensajes iniciados por la empresa; quitar la conversación de la lista de tipos de demo.
- [x] 4.4 Punto de control final: `pnpm install --frozen-lockfile && pnpm lint && pnpm lint:deps && pnpm test && pnpm --filter @noki/web build` en verde; registrar comandos y resultados en `implementacion.md`.
