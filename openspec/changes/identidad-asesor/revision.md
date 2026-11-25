# Revisión: identidad-asesor

- Dictamen vigente: PASS (segunda revisión, abajo). La primera revisión, con dictamen FAIL, se conserva como historial.

## Primera revisión

- Dictamen: FAIL
- Revisión inspeccionada: rama `feat/identidad-asesor` sobre `main` `cb3d56a` (vigente), con el diff sin commit entregado por Codex (`implementacion.md`, manifiesto `evidencias/03-archivos-entregados.json`). Revisado el 2026-11-24.
- Cobertura:
  - Requisitos y escenarios de los deltas de `consolas-internas` («Identificación opcional del paciente en el call center», «Datos de identificación protegidos en la consola») y de `cliente-api-canales` («Guion simulado del Flujo A»).
  - Design D1–D6 y tareas 1.1–3.3.
  - Archivos: `cliente/{identificacion.ts,useIdentificacion.ts,mock/guionFlujoA.ts,demo.ts}`, `componentes/{IdentificacionAsesor,ModalFlow}.tsx`, `vistas/CallCenter.tsx`, `README.md` y las pruebas nuevas o modificadas.
- Autorización y alcance:
  - Los hashes de `proposal.md`, `design.md` y los dos specs coinciden con la revisión 1 autorizada.
  - `tasks.md` difiere solo por las casillas: al desmarcarlas da `b37d2d99ddf6`, el hash autorizado.
  - Cambios solo en `apps/web/**` y la carpeta del cambio. No hay cambios en contratos, dominio ni archivos compartidos, y no hay commits.
- Evidencia comprobada independientemente (Claude, 2026-11-24, este checkout):
  - `eslint .`, `pnpm -r exec tsc --noEmit` y `tsc --project tests/tsconfig.json` → 0 (partes de `pnpm lint`; el `pnpm` anidado no está en el PATH local).
  - `pnpm lint:deps` → 0; 175 módulos / 500 dependencias, sin violaciones.
  - `pnpm test --maxWorkers=1` → 0; 43 archivos, 271/271.
  - `pnpm test:integracion` → 0; 12 archivos, 32/32.
  - `VITE_API=real VITE_DEMO=true` y `VITE_API=mock` `pnpm --filter @noki/web build` → 0 en ambos; 280 módulos, JS 498.65 kB / gzip 155.81 kB.
  - `openspec validate identidad-asesor --type change --strict` → válido.
  - Búsqueda en `apps/web/src` (sin pruebas): ningún `console.*` ni `localStorage`. Búsqueda de rutas locales en `evidencias/`: ninguna.
  - Prueba temporal de reproducción de H-01, ejecutada con el arnés de `identidadAsesor.test.tsx` y borrada después; el árbol de trabajo quedó como lo entregó Codex. Se ejecutó `pnpm exec vitest run --project web` sobre un archivo que, tras dos fallos de red en «Para mí», pulsa «Para otra persona». Resultado: FAIL; se envió `{"paso":"DESTINATARIO","para":"MI"}` con la misma `Idempotency-Key`.
  - Capturas inspeccionadas: `03-375-wa-candidata.jpg` (lista con «Soy Ana P.» y «No soy ninguno») y `03-375-wa-flow.jpg` (fecha enmascarada en el modal, sin desplazamiento horizontal).
- Lectura del código frente a los requisitos:
  - Armado (D2): `armarIdentificacion` valida la pista con `SiguientePreguntaSchema`, exige que la opción pertenezca a la pista y traduce `MI`/`OTRA_PERSONA`, `NINGUNO` → `null` y `SIN_CURP` → `curp: null`. Los campos van por `id`, se omiten los opcionales vacíos y se pasan a mayúsculas `curp`, `sexo` y `entidadNacimiento`. Valida con `ComandoRequestSchema` y devuelve solo los ids de campo en error; un caso desconocido es error de contrato.
  - Envío (D3): `useIdentificacion` usa refs y `cliente.enviarComando` con clave propia, sin TanStack Query. Tiene candado síncrono, `recordar` e invalidación al tener éxito, y borra el pendiente al descartar o desmontar. Defecto en H-01.
  - Modal (D4): la prop opcional `validar` marca los campos con «Revisa el formato de este campo» sin enviar; sin ella, `/wa` no cambia.
  - Vista (D1, D5): la sección aparece solo con la última respuesta de la pestaña pidiendo `paciente` con `paso`, no aparece en solo lectura, se remonta por pista y no bloquea cotizar ni continuar. «Reiniciar identificación» descarta y envía `REINICIAR`.
  - Guion (D6): 13 pasos; `IDENTIFICACION_DESTINATARIO` → `IDENTIFICACION_CONFIRMAR` (referencia opaca ficticia) → `IDENTIFICACION_FECHA` (Flow `fechaNac` `sensitive`) → `VERIFICADA`. Los eventos `DestinatarioDeclarado` e `IdentidadComprobada` son consecutivos, y `PacienteReconocido` ya no aparece. El call center sigue pidiendo `servicio`.
- Controles no ejecutados:
  - Recorrido real de punta a punta: BLOQUEADO hasta `api-comandos` en `main`.
  - Recorrido manual completo: no repetido por Claude. Se acepta la evidencia de Codex (16 capturas y `03-recorrido-manual.json`) más la inspección de dos capturas.

