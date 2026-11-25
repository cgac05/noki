# Design

## Context

Ver `proposal.md` (Why). Estado en `main` `44c57f4`:

- **Eventos:** `EVENTOS_DOMINIO` tiene 29 tipos y `tests/unit/dominio.test.ts` lo comprueba. Ya existen `CitaConfirmada`, `CitaReprogramada`, `AtencionCerrada` e `Inasistencia`, que son las señales de asistencia.
- **Persistencia:** `evento.canal` acepta solo los cinco canales y `evento.idempotency_key` exige un UUID con sufijo `:n` opcional (`002_persistencia`).
- **Temporizadores:** `TemporizadoresTramite` ya registra eventos de sistema con actor `sistema`, nivel 0, el último canal del trámite y claves de `GeneradorId`. Es el precedente para T3.
- **Recordatorios:** no existen. `PerfilServicio.recordatorios` ya declara `T48 | PREPARACION | T2 | POST` y `preparacion` el ayuno.
- **Zona horaria:** la aplicación no la consulta en ningún puerto del núcleo; `LecturasPort` la devuelve dentro de `CitaLeida`.
- **Fronteras:** `.dependency-cruiser.cjs`, línea 1, lista siete adaptadores: `memory`, `in-http`, `in-events`, `out-postgres`, `out-redis`, `out-sd` y `out-security`. Un adaptador que no esté en la lista no tiene la regla `adaptador-aislado-*`.
- **Herramientas:** `tsx` ya es dependencia de desarrollo de la raíz; no hay Python en el proyecto.

## Goals / Non-Goals

**Goals:** estimar el riesgo de inasistencia de una cita confirmada con un modelo entrenado y versionado, con respaldo determinista, y dejar listo el plan de recordatorios por nivel, sin cambiar nada que use el Flujo A.

**Non-Goals:** publicar el riesgo (T3), mostrarlo (T4), aplicar el plan a recordatorios reales (T5–T6), entrenar con datos reales.

## Decisions

### D1. Qué se predice
La probabilidad de que una cita `CONFIRMADA` termine en `Inasistencia`. Es una sola probabilidad por cita, calculada en el momento de la estimación. No se predice la cancelación ni la reprogramación, porque esas ya liberan el horario por sí mismas.

### D2. Entrenamiento en TypeScript con datos sintéticos
`ml/` contiene tres scripts que se ejecutan con `node --import tsx` (sin agregar scripts a `package.json`, que es compartido):

1. `generarDatos.ts`: genera citas sintéticas con un generador pseudoaleatorio con semilla fija (no `Math.random`). La probabilidad real de cada cita sale de una regla conocida con ruido, para que el entrenamiento tenga algo que aprender.
2. `entrenar.ts`: estandariza los factores y ajusta una regresión logística con descenso de gradiente y regularización L2. Separa 80/20 por semilla.
3. `evaluar.ts` (llamado por `entrenar.ts`): calcula AUC y Brier en el 20 % y los compara con la estimación por reglas de D6.

Escribe `packages/adapters/out-modelo/modelo/riesgo-inasistencia.json` y `ml/metricas.json`. La misma semilla MUST producir los mismos bytes.

*Alternativas descartadas:* Python con scikit-learn, porque agrega un segundo lenguaje e instalación al demo (`AGENTS.md` §13); un LLM, porque §13 lo prohíbe en el núcleo y no aporta a un problema tabular.

**Riesgo aceptado:** con datos sintéticos el modelo solo demuestra el mecanismo. Las métricas se presentan como de datos sintéticos y el README de `ml/` lo dice.

### D3. Canal del evento en T3 (preliminar, no se implementa aquí)
`RiesgoEstimado` usará el último canal del trámite, actor `sistema` y nivel 0, como los temporizadores. Así cumple el CHECK de `evento.canal` sin migración y no produce `CanalCambiado`.

