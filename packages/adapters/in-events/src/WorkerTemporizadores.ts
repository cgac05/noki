import { DelayedError, Worker } from 'bullmq';
import { z } from 'zod';
import type { Reloj, ResultadoTemporizador, Temporizador } from '@noki/application';
import type { ReservaId, TramiteId } from '@noki/domain';

const trabajoTramite = z.object({
  tipo: z.enum(['HOLD', 'INASISTENCIA', 'INACTIVIDAD']),
  tramiteId: z.uuidv7().transform(id => id as TramiteId),
  venceEn: z.iso.datetime(),
  version: z.number().int().positive(),
  reservaId: z.uuidv7().transform(id => id as ReservaId).optional(),
});

const esquema = z.union([trabajoTramite, z.object({
  tipo: z.literal('OFERTA'), ofertaId: z.uuidv7(), venceEn: z.iso.datetime(),
})]);

export class WorkerTemporizadores {
  private readonly worker: Worker<unknown>;

  constructor(
    redisUrl: string, nombre: string, reloj: Reloj,
    ejecutar: (trabajo: Temporizador) => Promise<ResultadoTemporizador>,
    registrar: (datos: { codigo: string; tipo?: string; tramiteId?: string }) => void,
  ) {
    this.worker = new Worker(nombre, async (job, token) => {
      const datos = esquema.parse(job.data);
      const reservaId = datos.tipo === 'OFERTA' ? undefined : datos.reservaId;
      const resultado = await ejecutar(datos.tipo === 'OFERTA' ? datos : {
        tipo: datos.tipo, tramiteId: datos.tramiteId, venceEn: datos.venceEn, version: datos.version,
        ...(reservaId ? { reservaId } : {}),
      });
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
        ? { codigo: 'TEMPORIZADOR_FALLIDO', tipo: datos.data.tipo, ...(datos.data.tipo === 'OFERTA' ? {} : { tramiteId: datos.data.tramiteId }) }
        : { codigo: 'TEMPORIZADOR_FALLIDO' });
    });
  }

  cerrar(): Promise<void> { return this.worker.close(); }
}
