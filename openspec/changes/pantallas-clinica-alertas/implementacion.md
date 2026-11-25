# Implementación: pantallas-clinica-alertas

- Resumen: revisión 2 aplicada. Recepción conserva la fila y «Cerrar atención» sin comprobación adicional de INE. El guion simulado termina en «Atención cerrada», paso 14 de 14. Clínica y alertas se verificaron con la API real, Postgres y Redis locales.
- Autorización: revisión 2 registrada en `handoff.md`, otorgada por `LuisMaster119`, tareas 4.1–4.4; reafirmada por la instrucción de esta sesión. Sin autorización de commits ni cierre.
- Revisión entregada: rama `feat/pantallas-clinica-alertas`, HEAD `71f01f50185ec3403ef0ffd486d217a91805b39c`, con el diff pendiente de las revisiones 1 y 2. Manifiesto de archivos, tamaños y SHA-256: `evidencias/04-archivos-entregados.json`.
- Tareas: 4.1–4.4 completadas en esta sesión; 13/13 en `tasks.md`. Las evidencias 01–03 documentan la revisión 1 y no sustituyen el control 04.

## Archivos entregados

La lista exacta con archivos nuevos y evidencia está en el manifiesto. Producto bajo `apps/web/`:

- `src/componentes/LlegadaClinica.tsx`: tarjeta con su propio `useAccion`, turno recibido, llegada con QR y cierre con payload vacío. Se retiran el botón de INE y el estado local de identidad.
- `src/componentes/ConfirmarIne.tsx`: retirado; era un archivo nuevo sin seguimiento de la revisión 1 y ya no existe.
- `src/cliente/demo.ts` y `src/cliente/mock/guionFlujoA.ts`: se elimina el paso intermedio de INE; `ATENDIDA` queda en versión 14 y `AtencionCerrada` es el evento 15. Las versiones y los eventos siguen consecutivos; alertas vacías en todos los pasos simulados.
- `src/vistas/clinicaAlertas.test.tsx`: ausencia de acciones adicionales, cierre, doble clic, reintento con la misma clave y tarjeta independiente, fila en vivo y alertas. Se retiran las pruebas del diálogo eliminado.
- `src/cliente/{guionWa,cliente}.test.ts` y `src/vistas/vistas.test.tsx`: recorrido de 14 pasos, cierre inmediatamente después de llegada, eventos clínicos correctos y respuestas de contrato.
- `README.md`: clínica con QR firmado, guion de 14 pasos y disponibilidad de la API desde `main` `71f01f5`.
- Se conservan los cambios de revisión 1 en `src/vistas/{Clinica,Admin}.tsx`, `src/componentes/LineaTiempo.tsx` y `src/vistas/consolas.test.tsx`.

Esta carpeta incorpora resultados 04, capturas, JSON de preparación y recorrido, script de preparación, manifiesto e informe actualizado. `.claude/launch.json` estaba sin seguimiento al comenzar y pertenece a Claude; se conserva fuera de la entrega.

## Decisiones y alcance

- D1, D3, D4 y D5 conservadas; D2 retirada conforme a la revisión autorizada. Se reutilizan el estilo, los contratos y el refresco existentes. No se calculan turnos ni bloqueos en la web.
- El acuerdo registrado en el handoff retira la comprobación de INE; las referencias antiguas de `PLAN.md` y contratos compartidos corresponden al cambio `documentacion-compartida`. Esta implementación no modifica esos archivos.
- No se cambiaron eventos, puertos, esquemas, endpoints, núcleo, dependencias, configuración compartida ni especificaciones principales. Sin commits ni publicación.

## Validaciones

Todos los comandos pnpm se invocaron mediante `corepack pnpm`. Las salidas guardadas sustituyen los prefijos de la máquina por marcadores, conservando resultados y errores.

| Tarea / requisito | Comando o comprobación | Resultado real | Evidencia |
|---|---|---|---|
| 4.1 / rojo previo | `corepack pnpm exec vitest run --project web apps/web/src/vistas/clinicaAlertas.test.tsx apps/web/src/cliente/guionWa.test.ts --maxWorkers=1` | ROJO esperado: 3 fallos, 13 aprobadas; implementación de revisión 1 aún ofrecía INE y 15 pasos | `evidencias/04-rojo.txt` |
| 4.2 / verde | Mismo comando, añadiendo `cliente.test.ts`, `vistas.test.tsx` y `consolas.test.tsx` | PASS: 72 pruebas en 5 archivos | `evidencias/04-verde.txt` |
| 4.2 / eliminación | `rg -n 'ComprobarIdentidad|INE_CLINICA|INE verificada' apps/web/src` | PASS: ninguna coincidencia; salida vacía y código 1 esperado | `evidencias/04-controles.json` |
| 4.3 / lint | `corepack pnpm lint` | PASS: código 0, ESLint y TypeScript. Repetido después de añadir el script de evidencia | `evidencias/04-lint.txt` |
| 4.3 / fronteras | `corepack pnpm lint:deps` | PASS: código 0, 217 módulos / 661 dependencias, ninguna violación | `evidencias/04-deps.txt` |
| 4.3 / suite completa | `corepack pnpm test --maxWorkers=1` | PASS: código 0, 348 pruebas en 60 archivos; sin omisiones ni cambios en timeouts | `evidencias/04-test.txt` |
| 4.3 / integración | `corepack pnpm test:integracion` | PASS: código 0, 46 pruebas en 16 archivos; incluye clínica y alertas sobre Postgres | `evidencias/04-integracion.txt` |
| 4.3 / compilación | `$env:VITE_API = 'real'; $env:VITE_DEMO = 'true'; corepack pnpm --filter @noki/web build` | PASS: código 0 | `evidencias/04-build.txt` |
| 4.4 / fila real | Dos llegadas de pacientes ficticios distintos en Tepic; cerrar la primera desde otra pestaña, observando la original sin navegar ni recargar | PASS: turnos 1 y 2; primera retirada; segunda en turno 1 | `evidencias/04-fila-{375,1280}.jpg`, `evidencias/04-avance-{375,1280}.jpg`, `evidencias/04-recorrido-real.json` |
| 4.4 / alertas reales | Tres fechas incorrectas en el modal protegido de `/wa`; `/admin` permanece abierta | PASS: aparecen 1, 2 y 3 intentos sin recargar; tercera con «Bloqueado»; lista sin nombres, teléfonos, fechas de nacimiento ni IDs | `evidencias/04-alertas-{375,1280}.jpg`, `evidencias/04-alertas-detalle.jpg`, `evidencias/04-recorrido-real.json` |
| 4.4 / responsive | Medidas DOM y capturas con viewport de 375 × 812 y 1280 × 900 | PASS: ancho del documento no supera el viewport en fila, avance y alertas. Se corrigieron capturas inicialmente tomadas desde la pestaña con otro viewport | `evidencias/04-recorrido-real.json` |
| OpenSpec / estructura | `openspec validate pantallas-clinica-alertas --type change --strict --no-interactive` | PASS: código 0 | `evidencias/04-openspec.txt` |
| UI / detector | Impeccable `detect --json apps/web/src/componentes/LlegadaClinica.tsx` y revisión visual de capturas | PASS: `[]`; se conserva el diseño existente | `evidencias/04-ui.txt` |

