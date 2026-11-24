import { crearApi } from './crearApi.ts';
import { crearTiempoReal } from './tiempoReal.ts';
import { ConsumidorStreams } from '@noki/adapter-in-events';
import { componerComandos } from './componerComandos.ts';
import { RelayOutbox } from '@noki/application';
import { OutboxPostgres } from '@noki/adapter-out-postgres';
import { PublicadorRedisStreams } from '@noki/adapter-out-redis';
import { RelojSistema } from './sistema/RelojSistema.ts';
import { iniciarRelay } from './iniciarRelay.ts';

const databaseUrl = process.env['DATABASE_URL'];
const redisUrl = process.env['REDIS_URL'];
if (!databaseUrl || !redisUrl) throw new Error('Configura DATABASE_URL y REDIS_URL en .env.');
const sdMockUrl = process.env['SD_MOCK_URL'];
const tokenSecret = process.env['TOKEN_SECRET'];
const publicBaseUrl = process.env['PUBLIC_BASE_URL'];
if (!sdMockUrl || !tokenSecret || !publicBaseUrl) throw new Error('Configura SD_MOCK_URL, TOKEN_SECRET y PUBLIC_BASE_URL.');
if (Buffer.byteLength(tokenSecret) < 32) throw new Error('TOKEN_SECRET debe tener al menos 32 bytes.');
const origen = new URL(publicBaseUrl).origin;
const comandos = componerComandos({ databaseUrl, sdMockUrl, tokenSecret, demo: process.env['DEMO_MODE'] === 'true' },
  datos => app.log.warn(datos, 'Incidencia de agenda externa'));
const app = crearApi({ databaseUrl, redisUrl, origen, comandos, consultas: comandos.consultas, whatsapp: comandos.whatsapp });
const tiempoReal = crearTiempoReal(app.server, origen, comandos.lecturas, comandos.reloj);
const consumidor = new ConsumidorStreams(redisUrl, 'tiempo-real', comandos.procesados, tiempoReal.manejar);
let detenerConsumo: (() => Promise<void>) | undefined;
let consumoIniciado = false;
const outbox = new OutboxPostgres(databaseUrl);
const publicador = new PublicadorRedisStreams(redisUrl);
const relay = new RelayOutbox(outbox, publicador, new RelojSistema());
let detenerRelay: (() => Promise<void>) | undefined;
let cierre: Promise<void> | undefined;

function cerrar(): Promise<void> {
  cierre ??= (async () => {
    await tiempoReal.cerrar();
    consumidor.detener();
    await detenerConsumo?.();
    consumidor.cerrar();
    await detenerRelay?.();
    publicador.cerrar();
    await app.close();
    await Promise.all([outbox.cerrar(), comandos.cerrar()]);
  })();
  return cierre;
}

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(senal, () => { void cerrar().catch(() => { process.exitCode = 1; }); });
}

try {
  await app.listen({ host: '0.0.0.0', port: 4000 });
  if (!cierre) {
    detenerConsumo = iniciarRelay(async () => {
      if (!consumoIniciado) { await consumidor.iniciar(); consumoIniciado = true; }
      await consumidor.consumirPendientes();
      return true;
    }, codigo => app.log.info({ codigo }, 'Estado del consumidor de tiempo real'));
    detenerRelay = iniciarRelay(() => relay.publicarPendientes(), codigo => {
      if (codigo === 'RELAY_OUTBOX_FALLIDO') app.log.warn({ codigo }, 'No se completó el ciclo del relay.');
      else app.log.info({ codigo }, 'Se recuperó el relay del outbox.');
    });
  }
} catch {
  app.log.error({ codigo: 'ARRANQUE_API_FALLIDO' }, 'No se pudo iniciar la API.');
  process.exitCode = 1;
  await cerrar();
}
