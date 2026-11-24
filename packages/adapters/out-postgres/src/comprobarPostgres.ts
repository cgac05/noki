import { Client } from 'pg';

export async function comprobarPostgres(connectionString: string): Promise<boolean> {
  const client = new Client({ connectionString, connectionTimeoutMillis: 900, query_timeout: 900 });
  client.on('error', () => {});
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const consulta = (async () => { await client.connect(); await client.query('SELECT 1'); return true; })().catch(() => false);
  try {
    return await Promise.race([consulta, new Promise<boolean>(resolve => { temporizador = setTimeout(() => resolve(false), 1000); })]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
    void client.end().catch(() => {});
  }
}
