import { Redis } from 'ioredis';

export async function comprobarRedis(url: string): Promise<boolean> {
  const redis = new Redis(url, { lazyConnect: true, connectTimeout: 900, commandTimeout: 900, retryStrategy: () => null, maxRetriesPerRequest: 0, enableOfflineQueue: false });
  redis.on('error', () => {});
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const consulta = (async () => { await redis.connect(); return (await redis.ping()) === 'PONG'; })().catch(() => false);
  try {
    return await Promise.race([consulta, new Promise<boolean>(resolve => { temporizador = setTimeout(() => resolve(false), 1000); })]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
    redis.disconnect();
  }
}
