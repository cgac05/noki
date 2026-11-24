import { Pool, type PoolClient } from 'pg';
import type { FilaOutbox, OutboxPort, ParticionOutbox } from '@noki/application';

const espacioBloqueo = 745310;

export class OutboxPostgres implements OutboxPort {
  private readonly pool: Pool;

  constructor(url: string) {
    this.pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000, max: 8 });
  }

  async tomarParticion(particion: number): Promise<ParticionOutbox | null> {
    const cliente = await this.pool.connect();
    try {
      const { rows } = await cliente.query<{ tomada: boolean }>(
        'SELECT pg_try_advisory_lock($1::integer,$2::integer) AS tomada', [espacioBloqueo, particion],
      );
      if (rows[0]?.tomada) return this.arrendar(cliente, particion);
      cliente.release();
      return null;
    } catch (error) {
      cliente.release(true);
      throw error;
    }
  }

  async cerrar(): Promise<void> { await this.pool.end(); }

  private arrendar(cliente: PoolClient, particion: number): ParticionOutbox {
    let liberada = false;
    const conexionInterrumpida = () => {};
    cliente.on('error', conexionInterrumpida);
    return {
      pendientes: async (limite) => (await cliente.query<FilaOutbox>(`
        SELECT o.id, jsonb_build_object(
          'tipo', e.tipo, 'tramiteId', e.tramite_id, 'hiloId', e.hilo_id, 'canal', e.canal,
          'actor', e.actor, 'nivelAuth', e.nivel_auth, 'version', e.version,
          'correlationId', e.correlation_id, 'idempotencyKey', e.idempotency_key,
          'ts', to_char(e.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'payload', e.payload
        ) AS evento
        FROM outbox o JOIN evento e ON e.id = o.evento_id
        WHERE o.particion = $1 AND o.publicado_en IS NULL
        ORDER BY o.creado_en, o.id LIMIT $2`, [particion, limite])).rows,
      marcarPublicado: async (id, ts) => {
        await cliente.query('UPDATE outbox SET publicado_en = $1, ultimo_error = NULL WHERE id = $2 AND particion = $3', [ts, id, particion]);
      },
      marcarFallo: async (id) => {
        await cliente.query('UPDATE outbox SET intentos = intentos + 1, ultimo_error = $1 WHERE id = $2 AND particion = $3',
          ['PUBLICACION_FALLIDA', id, particion]);
      },
      liberar: async () => {
        if (liberada) return;
        liberada = true;
        let desbloqueada = false;
        try {
          const { rows } = await cliente.query<{ liberada: boolean }>(
            'SELECT pg_advisory_unlock($1::integer,$2::integer) AS liberada', [espacioBloqueo, particion],
          );
          desbloqueada = rows[0]?.liberada === true;
        } finally {
          cliente.off('error', conexionInterrumpida);
          cliente.release(!desbloqueada);
        }
      },
    };
  }
}
