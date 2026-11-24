import { Client } from 'pg';
import { Redis } from 'ioredis';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const origen = process.env['DATABASE_URL'];
const redisUrl = process.env['REDIS_URL'];
if (!origen || !redisUrl) throw new Error('Configura DATABASE_URL y REDIS_URL en .env antes de probar la infraestructura.');
const admin = new Client({ connectionString: origen, connectionTimeoutMillis: 1000 });
const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 1000, retryStrategy: () => null, maxRetriesPerRequest: 0, enableOfflineQueue: false });
redis.on('error', () => {});
let disponible = false;
try {
  await admin.connect();
  await redis.connect();
  await redis.ping();
  const existe = await admin.query<{ existe: number }>("SELECT 1 AS existe FROM pg_database WHERE datname = 'noki_test'");
  if (existe.rowCount === 0) await admin.query('CREATE DATABASE noki_test');
  disponible = true;
} catch {
  process.stderr.write('No hay infraestructura de pruebas disponible. Inicia PostgreSQL y Redis: docker compose -f infra/docker-compose.yml up -d postgres redis. No se omitieron pruebas ni se declaró éxito.\n');
  process.exitCode = 1;
} finally {
  await admin.end();
  redis.disconnect();
}
if (disponible) {
  const pruebaUrl = new URL(origen);
  pruebaUrl.pathname = '/noki_test';
  const prueba = new Client({ connectionString: pruebaUrl.toString(), connectionTimeoutMillis: 1000 });
  try {
    await prueba.connect();
    await prueba.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  } finally { await prueba.end(); }
  const require = createRequire(import.meta.url);
  const cli = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  const proceso = spawn(process.execPath, [cli, 'run', '--project', 'integracion'], {
    stdio: 'inherit', env: { ...process.env, TEST_DATABASE_URL: pruebaUrl.toString() },
  });
  proceso.on('error', () => { process.stderr.write('No se pudo iniciar Vitest de integración.\n'); process.exitCode = 1; });
  proceso.on('exit', (codigo) => { process.exitCode = codigo ?? 1; });
}
