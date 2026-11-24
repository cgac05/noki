# Tasks

Cada grupo es un punto de control: sus verificaciones deben quedar en verde y registradas en `implementacion.md` antes de empezar el siguiente.

## 1. Punto de control 1: contrato de consultas

- [x] 1.1 Escribir primero `tests/unit/consultas.test.ts` con los escenarios de `contratos-consultas` (design D5) y registrar el fallo esperado antes de implementar.
- [x] 1.2 Crear `packages/contracts/src/consultas.ts` con los esquemas de design D1, la tabla `RUTAS_CONSULTAS`, `rutaConsulta` y los tipos derivados (design D2), y exportarlos desde `index.ts`; verificar que `tests/unit/consultas.test.ts` pasa y que `packages/contracts` sigue dependiendo solo de `zod`.
- [x] 1.3 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 2. Punto de control 2: cliente de la web sobre el contrato

- [x] 2.1 Renombrar `provisional.ts` a `demo.ts` y reducirlo según design D3; verificar "Sin duplicados del contrato" con una búsqueda registrada en `implementacion.md`.
- [x] 2.2 Adaptar `ClienteApi`, `ClienteMock`, el guion y `datosWeb.ts` a los nombres y parámetros del contrato, quitando las acciones prearmadas de los datos; verificar "Datos simulados con el contrato compartido".
- [x] 2.3 Adaptar `ClienteReal.consultar` a `rutaConsulta` y `RUTAS_CONSULTAS`; verificar con `fetch` simulado "Ruta de la tabla", "Bandeja fuera de demo" y "Lectura real mal formada".
- [x] 2.4 Adaptar `CallCenter`, `Clinica` y `Web` para armar los comandos a partir del dato elegido (design D3), y el resto de las vistas a los nombres y parámetros nuevos, porque sin esto 2.2 rompe la compilación de las vistas; verificar que compilan y que las pruebas de vistas existentes pasan.
- [x] 2.5 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test` en verde; registrar en `implementacion.md`.

## 3. Punto de control 3: vistas que arman comandos

- [x] 3.1 Agregar las pruebas de las vistas adaptadas en 2.4; verificar "Registrar llegada desde la cita" y "Selección de catálogo en call center".
- [x] 3.2 Verificar que el recorrido del Flujo A de `vistas.test.tsx` y la prueba de "Vistas sin acceso directo a la red" siguen pasando sin debilitar lo que comprueban.
- [x] 3.3 Recorrer el Flujo A en el navegador a 375 × 812 en modo mock, con un servidor de la web recién iniciado: mismo resultado que antes, precio $250.00, sin errores de consola. Registrar la evidencia en `openspec/changes/contratos-consultas/evidencias/`.
- [x] 3.4 Punto de control: `pnpm lint && pnpm lint:deps && pnpm test && pnpm --filter @noki/web build` en verde; registrar en `implementacion.md`.

## 4. Punto de control 4: documentación compartida y cierre

- [x] 4.1 Actualizar `docs/contratos.md` (sección `consultas.ts` y tabla de rutas), `AGENTS.md` §7 "Consultas" y el usuario `cgac05` de Christian Avila en `docs/trabajo-paralelo.md` (design D4); verificar que las rutas documentadas coinciden con `RUTAS_CONSULTAS` y que `/api/admin/embudo` y `/api/admin/huecos` siguen en §7 marcadas como pendientes.
- [x] 4.2 Actualizar `apps/web/README.md`: ya no hay tipos provisionales; listar los tipos de demo que quedan.
- [x] 4.3 Punto de control final: `pnpm install --frozen-lockfile && pnpm lint && pnpm lint:deps && pnpm test && pnpm test:integracion && pnpm --filter @noki/web build` en verde; registrar comandos y resultados en `implementacion.md`.
