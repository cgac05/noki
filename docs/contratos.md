# Contratos para los canales

`packages/contracts` publica esquemas Zod y tipos derivados con `z.infer`; solo depende de Zod y no importa dominio ni aplicación. El dominio conserva su vocabulario puro. `packages/adapters/in-http/test/coherencia.test.ts` verifica las cinco listas repetidas en ejecución y por tipos. Las entradas se validarán en el adaptador HTTP al implementar los endpoints; este cambio no crea rutas de negocio.

## vocabulario.ts

Canales: `web | whatsapp | app | callcenter | clinica`. Estados, casillas y tipos de trámite coinciden exactamente con el dominio y `PLAN.md` §6. Actores: `paciente | sistema | asesor:<id> | recepcion:<id>`; niveles de autenticación 0–3. Los códigos de error incluyen los cinco del dominio y `VALIDACION`.

## comandos.ts

`ComandoRequestSchema` valida `{ canal, actor, tipo, tramiteId?, hiloId?, payload }`. Los IDs son UUID v7; las fechas son ISO 8601 UTC. El encabezado `Idempotency-Key` y el token de contexto corresponden al futuro adaptador HTTP, no al cuerpo.

| tipo | payload |
|---|---|
| IniciarTramite | `{ tipoTramite }` |
| SeleccionarServicio | `{ servicioId }` |
| SeleccionarSede | `{ sedeId }` |
| AsignarPaciente | `{ pacienteId }` |
| ReservarHorario | `{ recursoId, inicio }` |
| ConfirmarCita | `{ reservaId }` |
| CancelarCita | `{ motivo? }`, hasta 200 caracteres |
| RegistrarLlegada | `{ token }`, nunca el folio del QR en claro |

`RespuestaComandoSchema` valida `{ tramite, siguientePregunta, eventos }`. `TramiteVistaSchema` contiene `id, hiloId, tipo, estado, version, servicioId?, sedeId?`; `EventoVistaSchema` contiene `id, tipo, canal, ts`. No exponen datos personales ni payloads internos; los campos desconocidos se descartan.

## consultas.ts

Modelos de lectura compartidos, con tipos derivados de sus esquemas Zod:

| Modelo | Datos |
|---|---|
| `OfertaCatalogo` | `servicioId`, `servicio`, `sedeId`, `sede`, `precioCentavos` entero no negativo. |
| `CitaVista` | `tramite`, `servicio`, `sede`, `inicio` ISO UTC, `zonaHoraria` IANA válida y `tokenQr`. |
| `FichaHilo` | `hiloId`, `nombrePila`, `telefonoEnmascarado` (`•••• 0001`), `tramites`, `lineaTiempo`, `soloLectura`, `oferta` y `codigoContinuacion` (los últimos dos admiten `null`). |
| `LlegadaVista` | `cita` y `registrada`. |
| `MensajeBandeja` | `id`, `canal` (`sms` o `email`), `asunto`, `cuerpo`; solo demo. |
| `MetricasVista` | `porEstado` con `estado`/`cantidad`, y `kpis` numéricos. |

No declaran fecha de nacimiento, correo del paciente, RFC, PIN ni CURP. El teléfono solo admite el formato enmascarado. Zod descarta las claves adicionales, incluidas `acciones` o `accion`: las respuestas contienen únicamente datos. El canal arma el comando con `ComandoRequestSchema` a partir de los IDs o del token elegidos, y el cliente lo valida antes de enviar. No decide precios, disponibilidad ni transiciones.

El QR contiene el token firmado de un solo uso que debe generar y consumir el núcleo (`PLAN.md` §8), nunca el folio. El esquema rechaza un `tokenQr` vacío o de 8–9 dígitos; no comprueba firmas ni sustituye al cambio de seguridad. Los tokens del mock son ficticios.

`RUTAS_CONSULTAS` asocia cada nombre con la plantilla, el esquema de parámetros y el esquema de respuesta. Todas las entradas representan **GET**; el método es uniforme y no se repite por entrada. Los tipos `NombreConsulta`, `ParametrosConsulta<N>` y `RespuestaConsulta<N>` se derivan de la tabla. `rutaConsulta(nombre, parametros)` valida antes de sustituir la plantilla y lanza un error Zod si los parámetros son inválidos.

