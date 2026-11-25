import { sql, type Kysely } from 'kysely';
import type { CandidatoParaOferta, DatosHuecoLiberado, EventoReservaLiberada, LecturasHuecos } from '@noki/application';
import type { PacienteId, ReservaId } from '@noki/domain';
import type { ContactosPostgres } from './ContactosPostgres.ts';
import type { TramiteRepoPostgres } from './TramiteRepoPostgres.ts';

export class LecturasHuecosPostgres implements LecturasHuecos {
  constructor(private readonly db: Kysely<unknown>, private readonly tramites: TramiteRepoPostgres,
    private readonly contactos: ContactosPostgres) {}

  async liberada(evento: EventoReservaLiberada): Promise<DatosHuecoLiberado | null> {
    if (evento.tipo === 'CitaAdelantada') return this.datos(evento.payload.reservaAnteriorId);
    const tramite = evento.tramiteId && await this.tramites.obtener(evento.tramiteId);
    return tramite && tramite.horario ? this.datos(tramite.horario.reservaId) : null;
  }

  async datos(id: ReservaId): Promise<DatosHuecoLiberado | null> {
    const { rows: [fila] } = await sql<Omit<DatosHuecoLiberado, 'inicio'> & { inicio: Date }>`
      SELECT r.id AS "origenReservaId", r.inicio, r.sede_id AS "sedeId", r.recurso_id AS "recursoId",
        t.id AS "tramiteId", t.hilo_id AS "hiloId", t.servicio_id AS "servicioId", s.nombre AS servicio,
        d.nombre AS sede, d.zona_horaria AS "zonaHoraria",
        (s.perfil->>'anticipacionMinimaHoras')::float8 AS "anticipacionMinimaHoras"
      FROM reserva r JOIN tramite t ON t.id = r.tramite_id JOIN servicio s ON s.id = t.servicio_id
      JOIN sede d ON d.id = r.sede_id WHERE r.id = ${id} AND r.folio IS NOT NULL
    `.execute(this.db);
    return fila ? { ...fila, inicio: fila.inicio.toISOString() } : null;
  }

  async candidatos(hueco: DatosHuecoLiberado, ts: string): Promise<CandidatoParaOferta[]> {
    type Fila = Pick<CandidatoParaOferta, 'interesId' | 'tramiteId' | 'servicioId' | 'sedesAceptadas' | 'recursoCompatible'>
      & { pacienteId: PacienteId; desde: Date; hasta: Date; registrado: Date; enviadas: Date[] };
    const { rows } = await sql<Fila>`
      SELECT i.id AS "interesId", i.tramite_id AS "tramiteId", i.paciente_id AS "pacienteId", i.servicio_id AS "servicioId",
        i.sedes_aceptadas AS "sedesAceptadas", lower(i.ventana) AS desde, upper(i.ventana) AS hasta,
        i.registrado_en AS registrado, i.servicio_id = ANY(r.servicios_compatibles) AS "recursoCompatible",
        ARRAY(SELECT o.enviada_en FROM oferta_hueco o JOIN interes_adelanto j ON j.id = o.interes_id
          WHERE j.paciente_id = i.paciente_id AND o.enviada_en > ${ts}::timestamptz - interval '7 days') AS enviadas
      FROM interes_adelanto i JOIN tramite t ON t.id = i.tramite_id JOIN recurso r ON r.id = ${hueco.recursoId}
      WHERE i.estado = 'ACTIVO' AND t.estado = 'CONFIRMADA' AND i.servicio_id = ${hueco.servicioId}
        AND i.tramite_id <> ${hueco.tramiteId} AND i.ventana @> ${hueco.inicio}::timestamptz
        AND ${hueco.sedeId}::uuid = ANY(i.sedes_aceptadas)
      ORDER BY i.registrado_en, i.id
    `.execute(this.db);
    const candidatos = await Promise.all(rows.map(async ({ pacienteId, desde, hasta, registrado, enviadas, ...fila }) => {
      const [tramite, contacto] = await Promise.all([
        this.tramites.obtener(fila.tramiteId), this.contactos.whatsappVigente(pacienteId, ts),
      ]);
      if (!tramite?.horario || tramite.pacienteId !== pacienteId || !contacto) return null;
      return {
        ...fila, hiloId: tramite.hiloId, contactoId: contacto.id, waId: contacto.valor, estado: 'ACTIVO' as const,
        ventanaDesde: desde.toISOString(), ventanaHasta: hasta.toISOString(), registradoEn: registrado.toISOString(),
        citaActualInicio: tramite.horario.inicio, requisitosCubiertos: tramite.casillaLlena('requisitos'),
        enviadasEn: enviadas.map(fecha => fecha.toISOString()),
      };
    }));
    return candidatos.flatMap(c => c ? [c] : []);
  }

  async pendientes(contactoId: string, ts: string): Promise<{ ofertaId: string; origenReservaId: ReservaId }[]> {
    const { rows } = await sql<{ ofertaId: string; origenReservaId: ReservaId }>`
      SELECT o.id AS "ofertaId", h.origen_reserva_id AS "origenReservaId"
      FROM oferta_hueco o JOIN hueco h ON h.id = o.hueco_id
      WHERE o.contacto_id = ${contactoId} AND o.estado = 'OFRECIDA' AND o.expira_en > ${ts} ORDER BY o.enviada_en, o.id
    `.execute(this.db);
    return rows;
  }
}
