import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { Kysely, Migrator, PostgresDialect, sql, type Migration, type MigrationProvider } from 'kysely';
import { Pool } from 'pg';

class ProveedorMigracionesSql implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    const carpeta = fileURLToPath(new URL('../../../../infra/migraciones/', import.meta.url));
    const nombres = (await readdir(carpeta)).filter(n => /^\d+_.+\.sql$/.test(n)).sort();
    const migraciones: Record<string, Migration> = {};
    for (const nombre of nombres) {
      const contenido = await readFile(join(carpeta, nombre), 'utf8');
      migraciones[nombre.replace(/\.sql$/, '')] = { up: async (db: Kysely<unknown>) => { await sql.raw(contenido).execute(db); } };
    }
    return migraciones;
  }
}

export async function migrar(connectionString: string): Promise<string[]> {
  const db = new Kysely<unknown>({
    dialect: new PostgresDialect({ pool: new Pool({ connectionString, connectionTimeoutMillis: 1000 }) }),
  });
  try {
    const { error, results } = await new Migrator({ db, provider: new ProveedorMigracionesSql() }).migrateToLatest();
    if (error) throw error;
    return (results ?? []).filter(r => r.status === 'Success').map(r => r.migrationName);
  } finally { await db.destroy(); }
}
