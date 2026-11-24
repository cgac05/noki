# Design

## Context

`base-contratos` dejó en `packages/domain` el vocabulario (`ESTADOS_TRAMITE`, `CASILLAS`, `TIPOS_TRAMITE`), `PerfilServicio`, la envoltura y la unión de 27 eventos, y los errores `ReglaViolada`, `StepUpRequerido`, `ConflictoVersion`, `NoEncontrado` y `TransicionInvalida`; en `packages/application` solo los puertos `Reloj` y `GeneradorId`; en `packages/adapters/memory` `RelojFalso` y `GeneradorIdSecuencial`; en `packages/contracts` `SiguientePreguntaSchema`. `application` no puede importar `contracts` (regla de `lint:deps`), y `contracts` repite el vocabulario del dominio con una prueba de coherencia en `in-http`. Vitest incluye `tests/unit/**/*.test.ts` y `packages/adapters/in-http/test/**/*.test.ts`. Restricciones: `AGENTS.md` §5–§9, `PLAN.md` §6 y §8, y la propiedad de archivos de `docs/trabajo-paralelo.md`.

## Goals / Non-Goals

**Goals:**
- Núcleo determinista y probado con adaptadores en memoria que resuelva el tramo Call Center → WhatsApp del Flujo A.
- Puertos estables que `persistencia-eventos` y `api-comandos` implementen sin cambiar casos de uso.
- Cero cambios en archivos compartidos.

**Non-Goals:**
- Persistencia real, outbox, broker, temporizadores, HTTP, Socket.IO, criptografía, OTP y PIN reales, huecos, recordatorios, reprogramar y clonar trámites expirados.
- Opciones de catálogo en la pista (las arma el adaptador del canal con el catálogo).

## Decisions

### D1. Estado almacenado más hitos calculados
El trámite guarda casillas (`servicioId`, `sedeId`, `precioCentavos`, `pacienteId`, requisitos cumplidos, advertencia de elegibilidad reconocida, `reservaId` e inicio del horario) y una `fase` explícita solo a partir de `HORARIO_RESERVADO`. El getter `estado` devuelve la fase explícita si existe; si no, calcula `BORRADOR | COTIZADO | LISTO_PARA_RESERVAR` desde las casillas. Expirar el hold borra la fase y el horario, así que el estado "vuelve" al hito sin una transición escrita a mano. `EXPIRADO` es una fase explícita.
- Alternativa: guardar siempre el estado y recalcularlo en cada setter. Descartada: duplica la regla y permite incoherencias.

### D2. Apartar exige `LISTO_PARA_RESERVAR` (según `PLAN.md` §6)
Decisión del responsable del 2026-11-24 ("ajústate a lo del plan"): apartar horario solo procede desde `LISTO_PARA_RESERVAR`, es decir, con servicio, sede, precio, paciente y requisitos. En `BORRADOR` o `COTIZADO` lanza `ReglaViolada('CASILLAS_PENDIENTES', { casillas })` con las casillas que faltan para ese hito (no `TransicionInvalida`, porque el canal puede resolverlo preguntando). Confirmar solo exige `HORARIO_RESERVADO`; el hold expirado vuelve a `LISTO_PARA_RESERVAR`. Servicio, sede y paciente quedan fijos desde que se aparta.
- El grafo de dependencias de `siguientePregunta` sigue literal (`horario ← servicio + sede`). Consecuencia: en un trámite iniciado en WhatsApp, el orden servicio → sede → horario puede preguntar el horario antes de que haya paciente y requisitos; al elegirlo, el caso de uso responde `CASILLAS_PENDIENTES` con `paciente` y `requisitos` y el adaptador del canal los pide antes de apartar. En el Flujo A no ocurre, porque el asesor deja el trámite `LISTO_PARA_RESERVAR` antes de pasar a WhatsApp.
- Alternativa descartada por el responsable: apartar con `COTIZADO` y exigir `LISTO_PARA_RESERVAR` solo al confirmar.

### D3. Elegibilidad sin evento nuevo
La elegibilidad advierte y no bloquea (`PLAN.md` §5). Cuando hay servicio y paciente, el caso de uso obtiene `sexo` y `fechaNac` del puerto de pacientes y el dominio evalúa `perfil.elegibilidad` con la fecha del `Reloj`. Si cumple o el perfil no tiene regla, la casilla queda llena sin evento propio. Si no cumple, queda vacía con una advertencia (solo el código, sin datos) y se llena al reconocerla, emitiendo `RequisitoCumplido{ requisitoId: 'ELEGIBILIDAD' }`. Los datos del paciente no se guardan en el trámite ni en eventos.
- Alternativa: evento `ElegibilidadEvaluada`. Descartada aquí: cambia el vocabulario compartido (`docs/eventos.md`) y exigiría un cambio compartido.

