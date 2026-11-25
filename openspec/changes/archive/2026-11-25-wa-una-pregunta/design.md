# Design

## Context

Ver `proposal.md` (Why).

- `ConversacionWa` guarda por contacto un `Estado` validado con Zod en `conversacion_wa` (`tramiteId`, `horario` preferido, `opciones` con payloads opacos `op:<uuid>` del último mensaje).
- `siguientePregunta` devuelve la casilla y, para `paciente`, una `PistaDominio` con `paso` y `campos` (`packages/domain/src/tipos/agendar.ts`). Para `DATOS`: `nombre`, `apellidoPaterno`, `apellidoMaterno` (opcional) y, si no hay CURP, `fechaNac` (si falta), `sexo` y `entidadNacimiento`.
- `IdentificarPacienteSchema` acepta `DATOS` en un solo comando (`strictObject`, `sexo: F|M|X`, `entidadNacimiento` en `ENTIDADES_NACIMIENTO`).
- `MensajeBot`: `botones` admite de 1 a 3 opciones y `lista` hasta 10 filas en total. Un `flow` puede tener un solo campo.
- `sd-mock` genera folios con `let secuencia = 10_000_000` en memoria. `reserva.folio` tiene índice único en Postgres.

## Goals / Non-Goals

**Goals:** que en `/wa` cada mensaje del bot haga una sola pregunta, que sexo y entidad se elijan, que se pueda escoger día, y que el Flujo A concluya en «Cita confirmada» con la API real aunque `sd-mock` se reinicie.

**Non-Goals:** cambiar dominio, contratos, `apps/web` ni la máquina de agendado.

## Decisions

### D1. Día y hora en dos preguntas
Cuando la casilla es `horario`:

1. Si `estado.dia` no está definido, el bot consulta la disponibilidad desde hoy (en la zona de la sede) y recorre hasta 14 fechas, en paralelo o en serie, quitando horarios ocupados o ya pasados, y se queda con los primeros 7 días con al menos un horario. Envía la lista «¿Qué día prefieres?» con filas «jue 26 nov» (formato `EEE d MMM`, `es`). Acción nueva `{ tipo: 'dia', fecha }`.
2. Con `estado.dia`, envía la lista «¿A qué hora?» con los horarios libres de ese día en formato `HH:mm`. Si caben, todas las horas más «Elegir otro día»; si no, 8 horas, «Ver más horarios» (`{ tipo: 'paginaHora', pagina }`) y «Elegir otro día» (`{ tipo: 'otroDia' }`). La página se guarda en `estado.paginaHora`.
3. Elegir hora conserva el comportamiento actual (`estado.horario` preferido y reserva cuando el trámite está `LISTO_PARA_RESERVAR`). Al reservar o al confirmar se borran `dia` y `paginaHora`. Si el día elegido se queda sin horarios, el bot vuelve a la pregunta del día.

La pregunta del día no consulta más de 14 fechas por mensaje para acotar las llamadas a la agenda externa.

*Alternativa descartada:* una sola lista con horarios de varios días. Con el tope de 10 filas solo caben unas horas de un día.

### D2. `DATOS` pregunta un campo por mensaje
`mensajesIdentificacion` deja de enviar un Flow con varios campos cuando la pista es `DATOS`. El adaptador toma el primer campo de `pista.campos` que no esté en `estado.datos` y envía solo esa pregunta:

| Campo | Mensaje |
|---|---|
| `nombre`, `apellidoPaterno` | Flow de un campo `sensitive`, requerido |
| `apellidoMaterno` | Flow de un campo `sensitive` no requerido, más botón «No tengo» (guarda vacío) |
| `fechaNac` | Flow de un campo `sensitive`, requerido |
| `sexo` | Botones «Mujer» (`F`), «Hombre» (`M`), «No binario» (`X`) |
| `entidadNacimiento` | Lista paginada (D4) |

