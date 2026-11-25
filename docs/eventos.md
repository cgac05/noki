# Eventos del núcleo

La envoltura `EnvolturaEvento<T, P>` y la unión discriminada `EventoDominio` están en `packages/domain/src/eventos.ts`. El núcleo registra las transiciones del trámite y sus eventos en PostgreSQL mediante outbox. Un relay publica los eventos en Redis Streams, donde los procesan consumidores idempotentes por grupo.

## Envoltura común

Campos obligatorios: `tipo`, `tramiteId` (puede ser nulo), `hiloId`, `canal`, `actor`, `nivelAuth` (0–3), `version`, `correlationId`, `idempotencyKey`, `ts` y `payload`. `ts` es ISO 8601 UTC. Los identificadores como `TramiteId`, `HiloId` y `ReservaId` tienen marca de tipo; `huecoId`, `ofertaId` e `interesId` se tipan como `string`. El generador real produce UUID v7. Dinero en centavos enteros.

## Agendar e identidad/canal: eventos tipados

| Evento | Payload |
|---|---|
| `TramiteIniciado` | `{ tipoTramite: TipoTramite }` |
| `ServicioSeleccionado` | `{ servicioId: ServicioId }` |
| `SedeSeleccionada` | `{ sedeId: SedeId }` |
| `CotizacionGenerada` | `{ precioCentavos: number; vigenteHasta: string }` |
| `PreparacionAceptada` | `{ servicioId: ServicioId }` |
| `RequisitoCumplido` | `{ requisitoId: string }` |
| `PacienteAsignado` | `{ pacienteId: PacienteId }` |
| `DestinatarioDeclarado` | `{ relacion: 'TITULAR' \| 'FAMILIAR' }` |
| `PacienteRegistrado` | `{ pacienteId: PacienteId }` |
| `ItinerarioPropuesto` | `{ itinerarioId: string }` |
| `ItinerarioAceptado` | `{ itinerarioId: string }` |
| `HorarioReservado` | `{ reservaId: ReservaId; expiraEn: string }` |
| `ReservaExpirada` | `{ reservaId: ReservaId }` |
| `CitaConfirmada` | `{ folio: string }` |
| `CitaReprogramada` | `{ reservaAnteriorId: ReservaId; reservaId: ReservaId }` |
| `CitaCancelada` | `{ anticipacionHoras: number }` |
| `PacienteLlego` | `{ sedeId: SedeId }` |
| `TurnoActualizado` | `{ posicion: number }` |
| `AtencionCerrada` | `{ sedeId: SedeId }` |
| `Inasistencia` | `{ sedeId: SedeId }` |
| `TramiteSuspendido` | `{ ultimoCanal: Canal }` |
| `TramiteExpirado` | `{ motivo: string }` |
| `CanalCambiado` | `{ de: Canal; a: Canal; metodo: MetodoVinculo }` |
| `PacienteReconocido` | `{ pacienteId: PacienteId }` |
| `IdentidadVinculada` | `{ pacienteId: PacienteId; metodo: MetodoVinculo }` |
| `IdentidadComprobada` | `{ pacienteId: PacienteId; metodo: MetodoVinculo }` |
| `ConsentimientoOtorgado` | `{ version: string }` |
| `ConsentimientoContactoWA` | `{ consentimientoId: string }` |
| `IntentoVerificacionFallido` | `{ metodo: MetodoVinculo; intentos: number }` |

`TELEFONO_FECHA_NAC` identifica la comprobación de la fecha de nacimiento de un candidato vinculado al teléfono. Se usa en `IdentidadComprobada` y `IntentoVerificacionFallido`.

`LLAMADA_CC` se usa en `CanalCambiado` cuando un asesor retoma un trámite por el número de una llamada entrante. La operación conserva la identidad y los vínculos existentes. `MISMO_NUMERO` registra la retoma de una cita en proceso en WhatsApp por coincidencia del número, sin crear un vínculo de identidad.