### D4. Registro de tipos como tabla de datos
`RegistroTiposTramite` mapea `TipoTramite` a una `DefinicionTipoTramite`: `casillas`, `dependencias: Record<Casilla, Casilla[]>`, `ordenPorCanal: Record<Canal, Casilla[]>`, `pistas: Record<Casilla, PistaDominio>`, `transiciones` (tabla `comando → estados de origen → destino`) y `hitos` (función de casillas a estado). `registrar()` valida que cada orden sea una permutación de las casillas del tipo y que las dependencias no sean cíclicas, y lanza al registrar. La entidad consulta la tabla para aceptar o rechazar un comando (`TransicionInvalida`). `AGENDAR` vive en un módulo propio (`tipos/agendar.ts`) y es el único lugar donde aparece ese literal fuera del vocabulario. El registro es un objeto inyectado (no un singleton global), así las pruebas registran tipos ficticios sin efectos colaterales.
- Alternativa: clases por tipo con herencia. Descartada: más código y más difícil de verificar como "sin `if (tipo === …)`".

### D5. Versión, eventos e idempotencia
Cada método público que cambia el trámite recibe un `ContextoOperacion { canal, actor, nivelAuth, correlationId, idempotencyKey, ts }` (el `ts` lo pone el caso de uso desde `Reloj`). Incrementa `version` una vez y agrega sus eventos; si son varios, las claves son `<idempotencyKey>:<n>` empezando por 1, y si es uno, la clave tal cual. Para no dejar el trámite a medias, cada método valida todas sus guardas antes de mutar. La entidad recuerda `versionCargada`; `TramiteRepoMemoria.guardar(tramite)` compara con la versión almacenada, lanza `ConflictoVersion(esperada, actual)` si difiere, guarda una copia, añade los eventos a un registro en memoria (equivalente al outbox para pruebas) y vacía los pendientes. La idempotencia por `Idempotency-Key` del comando queda para `api-comandos`.

### D6. `siguientePregunta` en el dominio con forma del contrato
Función pura `siguientePregunta(tramite, canal, registro)` que devuelve `SiguientePreguntaDominio`, un tipo del dominio con la misma forma que `SiguientePregunta` de `contracts` (pista con `entrada`, `campos` con `captura`). El dominio no importa `contracts`; la prueba en `packages/adapters/in-http/test/` comprueba `expectTypeOf<SiguientePreguntaDominio>().toMatchTypeOf<SiguientePregunta>()` y valida en ejecución con `SiguientePreguntaSchema` la salida de cada casilla y `COMPLETO`. "Casilla llena" se decide en la entidad (`casillaLlena(c)`), no en la función.
- Orden de canales no definidos en `PLAN.md` §6 (aceptado por el responsable el 2026-11-24): `web` y `app` usan el de WhatsApp (regla "primero el estudio"); `clinica` es "presencial" con paciente → servicio → sede → requisitos → horario → elegibilidad.

### D7. Política de identidad
`PoliticaIdentidad.exigir(accion, contexto)` con `contexto = { actor, canal, nivel, vinculado, factores: ReadonlySet<Factor> }`. Una tabla `accion → requisito` (nivel mínimo, vínculo, factores obligatorios y grupos alternativos) define §8; un solo método evalúa la tabla y lanza `StepUpRequerido(nivel, faltantes)`. Para alternativas (`OTP` o `BOTON_APROBACION`) devuelve ambas en `factores`. Actores internos se omiten (spec "Acciones de personal interno"). `Factor` y `AccionProtegida` son tipos nuevos en un módulo del dominio (`identidad/politica.ts`), no en `vocabulario.ts`, porque no se replican en `contracts`; publicarlos en el contrato, si el frente B lo necesita, es un cambio compartido posterior.

