import { sql, type Kysely } from 'kysely';
import type { RegistroIntentos, ResultadoIntento } from '@noki/application';

interface EstadoIntento {
  intentos: number;
  bloqueado_hasta: Date | null;
}

export class RegistroIntentosPostgres implements RegistroIntentos {
  constructor(private readonly db: Kysely<unknown>) {}

  async bloqueo(contactoId: string, ts: string): Promise<string | undefined> {
    const { rows } = await sql<EstadoIntento>`SELECT bloqueado_hasta FROM intento_verificacion
      WHERE contacto_id = ${contactoId} AND bloqueado_hasta > ${ts}::timestamptz`.execute(this.db);
    return rows[0]?.bloqueado_hasta?.toISOString();
  }

  async fallar(contactoId: string, ts: string): Promise<ResultadoIntento> {
    const instante = sql`${ts}::timestamptz`;
    const vencido = sql`intento_verificacion.bloqueado_hasta <= ${instante}`;
    const { rows } = await sql<EstadoIntento>`
      INSERT INTO intento_verificacion (contacto_id, intentos) VALUES (${contactoId}, 1)
      ON CONFLICT (contacto_id) DO UPDATE SET
        intentos = CASE WHEN ${vencido} THEN 1 ELSE intento_verificacion.intentos + 1 END,
        bloqueado_hasta = CASE
          WHEN ${vencido} THEN NULL
          WHEN intento_verificacion.bloqueado_hasta IS NOT NULL THEN intento_verificacion.bloqueado_hasta
          WHEN intento_verificacion.intentos >= 2 THEN ${instante} + INTERVAL '15 minutes'
          ELSE NULL END
      RETURNING intentos, bloqueado_hasta`.execute(this.db);
    const estado = rows[0];
    if (!estado) throw new Error('No se registró el intento.');
    const hasta = estado.bloqueado_hasta?.toISOString();
    return { intentos: estado.intentos, ...(hasta ? { bloqueadoHasta: hasta } : {}) };
  }

  async reiniciar(contactoId: string): Promise<void> {
    await sql`DELETE FROM intento_verificacion WHERE contacto_id = ${contactoId}`.execute(this.db);
  }
}
