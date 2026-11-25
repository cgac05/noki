# Contratos para los canales

`packages/contracts` publica esquemas Zod y tipos derivados con `z.infer`; solo depende de Zod y no importa dominio ni aplicación. El dominio conserva su vocabulario puro. `packages/adapters/in-http/test/coherencia.test.ts` verifica las cinco listas repetidas en ejecución y por tipos. Las entradas se validarán en el adaptador HTTP al implementar los endpoints; este cambio no crea rutas de negocio.

## vocabulario.ts

Canales: `web | whatsapp | app | callcenter | clinica`. Estados, casillas y tipos de trámite coinciden exactamente con el dominio y `PLAN.md` §6. Actores: `paciente | sistema | asesor:<id> | recepcion:<id>`; niveles de autenticación 0–3. Los códigos de error incluyen los cinco del dominio, `VALIDACION` e `INTERNO`.

## comandos.ts

`ComandoRequestSchema` valida `{ canal, actor, tipo, tramiteId?, hiloId?, payload }`. Los IDs son UUID v7; las fechas son ISO 8601 UTC. El encabezado `Idempotency-Key` y el token de contexto corresponden al futuro adaptador HTTP, no al cuerpo.

| tipo | payload |
|---|---|
| IniciarTramite | `{ tipoTramite, contacto? }`. El ANI o número del canal debe tener entre 10 y 15 dígitos y solo se acepta como entrada. |
| SolicitarContinuacion | `{ destino: 'whatsapp' }`. Requiere `tramiteId` y solicita el consentimiento de contacto y el código de continuación. |
| SeleccionarServicio | `{ servicioId }` |
| SeleccionarSede | `{ sedeId }` |
| AsignarPaciente | `{ pacienteId }`. Solo personal interno y `sistema`. |
| IdentificarPaciente | Payload discriminado por `paso`. Requiere `tramiteId`. |
| ReservarHorario | `{ recursoId, inicio }` |
| ConfirmarCita | `{ reservaId }` |
| CancelarCita | `{ motivo? }`, hasta 200 caracteres |
| RegistrarLlegada | `{ token }`, nunca el folio del QR en claro |
| CerrarAtencion | `{}`. Requiere `tramiteId`. Recepción puede cerrar cualquier cita en `EN_CLINICA` y avanzan los turnos posteriores. |

`IdentificarPacienteSchema` acepta estos pasos:

| Paso | Campos del payload |
|---|---|
| `DESTINATARIO` | `para: MI \| OTRA_PERSONA` |
| `CONFIRMAR` | `candidato` con la referencia opaca elegida o `null` para «No soy ninguno» |
| `FECHA_NAC` | `fechaNac` como fecha ISO |
| `CURP` | `curp` en mayúsculas o `null` para «No la tengo» |
| `DATOS` | `nombre`, `apellidoPaterno`, `apellidoMaterno?`, `fechaNac?`, `sexo?`, `entidadNacimiento?` |
| `REINICIAR` | Solo `paso` |

`ENTIDADES_NACIMIENTO` exporta las 32 claves de entidades y `NE`. El dominio verifica el dígito de la CURP y resuelve qué campos de `DATOS` faltan.

`RespuestaComandoSchema` valida `{ tramite, siguientePregunta, eventos }`. `TramiteVistaSchema` contiene `id, hiloId, tipo, estado, version, servicioId?, sedeId?, horario?`. Cuando hay reserva, `horario` contiene `{ reservaId, inicio, expiraEn? }`. `expiraEn` solo se envía mientras el hold está vigente en `HORARIO_RESERVADO`; `EventoVistaSchema` contiene `id, tipo, canal, ts`. No exponen datos personales ni payloads internos; los campos desconocidos se descartan.

## consultas.ts

Modelos de lectura compartidos, con tipos derivados de sus esquemas Zod:

| Modelo | Datos |
|---|---|
| `OfertaCatalogo` | `servicioId`, `servicio`, `sedeId`, `sede`, `precioCentavos` entero no negativo. |
| `CitaVista` | `tramite`, `servicio`, `sede`, `inicio` ISO UTC, `zonaHoraria` IANA válida y `tokenQr`. |
| `FichaHilo` | `hiloId`, `nombrePila`, `telefonoEnmascarado` (`•••• 0001`), `tramites`, `lineaTiempo`, `soloLectura`, `oferta` y `codigoContinuacion` (`nombrePila`, `telefonoEnmascarado`, `oferta` y `codigoContinuacion` admiten `null`). |
| `LlegadaVista` | `cita`, `registrada` y `posicion` opcional, un entero de 1 en adelante que indica el lugar en la fila de la sede. Solo admite `posicion` si `registrada` es `true`. |
| `AlertaSeguridad` | `id` UUID v7 del evento, `tipo: 'INTENTO_VERIFICACION_FALLIDO'`, `canal`, `ts` ISO UTC, `intentos` entero de 1 en adelante, `bloqueado` booleano e `hiloId` UUID v7 o `null`. |
| `MensajeBandeja` | `id`, `canal` (`sms` o `email`), `asunto`, `cuerpo`; solo demo. |
| `MetricasVista` | `porEstado` con `estado`/`cantidad`, y `kpis` numéricos. |

