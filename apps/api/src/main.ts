import { crearApi } from './crearApi.ts';
import { RelayOutbox } from '@noki/application';
import { OutboxPostgres } from '@noki/adapter-out-postgres';
import { PublicadorRedisStreams } from '@noki/adapter-out-redis';
import { RelojSistema } from './sistema/RelojSistema.ts';

const databaseUrl = process.env['DATABASE_URL'];
const redisUrl = process.env['REDIS_URL'];
if (!databaseUrl || !redisUrl) throw new Error('Configura DATABASE_URL y REDIS_URL en .env.');
const app = crearApi({ databaseUrl, redisUrl });
const outbox = new OutboxPostgres(databaseUrl);
const publicador = new PublicadorRedisStreams(redisUrl);
const relay = new RelayOutbox(outbox, publicador, new RelojSistema());
let intervalo: ReturnType<typeof setInterval> | undefined;
let enCurso: Promise<void> | undefined;
let cierre: Promise<void> | undefined;

function publicar(): void {
  if (enCurso) return;
  enCurso = relay.publicarPendientes()
    .catch(() => { app.log.warn({ codigo: 'RELAY_OUTBOX_FALLIDO' }, 'No se completó el ciclo del relay.'); })
    .finally(() => { enCurso = undefined; });
}

function cerrar(): Promise<void> {
  cierre ??= (async () => {
    clearInterval(intervalo);
    await enCurso;
    publicador.cerrar();
    await Promise.all([outbox.cerrar(), app.close()]);
  })();
  return cierre;
}

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(senal, () => { void cerrar().catch(() => { process.exitCode = 1; }); });
}

try {
  await app.listen({ host: '0.0.0.0', port: 4000 });
  if (!cierre) {
    publicar();
    intervalo = setInterval(publicar, 250);
  }
} catch {
  app.log.error({ codigo: 'ARRANQUE_API_FALLIDO' }, 'No se pudo iniciar la API.');
  process.exitCode = 1;
  await cerrar();
}
