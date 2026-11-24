# Tasks

Cada grupo es un punto de control: sus verificaciones deben quedar en verde y registradas en `implementacion.md` antes de empezar el siguiente.

## 1. Punto de control 1: dependencias, enrutamiento y pruebas de la web

- [x] 1.1 Agregar a `apps/web` `react-router`, `@tanstack/react-query`, `qrcode` (y sus tipos) y, de desarrollo, `jsdom`, `@testing-library/react`, `@testing-library/user-event`; verificar que `pnpm install --frozen-lockfile` funciona tras actualizar el lockfile y que `pnpm lint:deps` sigue en verde.
- [x] 1.2 **Archivo compartido (requiere a ambos responsables):** agregar el proyecto `web` a `vitest.config.ts` y cambiar el script `test` de la raíz según design D8; verificar que `pnpm test` ejecuta los proyectos `unitarios` y `web` y que una prueba vacía de la web pasa.
- [x] 1.3 Crear `rutas.tsx`, `Layout`, `BarraDemo` (sin guion todavía), las vistas vacías de las siete rutas, la portada (reutilizando el contenido actual de `App.tsx`) y `NoEncontrado`; verificar con pruebas "Cada ruta renderiza" (solo títulos) y "Ruta desconocida".
- [x] 1.4 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` y `pnpm --filter @noki/web build` en verde; registrar en `implementacion.md`.

## 2. Punto de control 2: cliente de API

- [x] 2.1 Definir `ClienteApi`, `ErrorCliente`, `crearCliente` y `ProveedorCliente` (design D2–D3); verificar con pruebas "Valor inválido" y que el modo por defecto es `mock`.
- [x] 2.2 Definir `provisional.ts` (design D6) y los datos de `/web`; verificar "Módulo provisional único" y "Sin datos sensibles provisionales" con una prueba sobre los esquemas.
- [x] 2.3 Escribir `guionFlujoA.ts` e implementar `ClienteMock` (design D5); verificar con pruebas "Datos simulados válidos", "Continuidad simulada", "Eventos de tiempo real", "Reinicio del guion" y "Fuera del guion".
- [x] 2.4 Implementar `ClienteReal` (design D4) con `fetch` simulado en pruebas; verificar "Encabezado de idempotencia", "Reintento conserva la clave", "Conflicto de versión", "Respuesta real mal formada" y "Comandos validados antes de enviarse".
- [x] 2.5 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 3. Punto de control 3: vistas con contenido mínimo

- [x] 3.1 Implementar `MensajeBot`, `LineaTiempo`, `EstadoCarga` y `EstadoError`; verificar con pruebas "Mensaje de lista", "Flow fuera de alcance" e "Interfaz guiada por la siguiente pregunta".
- [x] 3.2 Implementar `/callcenter` y `/wa` con el guion; verificar con prueba "Ficha del call center" (teléfono enmascarado, sin fecha de nacimiento) y el recorrido call center → WhatsApp.
- [x] 3.3 Implementar `/app` (citas y QR) y `/clinica` (llegadas y registro); verificar "QR con token, no con folio" y "Estado desde el cliente".
- [x] 3.4 Implementar `/admin`, `/bandeja` y `/web`; verificar "Línea de tiempo con canales" y que `/web` muestra el código de continuación.
- [x] 3.5 Conectar `BarraDemo` con `demo` del cliente; verificar "Cambio de canal conserva el estado", "Paso actual visible" y "Estados de carga y error".
- [x] 3.6 Agregar la prueba que inspecciona `vistas/` y `componentes/` y falla si encuentra `fetch` o `socket.io` ("Vistas sin acceso directo a la red").
- [x] 3.7 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 4. Punto de control 4: verificación en navegador y documentación

- [x] 4.1 Con `pnpm dev` y `VITE_API=mock`, recorrer el Flujo A completo en 375 × 812 y 1280 × 900: sin desplazamiento horizontal, sin errores de consola, foco visible al usar Tab y recarga directa en `/wa`; registrar capturas o un informe sin datos personales en `evidencias/`. Ref: "Celular del jurado", "Escritorio", "Navegación con teclado", "Enlace directo".
- [x] 4.2 Compilar con `VITE_API=real pnpm --filter @noki/web build` sin tocar vistas y comprobar que, sin API levantada, las vistas muestran un error de red comprensible. Ref: "Cambio de modo sin tocar vistas".
- [x] 4.3 Documentar en `apps/web/README.md` los modos `VITE_API`/`VITE_API_URL`, el guion del Flujo A paso a paso y la lista de tipos provisionales pendientes de `contratos-consultas`; verificar siguiendo el documento.
- [x] 4.4 Punto de control final: `pnpm install --frozen-lockfile && pnpm lint && pnpm lint:deps && pnpm test && pnpm --filter @noki/web build` en verde; registrar comandos y resultados en `implementacion.md`.