No declaran fecha de nacimiento, correo del paciente, RFC, PIN ni CURP. El teléfono solo admite el formato enmascarado cuando está presente. La ficha conserva `null` si no hay paciente vinculado o falta el dato. Zod descarta las claves adicionales, incluidas `acciones` o `accion`: las respuestas contienen únicamente datos. El canal arma el comando con `ComandoRequestSchema` a partir de los IDs o del token elegidos, y el cliente lo valida antes de enviar. No decide precios, disponibilidad ni transiciones.

El QR contiene el token firmado de un solo uso que debe generar y consumir el núcleo (`PLAN.md` §8), nunca el folio. El esquema rechaza un `tokenQr` vacío o de 8–9 dígitos; no comprueba firmas ni sustituye al cambio de seguridad. Los tokens del mock son ficticios.

`RUTAS_CONSULTAS` asocia cada nombre con la plantilla, el esquema de parámetros y el esquema de respuesta. Todas las entradas representan **GET**. El método es uniforme y no se repite por entrada. Los tipos `NombreConsulta`, `ParametrosConsulta<N>` y `RespuestaConsulta<N>` se derivan de la tabla. `rutaConsulta(nombre, parametros)` valida antes de sustituir la plantilla y lanza un error Zod si los parámetros son inválidos.

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
| `alertasSeguridad` | `/api/admin/alertas` | ninguno | `AlertaSeguridad[]` de hasta 50 elementos |
| `bandeja` | `/api/demo/bandeja` | ninguno | `MensajeBandeja[]`, `soloDemo: true` |
| `contextoDemo` | `/api/demo/contexto` | ninguno | `ContextoDemo`, `soloDemo: true` |

`alertasSeguridad` omite datos personales y el método de verificación. El intento que provoca el bloqueo lleva `bloqueado: true`. `GET /api/admin/alertas` devuelve los 50 intentos más recientes como máximo, del más reciente al más antiguo.

`contextoDemo` devuelve `{ hiloId, pacienteId, sedeId }` del último hilo con cita confirmada. Cada campo es UUID v7 o `null`. El servidor del cambio `api-comandos` debe responder 404 cuando `DEMO_MODE` es distinto de `true`.

Según el spec `consultas-api` de `api-comandos`, `metricas.kpis` contiene `cambiosCanal`, `cambiosCanalPorHilo`, `tramitesRecuperados`, `citasConfirmadas`, `llegadasRegistradas`, `datosRepetidos` e `intentosVerificacionFallidos`. Se calculan sobre todo el histórico y se emiten con los mismos valores en `admin:metricas`.

Todos los IDs de ruta son UUID v7. Se conservan las rutas anteriores, con nombres explícitos de parámetros en sus plantillas. `GET /api/admin/embudo` y `GET /api/admin/huecos` siguen pendientes de sus cambios y no pertenecen aún a la tabla.

Este contrato no implementa endpoints GET ni autenticación. Las consultas exponen datos personales (nombre de pila, contacto enmascarado, citas con token, llegadas y bandeja) y **solo pueden usarse en la demo** hasta cerrar el cambio de seguridad. La web valida las respuestas en ambos modos con esta tabla; en real, las consultas marcadas `soloDemo` requieren `VITE_DEMO=true`. Historial de WhatsApp y cotización web independiente siguen siendo lecturas exclusivas de demo.

## demo.ts

`RUTA_RELOJ_DEMO` define `POST /api/demo/reloj` como ruta disponible solo con `DEMO_MODE=true`. `AdelantarRelojSchema` valida `{ adelantarMinutos }` como un entero de 1 a 10080. `RespuestaRelojSchema` valida la respuesta 200 con `{ ahora }` en ISO 8601 UTC.

Un cuerpo inválido devuelve 400 con `{ codigo: 'CUERPO_INVALIDO' }` y conserva la hora. La adopción de `CuerpoErrorSchema` para ese 400 queda pendiente. Fuera del modo demo, la ruta responde 404.

## siguientePregunta.ts

`{ tipo: 'COMPLETO' }` o `{ tipo: 'PREGUNTA', casilla, pista }`. La pista declara `entrada: TEXTO | BOTONES | LISTA | FLOW | NINGUNA`, opciones y campos cuando apliquen. La casilla `paciente` admite `pista.paso` con `DESTINATARIO`, `CONFIRMAR`, `FECHA_NAC`, `CURP` o `DATOS`. Los campos de identificación se capturan como `sensitive` y las opciones de `CONFIRMAR` incluyen solo el nombre enmascarado y la referencia opaca.

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

`SalaSchema` admite únicamente `admin` o los prefijos `tramite:`, `hilo:`, `paciente:`, `sede:` seguidos de UUID v7. El tipo `Sala` se deriva del esquema. `EVENTOS_CLIENTE_SOCKET` publica `sala:unirse` y `sala:salir`. `ESQUEMAS_EVENTOS_CLIENTE_SOCKET` valida en ambos casos una `Sala`. No hay servidor Socket.IO en esta entrega.

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
| Error inesperado / INTERNO | 500 |

`INTERNO` usa un mensaje genérico.