| Nombre | Ruta GET | Parámetros | Respuesta |
|---|---|---|---|
| `tramite` | `/api/tramites/:tramiteId` | `tramiteId` | `TramiteVista` |
| `lineaTiempo` | `/api/hilos/:hiloId/linea-tiempo` | `hiloId` | `EventoVista[]` |
| `tramitesAbiertos` | `/api/pacientes/:pacienteId/tramites-abiertos` | `pacienteId` | `TramiteVista[]` |
| `catalogo` | `/api/catalogo` | ninguno | `OfertaCatalogo[]` |
| `fichaHilo` | `/api/hilos/:hiloId/ficha` | `hiloId` | `FichaHilo` |
| `citasPaciente` | `/api/pacientes/:pacienteId/citas` | `pacienteId` | `CitaVista[]` |
| `llegadasSede` | `/api/sedes/:sedeId/llegadas` | `sedeId` | `LlegadaVista[]` |
| `metricas` | `/api/admin/kpis` | ninguno | `MetricasVista` |
| `bandeja` | `/api/demo/bandeja` | ninguno | `MensajeBandeja[]`, `soloDemo: true` |

Todos los IDs de ruta son UUID v7. Se conservan las rutas anteriores, con nombres explícitos de parámetros en sus plantillas. `GET /api/admin/embudo` y `GET /api/admin/huecos` siguen pendientes de sus cambios y no pertenecen aún a la tabla.

Este contrato no implementa endpoints GET ni autenticación. Las consultas exponen datos personales (nombre de pila, contacto enmascarado, citas con token, llegadas y bandeja) y **solo pueden usarse en la demo** hasta cerrar el cambio de seguridad. La web valida las respuestas en ambos modos con esta tabla; en real, `bandeja` requiere `VITE_DEMO=true`. Historial de WhatsApp y cotización web independiente siguen siendo lecturas exclusivas de demo.

## siguientePregunta.ts

`{ tipo: 'COMPLETO' }` o `{ tipo: 'PREGUNTA', casilla, pista }`. La pista declara `entrada: TEXTO | BOTONES | LISTA | FLOW | NINGUNA`, opciones y campos cuando apliquen. Solo se define la forma: no se calcula la siguiente pregunta.

## mensajesBot.ts

`MensajeBotSchema` tiene variantes discriminadas `texto`, `botones`, `lista` y `flow`. Botones: 1–3. Listas: al menos una sección, máximo 10 filas sumadas entre todas las secciones. Opciones: `{ id, titulo, payload }`.

`CampoFlowSchema` declara `id, etiqueta, requerido?` y `captura: texto | fecha | sensitive | passcode`. Las tres primeras variantes admiten `valorInicial?`; la variante `passcode` rechaza cualquier propiedad adicional, incluido un valor inicial. Fecha de nacimiento y datos fiscales deben capturarse como `sensitive`; PIN como `passcode`. El bot nunca debe repetir datos sensibles.

## whatsapp.ts

`SolicitudMensajeWaSchema`: `{ waId, texto?, payloadBoton?, flowResponse? }`, al menos uno de los tres opcionales. `flowResponse` es un mapa de campos de texto. `RespuestaMensajeWaSchema`: `{ mensajes: MensajeBot[] }`. No se invoca la API real de Meta.

## tiempoReal.ts

`EVENTOS_SOCKET` declara una vez los nombres; `ESQUEMAS_EVENTOS_SOCKET` valida sus datos y `DatosEventoSocket` deriva los tipos:

| Evento | Datos públicos |
|---|---|
| tramite:actualizado | `TramiteVista` |
| hilo:linea-tiempo | `{ hiloId, eventos: EventoVista[] }` |
| admin:metricas | mapa de métricas numéricas |
| sede:fila | `{ tramiteId, posicion }` |
| bandeja:mensaje | `{ mensajeId, canal: sms | email }` |

`SalaSchema` admite únicamente `admin` o los prefijos `tramite:`, `hilo:`, `paciente:`, `sede:` seguidos de UUID v7. El tipo `Sala` se deriva del esquema. No hay servidor Socket.IO en esta entrega.

## errores.ts

`CuerpoErrorSchema` valida `{ error: { codigo, mensaje, datos? } }` y descarta propiedades desconocidas como `stack` en la raíz y en `error`. `datos` se reserva para información pública de validación o alternativas; el adaptador no debe copiar excepciones, datos personales ni errores de drivers dentro de ese campo.

El dominio distingue la familia por `codigo`; en `ReglaViolada`, `regla` conserva la regla específica y también aparece en `datos`. El mapeo `MAPEO_ERRORES_HTTP` está en `packages/adapters/in-http/src/mapeoErroresHttp.ts` y exige por tipos una entrada para cada error:

| Error / codigo | HTTP |
|---|---|
| ReglaViolada / REGLA_VIOLADA | 422 |
| StepUpRequerido / STEP_UP_REQUERIDO | 403 |
| ConflictoVersion / CONFLICTO_VERSION | 409 |
| NoEncontrado / NO_ENCONTRADO | 404 |
| TransicionInvalida / TRANSICION_INVALIDA | 409 |
| Validación Zod / VALIDACION | 400 |
