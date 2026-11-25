# Eventos del núcleo

La envoltura `EnvolturaEvento<T, P>` y la unión discriminada `EventoDominio` están en `packages/domain/src/eventos.ts`. El núcleo registra las transiciones del trámite y sus eventos en PostgreSQL mediante outbox. Un relay publica los eventos en Redis Streams, donde los procesan consumidores idempotentes por grupo.

## Envoltura común

Campos obligatorios: `tipo`, `tramiteId` (puede ser nulo), `hiloId`, `canal`, `actor`, `nivelAuth` (0–3), `version`, `correlationId`, `idempotencyKey`, `ts` y `payload`. `ts` es ISO 8601 UTC. Los identificadores del dominio tienen marca de tipo; el generador real produce UUID v7. Dinero en centavos enteros.

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

Los payloads referencian personas por ID y no declaran fecha de nacimiento, correo, teléfono, RFC, PIN ni CURP. Los tokens de continuidad, QR y aprobaciones se implementarán en su cambio; nunca se deben sustituir por un folio en texto plano.

## Familias reservadas

Estos nombres de `PLAN.md` §7 están reservados y todavía no pertenecen a `EventoDominio`:

- Resultados: `ResultadoDisponible`, `ResultadoConsultado`.
- Relleno de huecos: `InteresAdelantoRegistrado`, `InteresAdelantoCancelado`, `HuecoLiberado`, `OfertaEnviada`, `OfertaAceptada`, `OfertaRechazada`, `OfertaExpirada`, `OfertaPerdida`, `CitaAdelantada`, `HuecoAsignado`, `HuecoDesierto`.
- Seguimiento: `RecordatorioProgramado`, `RecordatorioEnviado`, `RecordatorioCancelado`, `AsistenciaConfirmada`, `PreparacionConfirmada`.
- Atención: `FriccionDetectada`, `DevolucionLlamadaSolicitada`, `DevolucionLlamadaAtendida`.
- Facturación: `FacturaSolicitada`, `DatosFiscalesCapturados`, `FacturaValidada`, `FacturaRechazada`, `FacturaEmitida`, `FacturaEnviada`.

PostgreSQL guarda el estado, el evento y su fila de outbox en la misma transacción. El relay publica en Redis Streams por partición de paciente o hilo, y cada grupo descarta los duplicados con su registro de claves de idempotencia.
