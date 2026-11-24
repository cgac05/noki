import { Client } from 'pg';
import { migrar } from '@noki/adapter-out-postgres';
import { sembrar } from './sembrar.ts';

export async function reiniciarDemo(connectionString: string, modoDemo: string | undefined): Promise<void> {
  if (modoDemo !== 'true') throw new Error('El reinicio requiere DEMO_MODE=true; no se abrió ninguna conexión.');
  const host = new URL(connectionString).hostname;
  process.stdout.write('Reinicio de la base de demo en el host ' + host + '.\n');
  const client = new Client({ connectionString, connectionTimeoutMillis: 1000 });
  try {
    await client.connect();
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  } finally { await client.end(); }
  await migrar(connectionString);
  await sembrar(connectionString);
}
