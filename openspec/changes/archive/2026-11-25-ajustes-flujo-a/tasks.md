# Tasks

## 1. Agenda en horario de atención (A1)

- [x] 1.1 Agregar `zonaHoraria` a `ConsultaDisponibilidad` y pasarla desde `ConversacionWa`. En `out-sd`, enviarla como parámetro. En `sd-mock`, validarla (Zod + `Intl.DateTimeFormat`) y generar los 15 inicios desde las 09:00 locales con `date-fns-tz` `3.2.0`, agregado a `apps/sd-mock/package.json`. En `AgendaExternaMemoria`, aplicar la misma regla (design D1). Requisitos: agenda-simulada «Agenda simulada en sd-mock» y «Cliente de agenda externa con reintentos». Verificación: pruebas de sd-mock con los escenarios de Tepic, Tijuana y zona inválida (400 sin `stack`); `tests/integracion/sdAgenda.test.ts` con la equivalencia memoria = sd-mock para una consulta con zona; `corepack pnpm install --frozen-lockfile` en verde después de actualizar el lockfile.

## 2. Textos del bot (A1 y A2)

- [x] 2.1 Crear `packages/adapters/in-http/src/textosWa.ts` con `fechaCorta`, `fechaLarga` y las etiquetas exhaustivas de canal de origen, requisito y casilla (design D2). Verificación: prueba unitaria con «jue 26 nov · 09:15» y «jueves 26 de noviembre, 09:15» para `2026-11-26T16:15:00Z` en `America/Mazatlan`, y una etiqueta por cada valor de `Canal` y de tipo de requisito.
- [x] 2.2 Usar `textosWa` en `ConversacionWa`: resumen al retomar, filas de `VARIOS`, preguntas de lista, botones de requisitos, filas de horario, vencimiento y confirmación. En `identificacionWa.ts`, cambiar el texto de `CONFIRMAR` a «¿Eres alguna de estas personas?». Requisitos: canal-whatsapp «Textos del bot en español», «Retomar en WhatsApp», «Preguntas guiadas por siguientePregunta», «Identificación del paciente por pasos en WhatsApp» y «Confirmación por WhatsApp». Verificación: ajustar las pruebas existentes que fijan textos o `HH:mm` (`tests/unit/api/consultasWaMemoria.test.ts`, `identificacionWaHttp.test.ts`, `comandosMemoria.test.ts` y las de integración que correspondan) sin quitar comprobaciones, y agregar los escenarios nuevos:
  - Requisitos con etiqueta;
  - Recorrido sin identificadores internos: comprobar cada mensaje contra el vocabulario de canal, las casillas, los tipos de requisito y la expresión `\d{4}-\d{2}-\d{2}T`;
  - Horarios del Flujo A en horario de atención;
  - Pregunta del paso CONFIRMAR;
  - Confirmación con día.

## 3. Llamada nueva recupera el hilo (A3)

- [x] 3.1 Agregar `HiloAtencion.atenderEn(canal)` y llamarlo desde `CasosTramite.iniciar` cuando el hilo existe y su último canal es distinto, guardando el hilo (design D3). Requisito: continuidad-canales «Último canal del hilo al iniciar un trámite». Verificación: pruebas de aplicación con los tres escenarios del requisito, incluida la segunda continuación con `CanalCambiado` y `cambiosCanal` + 1.
- [x] 3.2 Calcular `soloLectura` con el último canal del hilo en `LecturasMemoria` y en `LecturasComandosPostgres`. Requisito: consultas-api «Contenido de cada consulta». Verificación: la batería compartida del puerto de lectura (memoria y Postgres) con los escenarios «Ficha en solo lectura tras continuar en WhatsApp» y «Llamada nueva desbloquea la ficha». Además, una prueba HTTP en memoria: `IniciarTramite` → `SolicitarContinuacion` → `CONTINUAR <token>` en WhatsApp → `IniciarTramite` con el mismo número → `SeleccionarServicio` y `SeleccionarSede` aceptados.

## 4. Controles

- [x] 4.1 Punto de control: `corepack pnpm lint`, `corepack pnpm lint:deps`, `corepack pnpm test` y `corepack pnpm test:integracion` (Postgres de prueba en 55432) en verde. Guardar los resultados en `evidencias/` sin rutas locales.
- [x] 4.2 Recorrido real de los pasos 1 a 3 de `PLAN.md` §12 con `VITE_API=real`, `VITE_DEMO=true` y `DEMO_MODE=true`. Comprobar:
  - los horarios de WhatsApp desde las 09:00 con su día;
  - la cita confirmada a esa hora en `/app`;
  - textos sin identificadores;
  - una segunda «Llamada entrante» con el mismo número que permite cotizar sin `pnpm demo:reset`.

  Guardar capturas o transcripción en `evidencias/`, sin datos personales. Si falta la web de `main`, marcarlo como bloqueado, no como hecho.
