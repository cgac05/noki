# Revisión: pantallas-clinica-alertas

- Dictamen vigente: PASS (revisión 2, abajo). La primera revisión, con dictamen BLOCKED, se conserva como historial.

## Primera revisión (revisión 1)

- Dictamen: BLOCKED. La implementación cumple los requisitos revisables sin hallazgos, pero falta la validación requerida 3.3 (recorrido real), bloqueada hasta que el núcleo del frente A esté en `main`. No se recomienda integrar ni cerrar todavía.
- Revisión inspeccionada: rama `feat/pantallas-clinica-alertas` sobre `main` `e3d49ea` (vigente, incluye `contratos-clinica-alertas` y `ajustes-flujo-a`), con el diff sin commit entregado por Codex (`implementacion.md`, manifiesto `evidencias/03-archivos-entregados.json`). Revisado el 2026-11-25.
- Cobertura:
  - Requisitos y escenarios del delta de `consolas-internas`: «Fila de atención en clínica», «Comprobación de identidad en recepción», «Cierre de atención en clínica» y «Alertas de seguridad en el tablero».
  - Delta de `cliente-api-canales` («Guion simulado del Flujo A»).
  - Design D1–D5 y tareas 1.1–3.3.
  - Archivos: `vistas/{Clinica,Admin}.tsx`, `componentes/{LlegadaClinica,ConfirmarIne,LineaTiempo}.tsx`, `cliente/{demo.ts,mock/guionFlujoA.ts}`, `README.md` y las pruebas nuevas o modificadas.
- Autorización y alcance:
  - Los hashes de `proposal.md`, `design.md` y los dos specs coinciden con la revisión 1 autorizada.
  - `tasks.md` difiere solo por las casillas: al desmarcarlas da `7fdbe2f58166`, el hash autorizado.
  - Se cumplió la condición para empezar: contrato en `main` y rama sobre él.
  - Cambios solo en `apps/web/**` y la carpeta del cambio. `.claude/launch.json`, sin versionar, es de Claude. No hay commits.
- Evidencia comprobada independientemente (Claude, este checkout):
  - `eslint .`, `pnpm -r exec tsc --noEmit` y `tsc --project tests/tsconfig.json` → 0.
  - `pnpm lint:deps` → 0; 218 módulos / 664 dependencias, sin violaciones.
  - `pnpm test --maxWorkers=1` → 0; 59 archivos, 343/343.
  - `pnpm test:integracion` → 0; 15 archivos, 45/45.
  - `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` → 0.
  - `openspec validate pantallas-clinica-alertas --type change --strict` → válido.
  - Sin rutas locales en `evidencias/`.
- Lectura del código:
  - D1: `LlegadaClinica` muestra «Turno {posicion}» solo si viene en la lectura, en el orden de `llegadasSede`, sin ordenar ni inferir. La actualización en vivo usa la sala `sede:` y la invalidación que ya existían.
  - D2: `ConfirmarIne` es un `dialog` modal sin campos, con «Confirmar» y «Cancelar». Escape y Cancelar no envían nada, Tab no sale del diálogo y el foco vuelve al botón.
  - D3:
    - Cada tarjeta tiene su propio `useAccion`, con candado síncrono y la misma clave en el reintento.
    - `ComprobarIdentidad` lleva solo `metodo: 'INE_CLINICA'`, y `CerrarAtencion` lleva `{}`.
    - «Identidad comprobada» se muestra con la respuesta exitosa de esa tarjeta y no se pierde por otra acción fallida.
  - D4: «Alertas de seguridad» es una sección independiente con carga, error con «Reintentar», vacío («Sin alertas de seguridad») y lista con canal, hora local, intentos y «Bloqueado» textual. No muestra el `id` ni calcula nada.
  - D5: el guion pasa a 15 pasos, `INE_VERIFICADA` y `ATENDIDA`, con `IdentidadComprobada` y `AtencionCerrada` en `clinica`. La cita sale de `llegadasSede` al cerrarse, y las alertas son `[]`.
- Pruebas leídas (`vistas/clinicaAlertas.test.tsx`, con `ClienteReal`):
  - dos turnos y orden recibido;
  - INE una sola vez sin datos, y la marca se conserva tras otro fallo;
  - cancelar con botón o Escape y Tab atrapado;
  - reintento con la misma clave sin bloquear otra tarjeta;
  - cierre único con doble clic y avance de la fila según la lectura nueva;
  - alertas con canal, hora, intentos y bloqueo, sin `id`;
  - vacío y 404 sin ocultar el resto, y refresco con evento de `admin`.

  Rojo previo: `01-rojo.txt` y `02-rojo.txt`.
- Evidencia de Codex inspeccionada: `03-identidad-375.jpg` (Turno 1, «Identidad comprobada», paso 14 de 15) y `03-dialogo-375.jpg` (diálogo sin campos con foco en «Confirmar»).
- Controles no ejecutados o bloqueados:
  - 3.3, recorrido real de clínica y alertas: BLOQUEADO. Hasta el cambio del núcleo del frente A, la API responde «operación no disponible» a los dos comandos y 404 en `/api/admin/alertas`. Ese comportamiento sí está cubierto por pruebas, pero no el éxito real.
  - Claude no repitió en navegador el recorrido simulado 3.1; se acepta la evidencia de Codex.