### D4. Clave del evento en T3 (preliminar, no se implementa aquí)
La clave vendrá de `GeneradorId` (UUID v7), que cumple `evento_clave_formato`. La idempotencia del consumidor la da `evento_procesado`, como en los demás grupos. Revisión 3: el tipo `RiesgoEstimado` no se agrega a `EVENTOS_DOMINIO` ni a `docs/eventos.md` en este cambio.

### D5. Factores sin datos personales
`FACTORES_RIESGO` fija el nombre y el orden de doce valores numéricos:

| Factor | Valor |
|---|---|
| `anticipacionLog` | `ln(1 + días entre la estimación y el inicio)` |
| `inasistenciasPrevias` | inasistencias del paciente antes de la estimación, tope 5 |
| `atencionesPrevias` | atenciones cerradas antes de la estimación, tope 10 |
| `requierePreparacion` | 1 si el perfil tiene `preparacion` |
| `esConsulta` | 1 si el perfil es `CONSULTA` |
| `franjaTarde` | 1 si la hora local de inicio es 12:00 o después |
| `finDeSemana` | 1 si el inicio cae en sábado o domingo en la zona de la sede |
| `canalWeb`, `canalWhatsapp`, `canalApp`, `canalCallcenter` | 1 según el último canal del trámite; `clinica` es la base (todos en 0) |
| `primeraCita` | 1 si no hay atenciones ni inasistencias previas |

El modelo MUST NOT usar sexo, edad, CURP, nombre, teléfono, ubicación ni sede: no son necesarios y podrían discriminar. `vectorFactores` vive en el dominio y lo usan tanto `ml/` (por ruta relativa) como `out-modelo`, para que el orden no se desincronice.

**Revisión 4:** el dominio no convierte zonas horarias (`AGENTS.md` §6). `factoresDesde` recibe la hora y el día locales del inicio ya calculados (`{ hora, diaSemana }`). Los calcula el caso de uso con el puerto `CalendarioSede` (D12).

### D6. Niveles y respaldo determinista
- `nivelDesde(p)`: `BAJO` si `p < 0.20`, `MEDIO` si `0.20 ≤ p < 0.40`, `ALTO` si `p ≥ 0.40`. Fuera de `[0, 1]` o `NaN` lanza `ReglaViolada('PROBABILIDAD_INVALIDA')`.
- `probabilidadPorReglas(f)`: suma fija y transparente, `0.08 + 0.12·min(inasistencias, 2) + 0.06·[anticipación > 14 días] + 0.04·primeraCita + 0.03·requierePreparacion − 0.02·min(atenciones, 3)`, acotada a `[0.01, 0.95]`.
- `EstimarRiesgoInasistencia` usa `ModeloRiesgo`. Si el modelo lanza un error o devuelve una probabilidad inválida, usa las reglas, marca `origen: 'REGLAS'` y registra el error con `correlation_id` y sin datos personales. Así el núcleo sigue siendo determinista y nunca falla por el modelo (`AGENTS.md` §13).

### D7. Puertos y caso de uso
**Revisión 4:** los tres puertos del módulo (`ModeloRiesgo`, `LecturasPrediccion` y `CalendarioSede`) van en `packages/application/src/ports/prediccion.ts`, como exige `AGENTS.md` §5.4. En `packages/application/src/prediccion/` quedan solo el caso de uso y `horaEnvio`.

- `ModeloRiesgo.estimar(vector): Promise<{ probabilidad: number; versionModelo: string }>`.
- `LecturasPrediccion`: `historial(pacienteId, antesDe): Promise<{ atenciones: number; inasistencias: number }>` y `zonaSede(sedeId): Promise<string | null>`. Un solo puerto para las dos lecturas que el módulo necesita, sin ampliar `LecturasPort`.
- `EstimarRiesgoInasistencia.ejecutar(tramiteId, correlationId)` carga el trámite con `TramiteRepo`. Exige estado `CONFIRMADA` con horario, paciente, sede y perfil; si no, lanza `ReglaViolada('RIESGO_SOLO_CITA_CONFIRMADA')`. Sin zona de la sede lanza `NoEncontrado('sede')`. Antes de llamar a `factoresDesde`, convierte el inicio a hora y día locales con `CalendarioSede.local`. Devuelve `RiesgoEstimado { tramiteId, nivel, probabilidad, origen, versionModelo, estimadoEn }`, con la probabilidad redondeada a dos decimales. MUST NOT guardar el trámite ni registrar eventos.

