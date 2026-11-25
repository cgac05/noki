import { Queue } from 'bullmq';
import { isDeepStrictEqual } from 'node:util';
import { setTimeout } from 'node:timers/promises';
import type { ProgramadorTemporizadores, Temporizador, TipoTemporizador } from '@noki/application';
import type { TramiteId } from '@noki/domain';

export class ProgramadorBullMQ implements ProgramadorTemporizadores {
  readonly cola: Queue<Temporizador, void, TipoTemporizador, Temporizador, void, TipoTemporizador>;

  constructor(redisUrl: string, nombre: string) {
    this.cola = new Queue(nombre, { connection: { url: redisUrl, maxRetriesPerRequest: null } });
  }

  async programar(trabajo: Temporizador, ahora: string): Promise<void> {
    const jobId = this.id(trabajo.tipo, trabajo.tramiteId);
    const limite = performance.now() + 5_000;
    for (;;) {
      const existente = await this.cola.getJob(jobId);
      if (!existente) break;
      const estado = await existente.getState();
      if (estado !== 'failed' && estado !== 'completed' && estado !== 'unknown' &&
          isDeepStrictEqual(existente.data, trabajo)) return;
      try { await existente.remove(); }
      catch (error) {
        if (await existente.getState() !== 'active') {
          if (!(await this.cola.getJob(jobId))) break;
          throw error;
        }
        if (performance.now() >= limite) throw error;
        await setTimeout(25);
        continue;
      }
      break;
    }
    await this.cola.add(trabajo.tipo, trabajo, {
      jobId, delay: Math.max(0, Date.parse(trabajo.venceEn) - Date.parse(ahora)),
      attempts: 3, backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: true, removeOnFail: 100,
    });
  }

  async cancelar(tipo: TipoTemporizador, tramiteId: TramiteId): Promise<void> {
    const trabajo = await this.cola.getJob(this.id(tipo, tramiteId));
    if (!trabajo || await trabajo.getState() === 'active') return;
    try { await trabajo.remove(); }
    catch (error) {
      const estado = await trabajo.getState();
      if (estado !== 'active' && estado !== 'unknown') throw error;
    }
  }

  async adelantarVencidos(ahora: string): Promise<number> {
    const limite = Date.parse(ahora);
    let promovidos = 0;
    for (const trabajo of await this.cola.getDelayed()) {
      if (Date.parse(trabajo.data.venceEn) > limite) continue;
      try { await trabajo.promote(); }
      catch (error) {
        if (await trabajo.getState() === 'delayed') throw error;
        continue;
      }
      promovidos++;
    }
    return promovidos;
  }

  cerrar(): Promise<void> { return this.cola.close(); }

  private id(tipo: TipoTemporizador, tramiteId: TramiteId): string {
    return `${tipo}-${tramiteId}`;
  }
}
