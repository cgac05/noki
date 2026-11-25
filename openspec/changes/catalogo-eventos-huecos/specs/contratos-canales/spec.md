# Spec Delta

## ADDED Requirements

### Requirement: Eventos del relleno de huecos y de la predicción
La unión de eventos de dominio SHALL incluir, con la envoltura común y un payload tipado, los once eventos del relleno de huecos de `PLAN.md` §7 y `RiesgoEstimado`, y `docs/eventos.md` SHALL documentar los mismos nombres y payloads:

| Evento | Payload |
|---|---|
| `InteresAdelantoRegistrado` | `interesId`, `servicioId`, `sedesAceptadas` (lista de sedes), `ventanaDesde` y `ventanaHasta` ISO UTC |
| `InteresAdelantoCancelado` | `interesId` |
| `HuecoLiberado` | `huecoId`, `sedeId`, `recursoId`, `inicio` ISO UTC, `origenReservaId` |
| `OfertaEnviada` | `huecoId`, `ofertaId`, `interesId`, `expiraEn` ISO UTC |
| `OfertaAceptada`, `OfertaRechazada`, `OfertaExpirada`, `OfertaPerdida` | `huecoId`, `ofertaId` |
| `CitaAdelantada` | `huecoId`, `reservaAnteriorId`, `reservaId`, `diasAdelantados` (número no negativo) |
| `HuecoAsignado` | `huecoId`, `ofertaId` |
| `HuecoDesierto` | `huecoId` |
| `RiesgoEstimado` | `nivel` (`BAJO`, `MEDIO`, `ALTO`), `probabilidad` entre 0 y 1, `origen` (`MODELO`, `REGLAS`), `versionModelo` |

`HuecoLiberado`, `HuecoAsignado` y `HuecoDesierto` SHALL pertenecer al trámite cuya cita liberó el horario; los eventos de interés, de oferta y `CitaAdelantada` SHALL pertenecer al trámite del candidato. Para respetar la privacidad de `PLAN.md` §10.1, los payloads de interés, de oferta y `CitaAdelantada` MUST NOT referenciar al paciente, al trámite ni a la reserva de quien liberó el horario. `RiesgoEstimado` SHALL pertenecer al trámite estimado, con actor `sistema`; la hora de la estimación es el `ts` de la envoltura.

#### Scenario: Catálogo completo
- **WHEN** se inspecciona la lista de eventos de dominio
- **THEN** tiene 41 eventos, coincide con los tipos de la unión e incluye los doce nuevos

#### Scenario: Payload de un evento nuevo
- **WHEN** se construye `CitaAdelantada` sin `diasAdelantados` o con el payload de `HuecoLiberado`
- **THEN** la verificación de tipos falla

#### Scenario: Oferta sin datos de quien canceló
- **WHEN** se inspeccionan los tipos de payload de los eventos de interés, de oferta y `CitaAdelantada`
- **THEN** ninguno declara `pacienteId`, `tramiteId` ni `origenReservaId`

#### Scenario: Documento y código coinciden
- **WHEN** se comparan los eventos y payloads de `docs/eventos.md` con la unión de eventos
- **THEN** los nombres y los campos coinciden, y ninguno de los doce aparece ya en «Familias reservadas»