*Alternativa descartada:* ampliar `LecturasPort`, que tiene adaptadores en memoria y Postgres en uso por la API: obligaría a tocar archivos existentes ya en T1.

### D8. Formato y carga del modelo
El JSON tiene `version` (por ejemplo `riesgo-inasistencia@1`), `factores` (los nombres en orden), `medias`, `desviaciones`, `coeficientes` e `intercepto`. `out-modelo` exporta:

- `leerModeloRiesgo(texto)`: valida con Zod (ya presente en el workspace) y además que `factores` sea igual a `FACTORES_RIESGO` y que los arreglos tengan su largo y valores finitos, con desviaciones mayores que 0. Si no, lanza un error tipado `ModeloInvalido` con el motivo.
- `ModeloRiesgoLogistico`: implementa `ModeloRiesgo` con `sigmoide(intercepto + Σ coef·(x − media)/desv)`.
- `cargarModeloRiesgo(ruta)`: lee el archivo con `node:fs` y llama a `leerModeloRiesgo`. Lo usará `main.ts` en T3.

### D9. Plan de recordatorios por nivel (T2, sin aplicar)
`planPorNivel(nivel, recordatoriosPerfil, opciones?)` devuelve los recordatorios de la cita como `{ tipo, variante }`:

| Nivel | Recordatorios | Variante |
|---|---|---|
| `BAJO` | los del perfil | `ESTANDAR` |
| `MEDIO` | los del perfil | `CONFIRMAR` |
| `ALTO` | los del perfil + `REFUERZO` (24 h antes) | `CONFIRMAR_Y_FACILITAR_CAMBIO` |

`DEVOLUCION_LLAMADA` se agrega al nivel alto solo con `opciones.devolucionLlamada === true`. Por defecto vale `false`, porque la devolución de llamada de §10.5 todavía no existe: el nivel alto queda solo con `REFUERZO`, como acordaron los dos frentes. `varianteDesde(nivel)` es la columna de variante. `POST` nunca cambia de variante, porque ocurre después de la atención.

La variante `CONFIRMAR_Y_FACILITAR_CAMBIO` ofrece reprogramar o cancelar con un toque: una cancelación anticipada libera el hueco (§10.1). El paciente nunca ve el nivel ni la probabilidad; solo recibe el texto de su variante.

### D10. Hora de envío
**Revisión 4:** `horaEnvio` sale del dominio y va en `packages/application/src/prediccion/horaEnvio.ts`, porque convierte entre UTC y la zona de la sede. Recibe el `CalendarioSede` como argumento y no tiene estado ni otros efectos, así que el cambio de recordatorios solo tiene que llamarla. El dominio conserva lo que no depende de la zona: el desplazamiento nominal de cada tipo y `enSilencio(hora, minuto, silencio)`.

`horaEnvio(tipo, inicio, zonaHoraria, silencio, ahora, calendario)` recibe y devuelve instantes ISO en UTC (o `null`):

- Hora nominal: `T48` = inicio − 48 h; `REFUERZO` = inicio − 24 h; `T2` = inicio − 2 h; `PREPARACION` = 18:00 locales del día anterior; `POST` y `DEVOLUCION_LLAMADA` = `null` (no dependen del inicio).
- Si la hora nominal cae dentro del silencio (`{ desde, hasta }` en `HH:MM` locales; puede cruzar la medianoche), se mueve al final del silencio.
- Si la hora resultante es anterior a `ahora`, o no queda al menos 30 min antes del inicio, devuelve `null` (no se envía).

