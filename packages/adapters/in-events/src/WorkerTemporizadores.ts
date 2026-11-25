import { DelayedError, Worker } from 'bullmq';
import { z } from 'zod';
import type { Reloj, ResultadoTemporizador, Temporizador } from '@noki/application';
import type { ReservaId, TramiteId } from '@noki/domain';

const esquema = z.object({
  tipo: z.enum(['HOLD', 'INASISTENCIA', 'INACTIVIDAD']),
  tramiteId: z.uuidv7().transform(id => id as TramiteId),
  venceEn: z.iso.datetime(),
  version: z.number().int().positive(),
  reservaId: z.uuidv7().transform(id => id as ReservaId).optional(),
});

export class WorkerTemporizadores {
  private readonly worker: Worker<unknown>;

  constructor(
    redisUrl: string, nombre: string, reloj: Reloj,
    ejecutar: (trabajo: Temporizador) => Promise<ResultadoTemporizador>,
    registrar: (datos: { codigo: string; tipo?: string; tramiteId?: string }) => void,
  ) {
    this.worker = new Worker(nombre, async (job, token) => {
      const datos = esquema.parse(job.data);
      const { reservaId, ...base } = datos;
      const resultado = await ejecutar(reservaId ? { ...base, reservaId } : base);
      if (resultado.tipo === 'REPROGRAMAR') {
        const delay = Math.max(0, Date.parse(resultado.venceEn) - reloj.ahora().getTime());
        await job.moveToDelayed(Date.now() + delay, token);
        if (Date.parse(resultado.venceEn) <= reloj.ahora().getTime()) {
          try { await job.promote(); }
          catch (error) { if (await job.getState() === 'delayed') throw error; }
        }
        throw new DelayedError();
      }
    }, { connection: { url: redisUrl, maxRetriesPerRequest: null }, concurrency: 1 });
    this.worker.on('error', () => registrar({ codigo: 'WORKER_TEMPORIZADORES_ERROR' }));
    this.worker.on('failed', job => {
      if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
      const datos = esquema.safeParse(job.data);
      registrar(datos.success
        ? { codigo: 'TEMPORIZADOR_FALLIDO', tipo: datos.data.tipo, tramiteId: datos.data.tramiteId }
        : { codigo: 'TEMPORIZADOR_FALLIDO' });
    });
  }

  cerrar(): Promise<void> { return this.worker.close(); }
}