Los payloads referencian personas por ID y no declaran fecha de nacimiento, correo, teléfono, RFC, PIN ni CURP. Los tokens de continuidad, QR y aprobaciones se implementarán en su cambio; nunca se deben sustituir por un folio en texto plano.

## Relleno de huecos: eventos tipados

| Evento | Payload |
|---|---|
| `InteresAdelantoRegistrado` | `{ interesId: string; servicioId: ServicioId }` |
| `InteresAdelantoCancelado` | `{ interesId: string }` |
| `HuecoLiberado` | `{ huecoId: string; sedeId: SedeId; recursoId: RecursoId; servicioId: ServicioId; inicio: string; estrategia: 'SECUENCIAL' \| 'OLEADA' }` |
| `OfertaEnviada` | `{ huecoId: string; ofertaId: string; expiraEn: string }` |
| `OfertaAceptada` | `{ huecoId: string; ofertaId: string }` |
| `OfertaRechazada` | `{ huecoId: string; ofertaId: string }` |
| `OfertaExpirada` | `{ huecoId: string; ofertaId: string }` |
| `OfertaPerdida` | `{ huecoId: string; ofertaId: string }` |
| `CitaAdelantada` | `{ reservaAnteriorId: ReservaId; reservaId: ReservaId; diasAdelantados: number }` |
| `HuecoAsignado` | `{ huecoId: string; ofertaId: string }` |
| `HuecoDesierto` | `{ huecoId: string }` |

`inicio` y `expiraEn` son ISO 8601 UTC. `diasAdelantados` es no negativo: las horas transcurridas entre el horario anterior y el nuevo divididas por 24.

`HuecoLiberado`, `HuecoAsignado` y `HuecoDesierto` pertenecen al trámite y al hilo de la cita que liberó el horario, mediante `tramiteId` e `hiloId` de la envoltura. Los eventos de interés, los de oferta y `CitaAdelantada` pertenecen al trámite `AGENDAR` y al hilo del candidato.

Por privacidad (`PLAN.md` §10.1), los payloads del candidato no incluyen `pacienteId`, `tramiteId` ni `origenReservaId` de quien liberó el horario. En `CitaAdelantada`, ambas reservas son del candidato. Ningún payload de huecos incluye nombres, contactos ni el token de la oferta. El mensaje al candidato solo muestra servicio, sede, fecha y hora; nunca quién canceló.

## Predicción: eventos tipados

| Evento | Payload |
|---|---|
| `RiesgoEstimado` | `{ nivel: NivelRiesgo; probabilidad: number; origen: 'MODELO' \| 'REGLAS'; versionModelo: string }` |

`NivelRiesgo` es `BAJO | MEDIO | ALTO`; `probabilidad` está entre 0 y 1. Los tipos se reutilizan de `prediccion/nivel.ts`. El evento pertenece al trámite estimado y a su hilo: `tramiteId` y la hora de estimación (`ts`) están en la envoltura, sin duplicarse en el payload.

Este cambio solo declara el evento; la T3 de predicción lo emitirá con actor `sistema`, `nivelAuth: 0`, el último canal del trámite y una clave de `GeneradorId` (UUID v7). El payload no contiene datos personales.

## Familias reservadas

Estos nombres de `PLAN.md` §7 están reservados y todavía no pertenecen a `EventoDominio`:

- Resultados: `ResultadoDisponible`, `ResultadoConsultado`.
- Seguimiento: `RecordatorioProgramado`, `RecordatorioEnviado`, `RecordatorioCancelado`, `AsistenciaConfirmada`, `PreparacionConfirmada`.
- Atención: `FriccionDetectada`, `DevolucionLlamadaSolicitada`, `DevolucionLlamadaAtendida`.
- Facturación: `FacturaSolicitada`, `DatosFiscalesCapturados`, `FacturaValidada`, `FacturaRechazada`, `FacturaEmitida`, `FacturaEnviada`.

PostgreSQL guarda el estado, el evento y su fila de outbox en la misma transacción. El relay publica en Redis Streams por partición de paciente o hilo, y cada grupo descarta los duplicados con su registro de claves de idempotencia.
