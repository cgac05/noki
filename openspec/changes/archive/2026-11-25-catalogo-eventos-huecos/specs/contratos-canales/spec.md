# Spec Delta

## ADDED Requirements

### Requirement: Eventos del relleno de huecos y de la predicción
La unión de eventos de dominio SHALL incluir, con la envoltura común y un payload tipado, los once eventos del relleno de huecos de `PLAN.md` §7 y `RiesgoEstimado`. `docs/eventos.md` SHALL documentar los mismos nombres y payloads en sus tablas de eventos tipados:

| Evento | Payload |
|---|---|
| `InteresAdelantoRegistrado` | `interesId`, `servicioId` |
| `InteresAdelantoCancelado` | `interesId` |
| `HuecoLiberado` | `huecoId`, `sedeId`, `recursoId`, `servicioId`, `inicio` ISO UTC, `estrategia` (`SECUENCIAL`, `OLEADA`) |
| `OfertaEnviada` | `huecoId`, `ofertaId`, `expiraEn` ISO UTC |
| `OfertaAceptada`, `OfertaRechazada`, `OfertaExpirada`, `OfertaPerdida` | `huecoId`, `ofertaId` |
| `CitaAdelantada` | `reservaAnteriorId`, `reservaId`, `diasAdelantados` (número no negativo) |
| `HuecoAsignado` | `huecoId`, `ofertaId` |
| `HuecoDesierto` | `huecoId` |
| `RiesgoEstimado` | `nivel` (`BAJO`, `MEDIO`, `ALTO`), `probabilidad` entre 0 y 1, `origen` (`MODELO`, `REGLAS`), `versionModelo` |

Pertenencia de los eventos:
- `HuecoLiberado`, `HuecoAsignado` y `HuecoDesierto` SHALL pertenecer al trámite y al hilo de la cita que liberó el horario.
- Los eventos de interés, de oferta y `CitaAdelantada` SHALL pertenecer al trámite y al hilo del candidato.
- `RiesgoEstimado` SHALL pertenecer al trámite estimado, con actor `sistema`; la hora de la estimación es el `ts` de la envoltura.

Para respetar la privacidad de `PLAN.md` §10.1, los payloads de interés, de oferta y `CitaAdelantada` MUST NOT referenciar al paciente, al trámite ni a la reserva de quien liberó el horario. `docs/eventos.md` MUST NOT listar en «Familias reservadas» ninguno de estos doce eventos.

#### Scenario: Catálogo completo
- **WHEN** se inspecciona la lista de eventos de dominio
- **THEN** tiene 41 eventos, coincide con los tipos de la unión e incluye los once de huecos y `RiesgoEstimado`

#### Scenario: Payload de un evento nuevo
- **WHEN** se construye `RiesgoEstimado` sin `nivel` o con el payload de `HuecoLiberado`
- **THEN** la verificación de tipos falla

#### Scenario: Oferta sin datos de quien canceló
- **WHEN** se inspeccionan los tipos de payload de los eventos de interés, de oferta y `CitaAdelantada`
- **THEN** ninguno declara `pacienteId`, `tramiteId` ni `origenReservaId`

#### Scenario: Documento y código coinciden
- **WHEN** se comparan los eventos de las tablas de eventos tipados de `docs/eventos.md` con la lista de eventos de dominio
- **THEN** los nombres coinciden, y ninguno de los doce aparece en «Familias reservadas»
