import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { RelayOutbox } from '../../packages/application/src/index.ts';
import { RelojFalso } from '../../packages/adapters/memory/src/index.ts';
import { abrirPostgres, ContactosPostgres, EventosSinTramitePostgres, migrar, OutboxPostgres, particionEvento } from '../../packages/adapters/out-postgres/src/index.ts';
import { PublicadorRedisStreams } from '../../packages/adapters/out-redis/src/index.ts';
import type { EventoDominio, HiloId } from '../../packages/domain/src/index.ts';

const url = process.env['TEST_DATABASE_URL'] ?? '';
const redisUrl = process.env['REDIS_URL'] ?? '';
if (new URL(url).pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const pool = new Pool({ connectionString: url });
const db = abrirPostgres(url);
const outbox = new OutboxPostgres(url);
const otroOutbox = new OutboxPostgres(url);
const prefijo = 'pruebas:' + randomUUID() + ':';
const redis = new Redis(redisUrl);
const publicador = new PublicadorRedisStreams(redisUrl, prefijo);
const reloj = new RelojFalso(new Date('2026-11-24T12:00:00Z'));
const hiloId = randomUUID() as HiloId;
const contactoId = randomUUID();
const particion = particionEvento(undefined, hiloId);
const evento = (): EventoDominio & { tramiteId: null } => ({
  idempotencyKey: randomUUID(), correlationId: randomUUID(), tipo: 'IntentoVerificacionFallido', tramiteId: null,
  hiloId, canal: 'web', actor: 'paciente', nivelAuth: 0, version: 0, ts: reloj.ahora().toISOString(),
  payload: { metodo: 'OTP_SMS', intentos: 1 },
});

afterAll(async () => {
  try {
    await redis.del(prefijo + particion);
    await pool.query('DELETE FROM outbox WHERE evento_id IN (SELECT id FROM evento WHERE hilo_id = $1)', [hiloId]);
    await pool.query('DELETE FROM evento WHERE hilo_id = $1', [hiloId]);
    await pool.query('UPDATE contacto_canal SET hilo_id = NULL WHERE id = $1', [contactoId]);
    await pool.query('DELETE FROM hilo_atencion WHERE id = $1', [hiloId]);
    await pool.query('DELETE FROM contacto_canal WHERE id = $1', [contactoId]);
  } finally {
    redis.disconnect();
    publicador.cerrar();
    await Promise.all([db.destroy(), pool.end(), outbox.cerrar(), otroOutbox.cerrar()]);
  }
});

it('no publica dos veces con dos relays y reintenta si publicó sin marcar', async () => {
  await migrar(url);
  await new ContactosPostgres(db).crear({ id: contactoId, hiloId, canal: 'web', valor: contactoId });
  const repo = new EventosSinTramitePostgres(db, { nuevo: randomUUID });
  const eventos = [evento(), evento(), evento()];
  await repo.agregar(eventos);
  let iniciado = () => {};
  let continuar = () => {};
  const listo = new Promise<void>((resolver) => { iniciado = resolver; });
  const pausa = new Promise<void>((resolver) => { continuar = resolver; });
  const primero = new RelayOutbox(outbox, { publicar: async (numero, e) => {
    iniciado();
    await pausa;
    await publicador.publicar(numero, e);
  } }, reloj);
  const segundo = new RelayOutbox(otroOutbox, publicador, reloj);
  const ejecucion = primero.publicarPendientes();
  try { await listo; await segundo.publicarPendientes(); }
  finally { continuar(); await ejecucion; }
  const claves = async () => (await redis.xrange(prefijo + particion, '-', '+')).map(([, campos]) => campos[1]);
  expect(await claves()).toEqual(eventos.map((e) => e.idempotencyKey));

  const omitido = evento();
  await repo.agregar([omitido]);
  const lease = await outbox.tomarParticion(particion);
  if (!lease) throw new Error('Falta el arrendamiento.');
  try { await publicador.publicar(particion, omitido); } finally { await lease.liberar(); }
  await segundo.publicarPendientes();
  expect((await claves()).filter((clave) => clave === omitido.idempotencyKey)).toHaveLength(2);

  const pendiente = evento();
  await repo.agregar([pendiente]);
  const etiqueta = 'noki-relay-caido';
  const dedicada = new URL(url);
  dedicada.searchParams.set('application_name', etiqueta);
  const caido = new OutboxPostgres(dedicada.toString());
  const bloqueo = await caido.tomarParticion(particion);
  if (!bloqueo) throw new Error('Falta el bloqueo.');
  try {
    await pool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = $1', [etiqueta]);
  } finally {
    await expect(bloqueo.liberar()).rejects.toBeDefined();
    await caido.cerrar();
  }
  const fallo = new RelayOutbox(outbox, { publicar: async () => { throw new Error('redis://prueba-no-registrar'); } }, reloj);
  await fallo.publicarPendientes();
  const resultado = await pool.query(`SELECT intentos, ultimo_error, publicado_en FROM outbox o
    JOIN evento e ON e.id = o.evento_id WHERE e.idempotency_key = $1`, [pendiente.idempotencyKey]);
  expect(resultado.rows).toEqual([{ intentos: 1, ultimo_error: 'PUBLICACION_FALLIDA', publicado_en: null }]);
  await segundo.publicarPendientes();
  expect((await claves()).at(-1)).toBe(pendiente.idempotencyKey);
});
