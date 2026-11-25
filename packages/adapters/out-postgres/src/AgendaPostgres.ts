import { sql, type Kysely } from 'kysely';
import type { AgendaPort, SolicitudReserva } from '@noki/application';
import { ReglaViolada, type RecursoId, type ReservaId } from '@noki/domain';

export class AgendaPostgres implements AgendaPort {
  constructor(private readonly db: Kysely<unknown>) {}

  async apartar(solicitud: SolicitudReserva): Promise<{ reservaId: ReservaId; expiraEn: string }> {
    const { reservaId, sedeId, servicioId, tramiteId, inicio, ts, ttlReservaMin, recursoId } = solicitud;
    const expiraEn = new Date(Date.parse(ts) + ttlReservaMin * 60_000).toISOString();
    return this.db.transaction().execute(async (tx) => {
      const filtro = recursoId ? sql`AND id = ${recursoId}` : sql``;
      const recursos = await sql<{ id: RecursoId }>`SELECT id FROM recurso
        WHERE sede_id = ${sedeId} AND ${servicioId}::uuid = ANY(servicios_compatibles) ${filtro}
        ORDER BY id FOR UPDATE`.execute(tx);
      for (const { id } of recursos.rows) {
        await sql`UPDATE reserva SET estado = 'EXPIRADA' WHERE sede_id = ${sedeId} AND recurso_id = ${id}
          AND inicio = ${inicio} AND estado = 'APARTADA' AND expira_en <= ${ts}`.execute(tx);
        const resultado = await sql`INSERT INTO reserva (id, sede_id, recurso_id, inicio, tramite_id, estado, expira_en)
          VALUES (${reservaId}, ${sedeId}, ${id}, ${inicio}, ${tramiteId}, 'APARTADA', ${expiraEn})
          ON CONFLICT DO NOTHING RETURNING id`.execute(tx);
        if (resultado.rows.length) return { reservaId, expiraEn };
      }
      throw new ReglaViolada('HORARIO_NO_DISPONIBLE');
    });
  }

  async confirmar(reservaId: ReservaId, folio: string, ts: string): Promise<void> {
    try {
      const resultado = await sql`UPDATE reserva SET estado = 'CONFIRMADA', folio = ${folio}
        WHERE id = ${reservaId} AND estado = 'APARTADA' AND expira_en > ${ts} RETURNING id`.execute(this.db);
      if (resultado.rows.length) return;
    } catch (error) {
      if (typeof error !== 'object' || !error || !('code' in error) || error.code !== '23505') throw error;
      throw new ReglaViolada('HORARIO_NO_DISPONIBLE');
    }
    const existente = await sql`SELECT id FROM reserva WHERE id = ${reservaId}
      AND estado = 'CONFIRMADA' AND folio = ${folio}`.execute(this.db);
    if (!existente.rows.length) throw new ReglaViolada('HORARIO_NO_DISPONIBLE');
  }

  async liberar(reservaId: ReservaId): Promise<void> {
    await sql`UPDATE reserva SET estado = 'CANCELADA' WHERE id = ${reservaId}
      AND estado IN ('APARTADA','CONFIRMADA')`.execute(this.db);
  }

  async expirar(reservaId: ReservaId): Promise<void> {
    await sql`UPDATE reserva SET estado = 'EXPIRADA' WHERE id = ${reservaId} AND estado = 'APARTADA'`.execute(this.db);
  }
}
