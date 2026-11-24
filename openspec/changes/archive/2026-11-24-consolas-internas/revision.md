# Revisión: consolas-internas

- Dictamen: PASS
- Revisión inspeccionada: rama `feat/consolas-internas` rebasada sobre `main` `91de578` (incluye `identidad-paciente`), con el diff sin commit entregado por Codex (`implementacion.md`, manifiesto `evidencias/04-archivos-entregados.json`). Revisado el 2026-11-24.
- Cobertura:
  - Requisitos y escenarios de `specs/consolas-internas` (6 requisitos).
  - Deltas de `cliente-api-canales` ("Tiempo real con salas", "Contexto de consulta en modo real", "Guion simulado del Flujo A") y de `navegacion-canales` ("Contenido mínimo por vista").
  - Design D1–D9 y tareas 1.1–4.3.
  - Archivos: `cliente/{ClienteApi.ts,real/ClienteReal.ts,mock/ClienteMock.ts,mock/guionFlujoA.ts,ProveedorCliente.tsx,useAccion.ts,useSala.ts,demo.ts}`, `componentes/EstadoContexto.tsx`, `vistas/{CallCenter,Clinica,Admin,App}.tsx`, `styles.css` (por encima), `README.md`, `package.json`, `pnpm-lock.yaml` (por encima) y las pruebas nuevas o modificadas.
- Autorización y alcance:
  - Los hashes de `proposal.md`, `design.md` y los tres specs coinciden con la revisión 1 autorizada.
  - `tasks.md` (`77823b2ececc`) difiere solo por las casillas marcadas: al desmarcarlas da `705ab6737061`, el hash autorizado.
  - Cambios solo en `apps/web/**`, `pnpm-lock.yaml` y la carpeta del cambio. No hay cambios en `packages/contracts` ni en archivos compartidos, y no hay commits.
  - La parada por `identidad-paciente` se resolvió según `handoff.md` (cambio aparte). Las vistas no usan `IdentificarPaciente` ni `pista.paso`.
- Evidencia comprobada independientemente (Claude, 2026-11-24, este checkout):
  - `eslint .` → 0. `pnpm -r exec tsc --noEmit` → 0. `tsc --project tests/tsconfig.json` → 0. (`pnpm lint` no corre tal cual porque el `pnpm` anidado no está en el PATH local; se ejecutaron sus partes.)
  - `pnpm lint:deps` → 0; 166 módulos / 453 dependencias, sin violaciones.
  - `pnpm test --maxWorkers=1` → 0; 39 archivos, 240/240.
  - `pnpm test:integracion` → 0; 12 archivos, 32/32, con Postgres y Redis de Docker.
  - `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` → 0. `VITE_API=mock pnpm --filter @noki/web build` → 0. En ambos: 277 módulos, JS 493.04 kB / gzip 154.18 kB.
  - `openspec validate consolas-internas --type change --strict` → válido.
  - Búsqueda en `apps/web/src` (sin pruebas): ningún `console.*` ni `localStorage`; las vistas no importan `socket.io-client` ni usan `fetch`.
  - Recorrido propio en navegador (modo simulado, 375 px): llamada con el ANI de demo → cotizar en Tepic → «Continuar por WhatsApp» deshabilitado sin consentimiento → consentimiento y solicitud → enlace `/wa?continuar=<código>` y QR. Sin desplazamiento horizontal, sin el número completo en la página y `localStorage` / `sessionStorage` vacíos. Las capturas de Codex con la navegación «encima» del título son efecto de la captura de página completa con la barra fija; en la vista real el diseño es correcto.