- Hallazgos: ninguno.
- Observación (no bloquea): `03-identidad-375.jpg` muestra visible el enlace «Saltar al contenido», probablemente por el foco al volver del diálogo. El enlace de salto ya existía y sigue funcionando.
- Condiciones para recomendar el cierre:
  - el cambio del núcleo y la API del frente A (comandos de clínica y consulta de alertas) integrado en `main`;
  - la rama rebasada sobre ese `main`;
  - la tarea 3.3 ejecutada en verde y una nueva revisión de Claude con dictamen PASS.
- Próximo responsable: frente A (núcleo de clínica y alertas). Después, Codex del frente B ejecuta 3.3 y Claude vuelve a revisar.

## Segunda revisión (revisión 2: sin «INE verificada» y recorrido real)

- Dictamen: PASS
- Revisión inspeccionada: el diff sin commit entregado por Codex para las tareas 4.1–4.4 (`implementacion.md`, manifiesto `evidencias/04-archivos-entregados.json`). Claude avanzó la base de la rama por fast-forward a `main` `0cf6b53` (vigente; incluye `clinica-alertas` y `documentacion-compartida`). La rama no tenía commits propios y `main` no toca `apps/web` ni la carpeta del cambio. Revisado el 2026-11-25.
- Autorización y alcance:
  - Los hashes de `proposal.md`, `design.md` y los dos specs coinciden con la revisión 2 autorizada.
  - `tasks.md`, desmarcando solo las casillas del grupo 4, da `a410dac37577`, el hash autorizado.
  - Cambios solo en `apps/web/**` y la carpeta del cambio (`.claude/launch.json`, sin versionar, es de Claude). No hay commits.
- Evidencia comprobada independientemente sobre `0cf6b53` + diff:
  - `pnpm install --frozen-lockfile` → 0.
  - `eslint .`, `pnpm -r exec tsc --noEmit` y `tsc --project tests/tsconfig.json` → 0. El código compila sin `ComprobarIdentidad`, que `documentacion-compartida` ya quitó del contrato.
  - `pnpm lint:deps` → 0; 218 módulos / 663 dependencias, sin violaciones.
  - `pnpm test --maxWorkers=1` → 0; 60 archivos, 350/350.
  - `pnpm test:integracion` → 0; 16 archivos, 46/46.
  - `VITE_API=real VITE_DEMO=true pnpm --filter @noki/web build` → 0.
  - `openspec validate pantallas-clinica-alertas --type change --strict` → válido.
  - `grep` de `ComprobarIdentidad`, `INE_CLINICA` e «INE verificada» en `apps/web/src` → sin resultados.
  - `componentes/ConfirmarIne.tsx` ya no existe. Sin rutas locales en `evidencias/`.
- Lectura del código:
  - `LlegadaClinica.tsx`: solo «Registrar llegada» y «Cerrar atención» (`CerrarAtencion` con `{}`), con un `useAccion` por tarjeta y un error con «Reintentar» por tarjeta.
  - «Turno N» sale de `posicion` sin reordenar.
  - `Admin.tsx` conserva la sección de alertas de la revisión 1.
  - El guion tiene 14 pasos, termina en `ATENDIDA` y no tiene paso de INE.
- Recorrido real (4.4) de Codex sobre `71f01f5`:
  - `04-recorrido-real.json` registra `resultado: PASS` y el segundo turno.
  - Cierre del primero observado en otra pestaña sin recargar.
  - Alertas inicialmente vacías y luego tres intentos de WhatsApp, el tercero con `bloqueado: true`, sin recargar y sin datos personales.
  - Inspeccioné `04-avance-375.jpg` (la llegada restante muestra «Turno 1» con «Cerrar atención») y `04-alertas-375.jpg` («3 intentos · Bloqueado»).
  - La diferencia entre `71f01f5` y `0cf6b53` en contratos y API es la retirada de `ComprobarIdentidad`, el campo `metodo` sobrante de la tabla y el reloj de demo; no afecta la fila ni las alertas, así que el recorrido sigue siendo válido.
- Controles no ejecutados: Claude no repitió el recorrido real en navegador sobre `0cf6b53`; se acepta la evidencia de Codex por lo anterior.
- Hallazgos: ninguno.
- Observación (SUGGESTION, no bloquea): en `04-avance-375.jpg` aparece visible «Saltar al contenido». Al cerrar la atención, la tarjeta con el botón enfocado desaparece y el foco vuelve al inicio del documento. Opcional: mover el foco al título de la lista o a la siguiente tarjeta.
- Incidencia externa (frente A, fuera de este cambio): según `implementacion.md`, con paciente asignado desde el call center, WhatsApp respondió HTTP 500 `INTERNO` después de «Acepto la preparación», con el trámite en `LISTO_PARA_RESERVAR`. Para preparar la segunda cita, Codex completó la reserva con `ReservarHorario` y `ConfirmarCita` directos. Hay que remitirla al frente A; no afecta los requisitos de este cambio.
- Condiciones para recomendar el cierre: cumplidas.
- Próximo responsable: `LuisMaster119`. Decide si autoriza el commit y el push de la rama, la integración en `main` y el cierre (sincronizar specs y archivar) con esta revisión. Después se avisa al frente A, incluida la incidencia de WhatsApp.
