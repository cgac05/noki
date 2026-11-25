# Tasks

Requisitos: CI = `consolas-internas`, CA = `cliente-api-canales`. Decisiones: D1–D6 de `design.md`. Cada grupo escribe primero sus pruebas y conserva el fallo previo en `evidencias/0N-rojo.txt`.

## 1. Identificación del asesor en el call center

- [x] 1.1 Escribir las pruebas en rojo del armado del payload (D2) con las pistas reales del dominio de cada paso (`DESTINATARIO`, `CONFIRMAR` con candidato y con `NINGUNO`, `FECHA_NAC`, `CURP` con valor y con `SIN_CURP`, `DATOS` con y sin CURP pendiente, `REINICIAR`), más:
  - omisión de opcionales vacíos y mayúsculas en `curp`, `sexo` y `entidadNacimiento`;
  - CURP mal formada devuelta como id de campo sin valor;
  - paso u opción desconocidos rechazados sin envío.

  Verificar: `pnpm exec vitest run --project web <archivo>` falla por el módulo ausente; `evidencias/01-rojo.txt`.
- [x] 1.2 Implementar `cliente/identificacion.ts` (D2) y el hook `useIdentificacion` (D3). Verificar: las pruebas de 1.1 pasan, más pruebas del hook:
  - una sola petición con doble clic;
  - reintento con la misma clave y los mismos valores;
  - `recordar` de la respuesta;
  - pendiente borrado al cancelar o desmontar;
  - nada en la `MutationCache`.
- [x] 1.3 Agregar a `ModalFlow` la prop opcional `validar` (D4). Verificar: prueba de campo marcado sin envío y sin valor en el DOM fuera del campo; `flow.test.tsx` y `wa.test.tsx` siguen pasando sin cambios en sus aserciones.
- [x] 1.4 Escribir en rojo y después implementar la sección en `CallCenter.tsx` (D1, D4, D5), con `ClienteReal` y `fetch` falso, para CI «Identificación opcional del paciente en el call center» y «Datos de identificación protegidos en la consola». Verificar sus escenarios:
  - destinatario, «No soy ninguno», candidato opaco;
  - fecha en el modal, sin CURP, formato inválido;
  - identificación omitida con cotización;
  - error `IDENTIFICACION_BLOQUEADA` con reiniciar;
  - sin pregunta de paciente y solo lectura;
  - privacidad: espía de las cinco funciones de `console`, de `localStorage`, de `sessionStorage`, de la URL y de la `MutationCache`;
  - cancelar descarta.
- [x] 1.5 Punto de control: `pnpm lint`, `pnpm lint:deps` y `pnpm test` con código 0, en orden y con corte ante fallo; `evidencias/01-{lint,deps,test}.txt`.

## 2. Guion simulado con identificación en WhatsApp

- [x] 2.1 Escribir las pruebas en rojo del guion (D6), para CA «Guion simulado del Flujo A»: «Identificación por pasos en WhatsApp», «Opciones fuera del guion» y «Verificación con Flow» (`IdentidadComprobada`, sin repetir la fecha). Además:
  - cada respuesta lleva `paciente` con su `paso` y cumple `RespuestaComandoSchema`;
  - el call center sigue sin pedir `paciente`.

  Verificar: fallan por lo ausente; `evidencias/02-rojo.txt`.
- [x] 2.2 Implementar los pasos en `cliente/mock/guionFlujoA.ts` con versiones y eventos consecutivos (13 pasos). Actualizar `guionWa.test.ts`, `cliente.test.ts` y los recorridos de `vistas.test.tsx`, `wa.test.tsx` y `flow.test.tsx` para que pasen por destinatario, confirmación y fecha. Verificar: pruebas en verde y la fecha ausente del DOM y de `sessionStorage` al terminar.
- [x] 2.3 Actualizar `apps/web/README.md`: identificación del asesor (solo con respuesta de comando en la pestaña), pasos nuevos del guion y que en simulado el call center no identifica. Verificar: revisión del texto frente a D1, D5 y D6.
- [x] 2.4 Punto de control: `pnpm lint`, `pnpm lint:deps` y `pnpm test` con código 0; `evidencias/02-{lint,deps,test}.txt`.

## 3. Verificación integrada

- [x] 3.1 Recorrido manual en navegador del Flujo A simulado a 375 px y 1280 px: llamada → cotizar → continuación → `/wa` → horario → «Para mí» → «Soy Ana P.» → fecha en el Flow → confirmar → `/app` → `/clinica` → `/admin` con `DestinatarioDeclarado` e `IdentidadComprobada` en la línea de tiempo. Verificar: capturas `evidencias/03-*.jpg` de cada vista a ambos anchos y JSON del recorrido, sin desplazamiento horizontal y sin la fecha en pantalla fuera del campo.
- [x] 3.2 Compilaciones: `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` y `VITE_API=mock pnpm --filter @noki/web build` con código 0; `evidencias/03-build-{real,mock}.txt`. El recorrido real de la identificación del asesor queda BLOQUEADO hasta que `api-comandos` esté en `main`: registrarlo así en `implementacion.md`.
- [x] 3.3 Control final sobre la rama rebasada en `main` vigente: `pnpm lint`, `pnpm lint:deps`, `pnpm test` y `pnpm test:integracion` con código 0. Verificar: `evidencias/03-{lint,deps,test,integracion}.txt` y el manifiesto `evidencias/03-archivos-entregados.json`, sin cambios fuera de `apps/web/**` y la carpeta del cambio.
