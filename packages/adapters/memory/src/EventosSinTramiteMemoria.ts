import type { EventosSinTramite } from '@noki/application';
import type { EventoDominio } from '@noki/domain';
import { registrarClaves, type OpcionesClavesEventos } from './clavesEventos.ts';

export class EventosSinTramiteMemoria implements EventosSinTramite {
  private readonly registrados: EventoDominio[] = [];

  private readonly claves: Set<string> | undefined;

  constructor({ claveUnica, claves }: OpcionesClavesEventos = {}) {
    this.claves = claveUnica ? claves ?? new Set() : undefined;
  }

  async agregar(eventos: readonly (EventoDominio & { tramiteId: null })[]): Promise<void> {
    const copia = structuredClone(eventos);
    registrarClaves(this.claves, copia);
    this.registrados.push(...copia);
  }

  eventos(): readonly EventoDominio[] { return structuredClone(this.registrados); }
}