- Lectura del código frente a cada requisito:
  - Salas (D1, D2):
    - `ClienteReal.unirse` valida con `SalaSchema` antes de cualquier emisión, lleva conteo de referencias y emite `sala:salir` solo al liberar la última.
    - Al evento `connect`, que Socket.IO v4 emite también al reconectar, reúne las salas activas.
    - `suscribir` valida con `safeParse` y descarta sin lanzar.
    - La conexión es perezosa y se libera sin consumidores. `ClienteMock.unirse` no tiene efecto.
  - Contexto (D4):
    - `useContextoConsulta` resuelve guion → última respuesta → `contextoDemo` (solo en real, consulta compartida). `NO_DISPONIBLE` cuenta como sin contexto.
    - `EstadoContexto` ofrece «Actualizar».
    - El call center real ignora un `contextoDemo` ajeno hasta su propia llamada (`CallCenter.tsx`, comentario D4).
  - Call center (D5, D6):
    - ANI con el patrón del contrato y botón deshabilitado si es inválido.
    - Consentimiento atado al hilo activo. `useAccion` bloquea de forma síncrona el doble envío, y el reintento conserva la clave.
    - El enlace y el QR salen del `codigoContinuacion` de la lectura.
    - En solo lectura se deshabilitan cotizar, consentimiento, continuar y reintento.
  - Clínica y app: `RegistrarLlegada` con `tokenQr`; estados vacío y sin contexto; salas `sede:` y `paciente:`.
  - Administración (D8): etiquetas con `Object.hasOwn` (las claves desconocidas se muestran con su clave), formato numérico sin aritmética, salas `admin` y `hilo:`.
  - Guion (D7): `IniciarTramite` exige `contacto: CONTACTO_DEMO`. El paso `CONTINUACION_SOLICITADA` produce `ConsentimientoContactoWA` en el canal del call center, y el código aparece solo desde ese paso. Versiones y eventos son consecutivos (11 pasos).
- Pruebas leídas (escenarios nombrados):
  - `tiempoReal.test.ts`: sala inválida, referencias, reconexión, evento inválido, simulado sin efecto.
  - `contexto.test.tsx`: prioridad, simulado, `/app` con `contextoDemo`.
  - `consolas.test.tsx`:
    - ANI, nulos y solo lectura, consentimiento con doble clic, reintento con la misma clave, pestaña real nueva y cambio de sala;
    - clínica registrada y vacía, sin `VITE_DEMO`;
    - siete KPI más uno desconocido, admin sin hilo, evento en vivo.
  - `guionWa.test.ts`: ANI ausente o distinto → `NO_DISPONIBLE` con la ayuda del paso.
  - `cliente.test.ts`: código nulo antes de la solicitud y presente después.
- Controles no ejecutados:
  - Recorrido real de punta a punta: BLOQUEADO hasta que `api-comandos` (frente A) esté en `main` con `DEMO_MODE=true` y servidor Socket.IO. Los sockets falsos verifican el cliente, no la compatibilidad con el servidor.
  - Recorrido manual completo a 1280 px y del resto de vistas: no repetido por Claude. Se acepta la evidencia de Codex (`04-recorrido-manual.json`, ocho capturas) junto con la comprobación propia a 375 px del call center.
  - `pnpm install --frozen-lockfile`: no repetido. Codex lo registra en `04-install.txt`, y la suite y las compilaciones corren con el lockfile entregado.

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | SUGGESTION | CI "Ficha del hilo para el asesor" / D4 | `vistas/CallCenter.tsx`: en modo simulado, antes de la llamada (paso 1), la ficha del hilo de demo («Ana», «•••• 0001») aparece debajo del formulario de ANI, porque el contexto sale del guion. El comportamiento ya existía antes de este cambio y en modo real no ocurre. | Opcional: mostrar la ficha en simulado solo cuando el guion haya pasado del paso inicial. |
| H-02 | SUGGESTION | 4.1 | Las capturas a 375 px cubren app, clínica y admin; el call center y WhatsApp a 375 px quedan solo medidos en `04-recorrido-manual.json`. El recorrido propio de Claude cubre el call center a 375 px. | Ninguna para el cierre. |

- Riesgos residuales (no bloquean):
  - Versión de Socket.IO: el cliente fija `socket.io-client` 4.8.1. Falta confirmar con el frente A que `api-comandos` usa `socket.io` 4.x (D3) antes de la integración conjunta.
  - `contextoDemo` solo responde con `VITE_DEMO=true` y `DEMO_MODE=true`. Sin ellos, las vistas muestran el estado sin contexto, como exige el spec.
  - Cada evento invalida todas las consultas: más lecturas de las necesarias, aceptado en el diseño para la demo.
  - Pendiente fuera de este cambio: la identidad del asesor y los pasos de identidad del guion simulado, en un cambio aparte (decisión del 2026-11-24 en `handoff.md`).
- Condiciones para recomendar el cierre: cumplidas. No hay hallazgos CRITICAL ni WARNING, y las sugerencias son opcionales.
- Próximo responsable: `LuisMaster119` (frente B). Decide si autoriza el commit y el push de `feat/consolas-internas` y, tras integrarla en `main`, el cierre (sincronizar specs y archivar) con esta revisión. La autorización de cierre sigue PENDIENTE en `handoff.md`.
