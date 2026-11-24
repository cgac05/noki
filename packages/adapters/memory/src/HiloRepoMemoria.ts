import type { HiloAtencion, HiloId } from '@noki/domain';
import type { HiloRepo } from '@noki/application';

export class HiloRepoMemoria implements HiloRepo {
  private readonly hilos = new Map<HiloId, HiloAtencion>();

  async obtener(id: HiloId): Promise<HiloAtencion | null> {
    return this.hilos.get(id)?.copiar() ?? null;
  }

  async guardar(hilo: HiloAtencion): Promise<void> {
    this.hilos.set(hilo.id, hilo.copiar());
  }

  async porContacto(contactoId: string): Promise<HiloAtencion | null> {
    return [...this.hilos.values()].find((hilo) => hilo.contactoId === contactoId)?.copiar() ?? null;
  }
}