### D8. Resolvedor de continuidad como servicio de aplicación
`ResolvedorContinuidad` en `application` (necesita puertos) recibe `{ canal, valorContacto, token?, folio?, fechaNac?, datosDeclarados? }` y devuelve una unión: `RETOMADO { tramiteId, pacienteId, nivel, metodo, resumen }`, `VARIOS { resumenes }` (mismo paciente), `REQUIERE_VERIFICACION { metodo: 'FOLIO_FECHA_NAC' | 'OTP' }`, `SIN_RESULTADO` (cubre ambiguo y sin coincidencia, sin datos) y `BLOQUEADO { hasta }`. El resumen de nivel 1 contiene solo `servicioId`, `sedeId`, `inicio?` y `canalOrigen`. El caso de uso `RetomarTramite` aplica el resultado: `CanalCambiado` (método según la fuente: `TOKEN_CC` o `TOKEN_WEB` del token, el `metodo` del vínculo existente en la prioridad 2, `FOLIO_FECHA_NAC` en las prioridades 3 y 4, que no retoman sin esa verificación según D7), `IdentidadVinculada` del contacto nuevo cuando la fuente fue un token con paciente o un folio con fecha verificada, `PacienteReconocido` para la prioridad 2, y devuelve `siguientePregunta` del canal nuevo. La comparación de fecha de nacimiento y la búsqueda por datos ocurren en el puerto de pacientes, que responde solo `coincide: boolean` o IDs; el resolvedor nunca recibe esos datos de vuelta. La emisión real del OTP queda fuera; el resultado solo lo pide.
- Intentos: puerto `RegistroIntentos` por contacto (`canal + valor`), bloqueo de 15 min. `IntentoVerificacionFallido` necesita `hiloId`: el caso de uso obtiene o crea el hilo del contacto antes de resolver.
- Prioridad 3: el puerto de contactos busca un contacto `callcenter` con el mismo número normalizado que el `wa_id` y devuelve sus hilos.

### D9. Puertos y adaptadores en memoria
En `packages/application/src/ports/`: `TramiteRepo` (`obtener`, `guardar`, `abiertosPorPaciente`, `abiertosPorHilo`, `porFolio`), `HiloRepo` (`obtener`, `guardar`, `porContacto`), `ContactosPort` (`buscar(canal, valor)`, `crear`, `vinculosDe`, `vincular`, `buscarTelefonoCapturado`), `VerificadorTokens` (`verificar(token)` que consume el `jti` → `{ tramiteId, hiloId, pacienteId?, nivel, canalOrigen, metodo }` o inválido; el adaptador en memoria incluye `emitir()` para pruebas y el caso de uso de continuidad del asesor, sin firma criptográfica), `PacientesPort` (`datosElegibilidad`, `coincideFechaNac`, `buscarPorDatos`), `CatalogoPort` (`oferta(servicioId, sedeId)` → precio o nulo, `sedesQueOfrecen`, `perfil`), `AgendaPort` (`apartar` → `{ reservaId, expiraEn }` con `ttlReservaMin` del perfil, `confirmar` → folio de 8–9 dígitos, `liberar`) y `RegistroIntentos`. Cada uno con su clase en `packages/adapters/memory/src/` (sufijo `Memoria`). Ningún adaptador importa otro adaptador.
- Errores del dominio no cambian: los cinco existentes cubren todo; las reglas nuevas son valores de `ReglaViolada.regla` (`SERVICIO_NO_DISPONIBLE_EN_SEDE`, `TIPO_TRAMITE_NO_REGISTRADO`, `CASILLAS_PENDIENTES`, `TOKEN_INVALIDO`).

### D10. Ubicación de pruebas
Pruebas en `tests/unit/nucleo/` (dominio y aplicación) y la de coherencia de `siguientePregunta` en `packages/adapters/in-http/test/`. Ambas rutas ya están incluidas en `vitest.config.ts` y `tests/tsconfig.json`, que no se modifican. Nombres en español y descriptivos. Las pruebas obligatorias de `AGENTS.md` §9 llevan un nombre reconocible y no pueden marcarse `skip`.

## Risks / Trade-offs

- [Con D2, WhatsApp puede preguntar el horario antes de poder apartarlo] → `CASILLAS_PENDIENTES` lista lo que falta; `api-comandos` y el simulador de WhatsApp deben tratar esa regla pidiendo esas casillas.
- [`factores` de `StepUpRequerido` sin contrato] → conjunto cerrado en el dominio y documentado en el informe; `api-comandos` decide si lo publica.
- [Repositorio en memoria no prueba atomicidad real] → la prueba de 50 reservas concurrentes contra Postgres queda para `persistencia-eventos`.
- [El `VerificadorTokens` en memoria no firma] → la interfaz ya exige un solo uso; `out-security` aporta jose después.
- [Muchos puertos para un cambio de 4 h] → cada adaptador en memoria es un `Map`; si el tiempo aprieta, se prioriza el grupo de continuidad (tareas 1–5) sobre llegada y cancelación.

## Migration Plan

Sin migraciones ni datos. Se integra en `main` según `docs/trabajo-paralelo.md` (rama `feat/nucleo-tramite`, dictamen `PASS`, controles en verde). `persistencia-eventos` reemplaza los adaptadores en memoria por los de Postgres en `apps/api/src/main.ts` sin tocar casos de uso.

## Open Questions

_Ninguna._ D2 y el orden de canales de D6 los decidió el responsable el 2026-11-24.