El silencio lo recibe como parámetro: `preferencias_contacto` todavía no existe y la llenará el cambio de recordatorios.

### D11. Archivos compartidos y nuevos
- Solo `.dependency-cruiser.cjs` es compartido: `'out-modelo'` se agrega a `adaptadores` y nada más.
- Los tres `index.ts` reciben solo líneas `export`.
- `pnpm-lock.yaml` cambia por el importador nuevo `packages/adapters/out-modelo`. Sus dependencias son `@noki/domain`, `@noki/application`, `zod` 4.1.13 y `date-fns-tz` 3.2.0, ya en el workspace con esas versiones. Quien integre hace rebase antes, según `docs/trabajo-paralelo.md`.
- Las pruebas van en `tests/unit/prediccion/`, que el proyecto `unitarios` ya incluye y `tests/tsconfig.json` ya compila. Al importar `ml/` desde las pruebas, `tsc` también comprueba sus tipos.

### D12. Puerto `CalendarioSede` (revisión 4)
`CalendarioSede` tiene dos operaciones, las dos con instantes en UTC:

- `local(instante, zona)`: devuelve `{ fecha: 'YYYY-MM-DD', hora, minuto, diaSemana }` en la zona IANA de la sede (`diaSemana` 0 = domingo).
- `aUtc(fecha, hora, minuto, zona)`: devuelve el instante ISO UTC de esa hora local.

El adaptador real `CalendarioSedeDateFns` va en `out-modelo`, con `date-fns-tz`, que ya usan `in-http` y `memory`. Va ahí para no crear otro paquete ni tocar otra línea de `.dependency-cruiser.cjs`. `CalendarioSedeMemoria` va en `memory` con la misma biblioteca, para que las pruebas den los mismos resultados.

*Alternativa descartada:* `Intl` dentro del dominio (revisión 3), porque contradice `AGENTS.md` §6, que deja la conversión de zona fuera del dominio.

### D13. Excepción temporal a `AGENTS.md` §5.4 (revisión 4)
En T0–T2, `LecturasPrediccion` tiene solo su adaptador en memoria. El de Postgres va en T3, cuando `main.ts` conecte el caso de uso; hasta entonces nada lo usa fuera de las pruebas. La excepción se cierra en T3, que MUST incluir ese adaptador y una batería compartida contra memoria y Postgres. `ModeloRiesgo` y `CalendarioSede` cumplen §5.4 desde este cambio, con su adaptador real en `out-modelo` y otro en `memory`.

## Risks / Trade-offs

- **Zona horaria (D12):** la conversión usa `date-fns-tz`, igual que `in-http` y `memory`. Las pruebas fijan Tepic (`America/Mazatlan`) y Bahía de Banderas (`America/Bahia_Banderas`).
- **`LecturasPrediccion` sin Postgres hasta T3 (D13):** en T0–T2 solo la usan las pruebas.
- **Datos sintéticos (D2):** el modelo aprende la regla con la que se generaron los datos. Mitigación: se dice en la presentación y en `ml/README.md`; la versión del modelo queda en cada estimación.
- **Umbrales fijos (D6):** 0.20 y 0.40 se eligieron para el demo. Con datos reales se recalibrarían; el cambio sería de una constante.
- **Sin efecto visible hasta T3:** este cambio no se ve en el demo. Es intencional: no toca el Flujo A.

## Migration Plan

Sin migraciones. Para revertir basta con quitar los archivos nuevos, las líneas `export` y la línea de `.dependency-cruiser.cjs`.

## Open Questions

Ninguna que bloquee T0–T2. T3 retomará D3 y D4 y decidirá qué campos lleva el payload de `RiesgoEstimado`, con el visto bueno de ambos frentes por `docs/eventos.md`.
