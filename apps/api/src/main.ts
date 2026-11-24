import { crearApi } from './crearApi.ts';

const databaseUrl = process.env['DATABASE_URL'];
const redisUrl = process.env['REDIS_URL'];
if (!databaseUrl || !redisUrl) throw new Error('Configura DATABASE_URL y REDIS_URL en .env.');
const app = crearApi({ databaseUrl, redisUrl });
try { await app.listen({ host: '0.0.0.0', port: 4000 }); }
catch { app.log.error({ codigo: 'ARRANQUE_API_FALLIDO' }, 'No se pudo iniciar la API.'); process.exitCode = 1; }
for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(senal, () => { void app.close().catch(() => { process.exitCode = 1; }); });
}
