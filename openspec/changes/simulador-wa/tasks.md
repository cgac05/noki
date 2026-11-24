# Tasks

Cada grupo es un punto de control: sus verificaciones deben quedar en verde y registradas en `implementacion.md` antes de empezar el siguiente. Escribir primero las pruebas de cada grupo y registrar su fallo.

## 1. Punto de control 1: historial en el cliente y guion

- [ ] 1.1 Crear `cliente/historialWa.ts` y `useConversacionWa` (design D1), conectados a `ProveedorCliente`, con `sessionStorage` redactado e `Idempotency-Key` por mensaje en `ClienteApi`, `ClienteMock` y `ClienteReal`; verificar con pruebas historial acumulado, hidratación tras recarga, "Código de continuación redactado", reintento con la misma solicitud y clave ("Clave por mensaje", "Clave en el reintento"), "Borrar el historial", vaciado al reiniciar el guion, registro de códigos enviados y almacenamiento no disponible.
- [ ] 1.2 Quitar `conversacion` del módulo de demo, del guion y del mock; adaptar el guion a la continuación por `CONTINUAR <código>` y a la verificación con Flow (design D2 y D6), y adaptar `Wa.tsx` lo mínimo para que siga compilando sobre el almacén; verificar "Continuidad simulada", "Verificación con Flow", "Flow incompleto", "Fuera del guion" y "Sin conversación de demo".
- [ ] 1.3 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 2. Punto de control 2: interfaz del simulador

- [ ] 2.1 Implementar `ChatWa`, el campo de número, la caja de texto, "Nueva conversación", el bloqueo síncrono y "escribiendo…" (design D1, D3–D4); verificar "Historial acumulado", "Cambio de vista y recarga", "Modo real" (con `fetch` simulado), "Número inválido", "Doble toque" e "Indicador de espera".
- [ ] 2.2 Implementar la insignia "Modo simulado" y el error de build de producción sin `VITE_API` (design D7), y agregar la política `no-referrer` a `index.html`; verificar "Insignia en modo simulado", "Sin insignia en modo real", "Producción sin modo explícito" y "Sin referer".
- [ ] 2.3 Implementar botones del último mensaje y `HojaOpciones` para listas; verificar "Elegir una fila de lista", "Opciones de mensajes anteriores" y "Mensaje de lista".
- [ ] 2.4 Implementar la continuación por enlace en `Wa.tsx` y el enlace con QR en `CallCenter.tsx` (design D2); verificar "Enlace del call center", "Sin reenvío", "Código inválido" y "Enlace de continuación en el call center".
- [ ] 2.5 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 3. Punto de control 3: modal tipo Flow y privacidad

- [ ] 3.1 Implementar `ModalFlow` (design D5); verificar "Envío del Flow", "Campo requerido vacío", "Accesibilidad del modal" (Escape en prueba; foco atrapado en navegador) y "Flow con modal".
- [ ] 3.2 Verificar "Resumen enmascarado", "Valores descartados" y "Solo almacenamiento de sesión", y que `console` no recibe valores capturados.
- [ ] 3.3 Actualizar el recorrido del Flujo A de `vistas.test.tsx` al camino nuevo (enlace de continuación → horario → Flow → confirmar → app → clínica) sin debilitar lo que comprueba.
- [ ] 3.4 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test && pnpm --filter @noki/web build` en verde; registrar en `implementacion.md`.

## 4. Punto de control 4: navegador y documentación

- [ ] 4.1 Con un servidor de la web recién iniciado (`--force`) en modo mock, recorrer el Flujo A a 375 × 812 y 1280 × 900: abrir `/wa` desde el enlace del call center, elegir horario, completar el Flow con el teclado (foco atrapado, Escape), confirmar y seguir a app y clínica; sin desplazamiento horizontal ni errores de consola, y sin valores capturados visibles. Guardar la evidencia en `openspec/changes/simulador-wa/evidencias/`, sin rutas locales.
- [ ] 4.2 Compilar con `VITE_API=real` y comprobar que `/wa` sin API muestra un error de red comprensible en el mensaje enviado, con "Reintentar".
- [ ] 4.3 Actualizar `apps/web/README.md`: uso del enlace de continuación, número de demo, Flow, historial en la sesión y "Nueva conversación", insignia de modo simulado, `VITE_API` obligatorio en producción y límite conocido de los mensajes iniciados por la empresa; quitar la conversación de la lista de tipos de demo.
- [ ] 4.4 Punto de control final: `pnpm install --frozen-lockfile && pnpm lint && pnpm lint:deps && pnpm test && pnpm --filter @noki/web build` en verde; registrar comandos y resultados en `implementacion.md`.
