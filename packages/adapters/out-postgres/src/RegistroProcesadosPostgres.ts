import { sql, type Kysely } from 'kysely';
import type { RegistroProcesados } from '@noki/application';

export class RegistroProcesadosPostgres implements RegistroProcesados {
  constructor(private readonly db: Kysely<unknown>) {}

  async yaProcesado(consumidor: string, clave: string): Promise<boolean> {
    const { rows } = await sql<{ existe: boolean }>`SELECT EXISTS (SELECT 1 FROM evento_procesado
      WHERE consumidor = ${consumidor} AND idempotency_key = ${clave}) AS existe`.execute(this.db);
    return rows[0]?.existe ?? false;
  }

  async marcar(consumidor: string, clave: string): Promise<void> {
    await sql`INSERT INTO evento_procesado (consumidor, idempotency_key)
      VALUES (${consumidor}, ${clave}) ON CONFLICT DO NOTHING`.execute(this.db);
  }
}
