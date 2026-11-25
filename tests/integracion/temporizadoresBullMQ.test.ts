import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { WorkerTemporizadores } from '../../packages/adapters/in-events/src/index.ts';
import { RelojFalso } from '../../packages/adapters/memory/src/index.ts';
import { ProgramadorBullMQ } from '../../packages/adapters/out-redis/src/index.ts';
import type { Temporizador } from '../../packages/application/src/index.ts';
import type { ReservaId, TramiteId } from '../../packages/domain/src/index.ts';
import { bateriaProgramador } from '../unit/persistencia/bateriaProgramador.ts';

const url = process.env['REDIS_URL']!;
const ahora = '2026-11-24T12:00:00.000Z';
const venceEn = '2026-11-24T12:01:00.000Z';
const hold: Temporizador = {
  tipo: 'HOLD', tramiteId: '019ab990-01b0-7000-8000-000000000001' as TramiteId,
  reservaId: '019ab990-01b0-7000-8000-000000000002' as ReservaId, venceEn, version: 1,
};
let nombre: string;
let programador: ProgramadorBullMQ;
let worker: WorkerTemporizadores | undefined;

beforeEach(() => {
  nombre = 'prueba-temporizadores-' + randomUUID();
  programador = new ProgramadorBullMQ(url, nombre);
});
afterEach(async () => {
  try {
    await worker?.cerrar();
    await programador.cola.obliterate({ force: true });
  } finally {
    worker = undefined;
    await programador.cerrar();
  }
});

bateriaProgramador(() => programador);

it('usa un jobId compatible y reemplaza un trabajo activo cuando termina', async () => {
  const reloj = new RelojFalso(new Date(venceEn));
  const id = 'HOLD-' + hold.tramiteId;
  let liberar = () => {};
  const permiso = new Promise<void>(resolver => { liberar = resolver; });
  await programador.programar(hold, venceEn);
  expect((await programador.cola.getJob(id))?.data).toEqual(hold);
  worker = new WorkerTemporizadores(url, nombre, reloj, async () => {
    await permiso;
    return { tipo: 'APLICADO' };
  }, () => {});
  try {
    await expect.poll(() => programador.cola.getJobState(id)).toBe('active');
    const reemplazo = { ...hold, version: 2, venceEn: '2026-11-24T12:05:00.000Z' };
    const programado = programador.programar(reemplazo, venceEn);
    await expect.poll(() => programador.cola.getJobState(id)).toBe('active');
    liberar();
    await programado;
    expect((await programador.cola.getJob(id))?.data).toEqual(reemplazo);
  } finally { liberar(); }
});

it('reprograma una ejecución anticipada sin gastar intentos y ejecuta al adelantar', async () => {
  const reloj = new RelojFalso(new Date(ahora));
  const llamadas: string[] = [];
  await programador.programar(hold, venceEn);
  worker = new WorkerTemporizadores(url, nombre, reloj, async () => {
    const instante = reloj.ahora().toISOString();
    llamadas.push(instante);
    return instante < venceEn ? { tipo: 'REPROGRAMAR', venceEn } : { tipo: 'APLICADO' };
  }, () => {});
  const id = 'HOLD-' + hold.tramiteId;
  await expect.poll(() => programador.cola.getJobState(id)).toBe('delayed');
  expect((await programador.cola.getJob(id))?.attemptsMade).toBe(0);
  expect(llamadas).toEqual([ahora]);
  reloj.adelantar(60_000);
  expect(await programador.adelantarVencidos(venceEn)).toBe(1);
  await expect.poll(() => programador.cola.getJobState(id)).toBe('unknown');
  expect(llamadas).toEqual([ahora, venceEn]);
});

it('registra el fallo persistente tras tres intentos con los campos autorizados', async () => {
  const reloj = new RelojFalso(new Date(venceEn));
  const avisos: unknown[] = [];
  let intentos = 0;
  await programador.programar(hold, venceEn);
  worker = new WorkerTemporizadores(url, nombre, reloj, async () => {
    intentos++;
    throw new Error('Detalle privado simulado');
  }, datos => { avisos.push(datos); });
  await expect.poll(() => avisos, { timeout: 7_000 }).toEqual([
    { codigo: 'TEMPORIZADOR_FALLIDO', tipo: 'HOLD', tramiteId: hold.tramiteId },
  ]);
  expect(intentos).toBe(3);
}, 10_000);