Cada respuesta se valida con el esquema del campo correspondiente (el mismo de `IdentificarPacienteSchema`). Si no valida, el bot repite esa misma pregunta, sin contar intento. Cuando están todos, arma un solo `IdentificarPaciente` `{ paso: 'DATOS', ... }` y lo ejecuta como hoy. `FECHA_NAC` y `CURP` ya son de un solo campo y no cambian.

*Alternativa descartada:* cambiar la pista del dominio para tener un paso por campo. Movería la máquina de identificación y el contrato, que son de varios canales.

### D3. Respuestas parciales en el estado de la conversación
`Estado` agrega `datos?: Record<string, string>` con las respuestas ya dadas. Reglas:

- se borra al enviar el comando `DATOS` (con éxito o con error de dominio), al cambiar de trámite (retomar otro o iniciar uno nuevo) y cuando el paso de la pista deja de ser `DATOS`;
- ningún texto del bot repite esos valores (requisito existente);
- no se registran en logs (el `redact` actual no cubre `nombre` ni apellidos dentro de `estado`, y `ConversacionWa` no los registra).

*Riesgo aceptado:* mientras se contesta, nombre y apellidos quedan en `conversacion_wa.estado` (jsonb), con la misma protección que el resto de la base de demo. Se limpian al terminar el paso.

### D4. Entidad de nacimiento con lista paginada
`textosWa.ts` agrega `nombreEntidad: Record<EntidadNacimiento, string>` («Aguascalientes», …, «Ciudad de México» para `DF`, …, «Nací en el extranjero» para `NE`). La lista muestra los estados en orden alfabético por nombre, 9 por página y «Más estados» como décima fila (`{ tipo: 'paginaEntidad', pagina }`); «Nací en el extranjero» va al final de la última página. La página actual vive en `estado.paginaEntidad`.

### D5. Folios de `sd-mock` sin repetirse entre arranques (revisión 2)
`crearSdMock` recibe un reloj opcional (por defecto `Date.now`). Cada arranque toma un bloque propio de 1000 folios por segundo: la secuencia inicial es `100_000_000 + (segundosDesdeEpoch % 899_999) * 1000`, siempre de 9 dígitos, y aumenta de uno en uno dentro de la corrida. Dos arranques separados por `n ≥ 1` segundos no se solapan mientras el anterior emita menos de `1000 · n` folios, lo cual sobra para la demo. Los folios sembrados (`9000000x`, 8 dígitos) quedan fuera de ese rango. El ciclo se repite cada 899 999 segundos (unos 10 días); la garantía del requisito se limita a arranques separados por menos de ese ciclo (revisión 3, por la segunda pausa de Codex).

*Revisión 2:* la revisión 1 usaba `segundos % 800_000_000` con paso 1, y Codex mostró que un arranque un segundo después empezaba en el segundo folio del anterior (`implementacion.md`).

*Alternativa descartada:* que el núcleo reintente con otro folio al chocar. La causa está en el simulado, y el núcleo no puede pedir un folio distinto para la misma reserva.

### D6. Agenda que no responde
En `ConversacionWa`, `ReglaViolada` `AGENDA_NO_DISPONIBLE` se muestra como «La agenda no respondió. Intenta de nuevo en un momento.». `HORARIO_NO_DISPONIBLE` y los demás errores conservan su texto.

## Risks / Trade-offs

- **Reserva atascada tras un fallo de confirmación local:** si `AgendaPostgres.confirmar` falla después de registrar la cita externa, el núcleo la cancela y el trámite sigue `HORARIO_RESERVADO` hasta que vence la reserva; los reintentos fallan. D5 quita la causa que se observó; liberar la reserva antes de tiempo cambiaría la máquina de agendado y queda para otro cambio.
- **Más llamadas a la agenda externa:** la pregunta del día puede consultar hasta 14 fechas. Con `sd-mock` local son milisegundos; con fallos simulados el bot puede responder «La agenda no respondió».
- **Datos parciales en `conversacion_wa`** (D3).
- **Ciclo de folios de `sd-mock`:** una base de demo con citas de hace unos 10 días puede volver a chocar con un folio (D5).