## Preparación del recorrido y limitaciones

- API en `http://localhost:4000`, código del núcleo sin modificaciones sobre HEAD `71f01f5`; `/api/demo/contexto` disponible confirma demo, y `/ready` reportó Postgres y Redis `ok`. Contenedores locales saludables. Se usó la web existente en `http://localhost:5173`, configurada con `VITE_API=real` y `VITE_DEMO=true` según su lanzamiento; su contexto real, comandos y eventos se comprobaron en navegador.
- Un servidor adicional en 5174 con esas variables encontró el CORS del origen configurado en 5173; se volvió al origen existente y se detuvo el servidor adicional. No se relajó CORS.
- `sd-mock` estaba detenido: se inició con `corepack pnpm --filter @noki/sd-mock dev`. Sigue disponible para repetir la demo. API, web, Postgres y Redis existentes se conservaron. No se reinició la base de demo.
- Las dos citas objetivo se crearon para Ana y Beto ficticios, en Química sanguínea de Tepic, 25 de noviembre a las 13:00 y 13:30 (`20:00Z` y `20:30Z`). IDs y operaciones en `evidencias/04-preparacion-citas.json`; registro ejecutable en `evidencias/04-preparar-citas.mjs`. El script registra la preparación concreta de esta sesión y presupone esos datos y fechas de demo; no es una herramienta general de reset.
- Incidencia externa al cambio: con paciente asignado por call center, WhatsApp devolvió HTTP 500 `INTERNO` después de «Acepto la preparación». El trámite quedó `LISTO_PARA_RESERVAR`. Se completaron las reservas con `ReservarHorario` (recurso explícito de la semilla) y `ConfirmarCita`, en peticiones separadas del call center. El error y la recuperación constan en el JSON. La causa interna no se determinó ni se corrigió. El núcleo debe revisar ese caso por separado; este resultado no certifica el éxito de ese recorrido alternativo de agendado.
- El contador en memoria de `sd-mock` reiniciado chocó con un folio ya existente (`10000002`); se avanzó con tres citas sintéticas en el simulador antes de la preparación final. Los intentos previos dejaron borradores, holds y una cita adicional ficticia sin registrar llegada. Las capturas muestran también las citas esperadas previas; solo los dos pacientes objetivo entraron en fila.
- Las alertas se prepararon con otro trámite del contacto ficticio de Ana, sin asignación interna de paciente: call center seleccionó servicio y sede y solicitó continuación; la API retomó el token sin guardarlo en evidencia. En la UI se eligió horario, preparación, «Para mí», «Soy Ana P.» y se enviaron tres fechas equivocadas mediante el Flow. Tras cada fallo se eligió nuevamente el candidato. `/admin` mostró el avance 1 → 2 → 3 y el bloqueo sin recarga. Ver `evidencias/04-preparacion-alertas.json` y el recorrido.
- La hora de las alertas es la del navegador (`America/Mexico_City`, 24 de noviembre por la noche); los eventos de backend se conservan en UTC, ya 25 de noviembre. La captura no expone los valores enviados en el Flow.
- Corepack necesitó ejecución con acceso de red fuera del sandbox para resolver su versión; el fallo inicial `ENOTFOUND registry.npmjs.org` se conserva en `evidencias/04-entorno-corepack.txt`. Las validaciones efectivas terminaron con código 0.
- Vite conserva advertencias de directivas `use client` en dependencias y chunk de 501.45 kB (156.47 kB gzip), sin impedir el build. No se amplió el alcance al empaquetado.

## Transferencia a revisión

`revision.md` conserva el dictamen independiente de la revisión 1; Codex no lo reemplaza. El bloqueo por falta de recorrido real tiene ahora evidencia 04. Corresponde a Claude revisar la revisión 2 con `/opsx:verify pantallas-clinica-alertas`, incluidos el diff, la evidencia y la incidencia externa de preparación. La sincronización, integración y el archivado permanecen pendientes de su revisión y de la autorización de cierre del frente B.
