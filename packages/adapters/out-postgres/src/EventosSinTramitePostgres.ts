import type { Kysely } from 'kysely';
import type { EventosSinTramite, GeneradorId } from '@noki/application';
import type { EventoDominio } from '@noki/domain';
import { insertarEventos } from './eventStore.ts';

export class EventosSinTramitePostgres implements EventosSinTramite {
  constructor(private readonly db: Kysely<unknown>, private readonly ids: GeneradorId) {}

  async agregar(eventos: readonly (EventoDominio & { tramiteId: null })[]): Promise<void> {
    await this.db.transaction().execute((tx) => insertarEventos(tx, this.ids, eventos));
  }
}
