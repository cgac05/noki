import type { HuecosRepo } from '@noki/application';
import { Hueco, type EventoDominio, type HuecoInstantanea, type ReservaId } from '@noki/domain';

export class HuecosMemoria implements HuecosRepo {
  private readonly huecos = new Map<ReservaId, HuecoInstantanea>();
  readonly eventos: EventoDominio[] = [];

  listar(): HuecoInstantanea[] {
    return structuredClone([...this.huecos.values()]).sort((a, b) =>
      b.creadoEn.localeCompare(a.creadoEn) || b.id.localeCompare(a.id));
  }

  async porOrigen(id: ReservaId): Promise<Hueco | null> {
    const hueco = this.huecos.get(id);
    return hueco ? Hueco.rehidratar(hueco) : null;
  }

  async porOferta(ofertaId: string): Promise<Hueco | null> {
    for (const hueco of this.huecos.values()) {
      if (hueco.ofertas.some(o => o.id === ofertaId)) return Hueco.rehidratar(hueco);
    }
    return null;
  }

  async guardar(hueco: Hueco): Promise<boolean> {
    const datos = hueco.instantanea();
    const anterior = this.huecos.get(datos.origenReservaId);
    if ((anterior?.version ?? 0) !== hueco.versionCargada || (anterior && anterior.id !== datos.id)) return false;
    this.huecos.set(datos.origenReservaId, datos);
    this.eventos.push(...hueco.eventosPendientes());
    return true;
  }
}
