import type { HiloId } from './identificadores.ts';
import type { PayloadsEvento } from './eventos.ts';
import type { Canal, MetodoVinculo } from './vocabulario.ts';

export class HiloAtencion {
  constructor(readonly id: HiloId, readonly contactoId: string, private canal: Canal) {}

  get ultimoCanal(): Canal { return this.canal; }

  atenderEn(canal: Canal): void { this.canal = canal; }

  retomar(canal: Canal, metodo: MetodoVinculo): PayloadsEvento['CanalCambiado'] | undefined {
    if (canal === this.canal) return undefined;
    const de = this.canal;
    this.canal = canal;
    return { de, a: canal, metodo };
  }

  copiar(): HiloAtencion {
    return new HiloAtencion(this.id, this.contactoId, this.canal);
  }
}
