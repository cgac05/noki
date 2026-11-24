import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export function abrirPostgres(connectionString: string, connectionTimeoutMillis = 5000): Kysely<unknown> {
  return new Kysely({
    dialect: new PostgresDialect({ pool: new Pool({ connectionString, connectionTimeoutMillis }) }),
  });
}