| Hallazgo | Gravedad | Requisito / tarea | Evidencia | Corrección necesaria / estado |
|---|---|---|---|---|
| H-01 | WARNING | CI «Identificación opcional del paciente en el call center» (escenarios Destinatario, Sin CURP) y «Datos de identificación protegidos en la consola» («Reintento con la misma clave» exige reutilizar solo para *el mismo envío*); D3; tareas 1.2 y 1.4 | `cliente/useIdentificacion.ts`, en `enviar`: `pendiente.current ??= { comando, clave }`. Tras un envío fallido, el pendiente se conserva y cualquier respuesta distinta reenvía el comando anterior con su clave. Reproducido: tras fallar «Para mí», pulsar «Para otra persona» envía `para: 'MI'`. Lo mismo ocurre si tras fallar «No la tengo» se captura una CURP en el modal (enviaría `curp: null`), o tras un error del núcleo. | Reutilizar el pendiente solo si el comando nuevo es idéntico al pendiente. Si es distinto, descartarlo y crear clave nueva. Agregar en `useIdentificacion.test.tsx` o `identidadAsesor.test.tsx` una prueba que falle antes y pase después: fallo de red en una opción y después otra opción, o una captura en el modal, con payload nuevo y clave distinta. Mantener la prueba de reintento con la misma clave. |
| H-02 | SUGGESTION | CI «Identificación opcional…» | `IdentificacionAsesor.tsx`: ofrece «Reintentar» también para errores del núcleo (`REGLA_VIOLADA`, p. ej. `IDENTIFICACION_BLOQUEADA`), donde repetir el mismo envío no sirve. | Opcional: ofrecer «Reintentar» solo con errores de red o servidor. |
| H-03 | SUGGESTION | D4 | La fecha se captura como texto enmascarado (`sensitive`) y el contrato exige `AAAA-MM-DD`. Un formato distinto solo muestra «Revisa el formato de este campo». | Opcional: indicar el formato esperado en el mensaje de error de campos con id `fechaNac`, sin mostrar el valor. |
| H-04 | SUGGESTION | D5 | La sección muestra el paso con su valor de contrato («Paso: DESTINATARIO»). | Opcional: omitirlo o mostrar solo las opciones y los campos de la pista. |

- Riesgos residuales: el recorrido real depende de `api-comandos` (revisión 4 del frente A). Si el núcleo cambia la convención de opciones o ids de campo, la web lo rechazará antes de enviar.
- Condiciones para recomendar el cierre: NO cumplidas por H-01 (WARNING).
- Próximo responsable: Codex corrige H-01 dentro del alcance autorizado, sin cambiar requisitos, actualiza `implementacion.md` con la prueba roja y verde, y repite los controles 1.5 y 3.3. Después, Claude vuelve a revisar.

## Segunda revisión (corrección de H-01)

- Dictamen: PASS
- Revisión inspeccionada: el mismo diff con la corrección de Codex, sobre `main` `d7f7590` (vigente; incluye `api-comandos`). Claude avanzó la base de la rama por fast-forward: no tenía commits propios, y `main` no toca `apps/web/**` ni la carpeta del cambio. Revisado el 2026-11-24.
- Autorización y alcance: los hashes de `proposal.md`, `design.md` y los dos specs siguen siendo los de la revisión 1. `tasks.md` difiere solo por las casillas. No hay cambios fuera de `apps/web/**` y la carpeta del cambio, y no hay commits.
- Corrección de H-01:
  - `cliente/useIdentificacion.ts`, en `enviar`: reutiliza el pendiente solo si el comando, ya normalizado por el contrato, es idéntico (`JSON.stringify`). Si no, crea un pendiente con clave nueva.
  - Pruebas nuevas: `useIdentificacion.test.tsx` («H-01: reemplaza el pendiente fallido al elegir…») y `identidadAsesor.test.tsx` («H-01: tras fallar Para mí envía Para otra persona con otro payload y clave»).
  - El rojo previo está en `evidencias/h01-rojo.txt`: 3 fallos de 16.
  - La reproducción propia de Claude (la misma prueba temporal de la primera revisión, borrada después) ahora pasa: envía `{"paso":"DESTINATARIO","para":"OTRA_PERSONA"}` con una clave distinta.
- Evidencia comprobada independientemente sobre `d7f7590` + diff:
  - `pnpm install --frozen-lockfile` → 0 (el lockfile de `main` cambió por `api-comandos`).
  - `eslint .`, `pnpm -r exec tsc --noEmit` y `tsc --project tests/tsconfig.json` → 0.
  - `pnpm lint:deps` → 0; 202 módulos / 602 dependencias, sin violaciones.
  - `pnpm test --maxWorkers=1` → 0; 52 archivos, 302/302 (incluye las pruebas nuevas de `api-comandos`).
  - `pnpm db:migrate` → 0 en el Postgres local de Docker (aplicó `003_identidad` y `004_api`).
  - `pnpm test:integracion` → 0; 14 archivos, 38/38.
  - `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` → 0.
  - Sobre la base anterior `cb3d56a`: `pnpm test` 275/275, integración 32/32, compilaciones y `openspec validate` → 0.
- Hallazgos: H-01 corregido. H-02 a H-04 (SUGGESTION) siguen abiertos y no condicionan el cierre.
- Riesgos residuales:
  - `api-comandos` ya está en `main`. El recorrido real de punta a punta (identificación del asesor contra el núcleo, salas y `contextoDemo` de `consolas-internas`) ya no está bloqueado, pero no se ejecutó en esta revisión. Corresponde a la integración conjunta del Flujo A (`docs/trabajo-paralelo.md`, horas 14–18).
  - El servidor usa `socket.io` 4.8.4 y el cliente `socket.io-client` 4.8.1, con la misma major. Queda resuelto el riesgo D3 de `consolas-internas`.
- Condiciones para recomendar el cierre: cumplidas.
- Próximo responsable: `LuisMaster119`. Decide si autoriza el commit y el push de `feat/identidad-asesor`, la integración en `main` y el cierre (sincronizar specs y archivar) con esta revisión.
