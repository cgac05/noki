import type { EventosSinTramite } from '@noki/application';
import type { EventoDominio } from '@noki/domain';

export class EventosSinTramiteMemoria implements EventosSinTramite {
  private readonly registrados: EventoDominio[] = [];

  async agregar(eventos: readonly (EventoDominio & { tramiteId: null })[]): Promise<void> {
    this.registrados.push(...structuredClone(eventos));
  }

  eventos(): readonly EventoDominio[] { return structuredClone(this.registrados); }
}
