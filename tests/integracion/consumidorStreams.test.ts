import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { ConsumidorStreams } from '../../packages/adapters/in-events/src/index.ts';
import { PublicadorRedisStreams } from '../../packages/adapters/out-redis/src/index.ts';
import { abrirPostgres, migrar, RegistroProcesadosPostgres } from '../../packages/adapters/out-postgres/src/index.ts';
import type { EventoDominio, HiloId } from '../../packages/domain/src/index.ts';

const url = process.env['TEST_DATABASE_URL'] ?? '';
const redisUrl = process.env['REDIS_URL'] ?? '';
if (new URL(url).pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const prefijo = 'pruebas:' + randomUUID() + ':';
const grupo = randomUUID();
const redis = new Redis(redisUrl);
const db = abrirPostgres(url);
const registro = new RegistroProcesadosPostgres(db);
const publicador = new PublicadorRedisStreams(redisUrl, prefijo);
const consumidores: ConsumidorStreams[] = [];
const crear = (nombre: string, manejar: (e: EventoDominio) => Promise<void>) => {
  const consumidor = new ConsumidorStreams(redisUrl, nombre, registro, manejar, prefijo);
  consumidores.push(consumidor);
  return consumidor;
};
const evento = (): EventoDominio => ({
  tipo: 'IntentoVerificacionFallido', idempotencyKey: randomUUID(), correlationId: randomUUID(),
  tramiteId: null, hiloId: randomUUID() as HiloId, canal: 'web', actor: 'paciente', nivelAuth: 0, version: 0,
  payload: { metodo: 'OTP_SMS', intentos: 1 }, ts: '2026-11-24T12:00:00Z',
});
afterAll(async () => {
  try {
    await redis.del(...Array.from({ length: 8 }, (_, particion) => prefijo + particion), prefijo + 'fallidos');
  } finally {
    consumidores.forEach((consumidor) => consumidor.cerrar());
    publicador.cerrar();
    redis.disconnect();
    await db.destroy();
  }
});

it('reinicia sin pérdidas ni duplicados, y procesa los grupos por separado', async () => {
  await migrar(url);
  const eventos = Array.from({ length: 20 }, evento);
  const vistos: string[] = [];
  const primero = crear(grupo, async (e) => {
    vistos.push(e.idempotencyKey);
    if (vistos.length === 6) primero.detener();
  });
  for (const e of eventos) await publicador.publicar(0, e);
  if (eventos[0]) await publicador.publicar(0, eventos[0]);
  await primero.iniciar();
  await primero.consumirPendientes();
  expect(vistos).toHaveLength(6);
  primero.cerrar();
  const reinicio = crear(grupo, async (e) => { vistos.push(e.idempotencyKey); });
  await reinicio.iniciar();
  await reinicio.consumirPendientes();
  expect(vistos).toEqual(eventos.map((e) => e.idempotencyKey));
  const otroGrupo: string[] = [];
  const otro = crear(grupo + '-otro', async (e) => { otroGrupo.push(e.idempotencyKey); });
  await otro.iniciar();
  await otro.consumirPendientes();
  expect(otroGrupo).toEqual(vistos);
});

it('mueve al tercer fallo una sola vez y continúa la partición', async () => {
  const malo = evento();
  const bueno = evento();
  let intentos = 0;
  const vistos: string[] = [];
  const consumidor = crear(grupo + '-fallo', async (e) => {
    if (e.idempotencyKey === malo.idempotencyKey) { intentos++; throw new Error('payload privado'); }
    vistos.push(e.idempotencyKey);
  });
  await consumidor.iniciar();
  await publicador.publicar(1, malo);
  await publicador.publicar(1, bueno);
  for (let i = 0; i < 3; i++) await consumidor.consumirPendientes();
  expect(intentos).toBe(3);
  expect(vistos).toContain(bueno.idempotencyKey);
  const fallidos = await redis.xrange(prefijo + 'fallidos', '-', '+');
  expect(fallidos).toHaveLength(1);
  expect(fallidos[0]?.[1]).toEqual([
    'grupo', grupo + '-fallo', 'idempotencyKey', malo.idempotencyKey, 'tipo', malo.tipo, 'motivo', 'PROCESAMIENTO_FALLIDO',
  ]);
});
