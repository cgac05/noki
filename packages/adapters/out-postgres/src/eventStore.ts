import { sql, type Kysely } from 'kysely';
import type { GeneradorId } from '@noki/application';
import type { EventoDominio } from '@noki/domain';

export function particionEvento(pacienteId: string | undefined, hiloId: string): number {
  let hash = 0x811c9dc5;
  for (const octeto of new TextEncoder().encode(pacienteId ?? hiloId)) {
    hash = Math.imul(hash ^ octeto, 0x01000193);
  }
  return (hash >>> 0) % 8;
}

export async function insertarEventos(db: Kysely<unknown>, ids: GeneradorId,
  eventos: readonly EventoDominio[], pacienteId?: string): Promise<void> {
  for (const evento of eventos) {
    const id = ids.nuevo();
    const particion = particionEvento(pacienteId, evento.hiloId);
    await sql`INSERT INTO evento (id, tramite_id, hilo_id, tipo, payload, canal, actor,
      nivel_auth, version, correlation_id, idempotency_key, ts)
      VALUES (${id}, ${evento.tramiteId}, ${evento.hiloId}, ${evento.tipo}, ${JSON.stringify(evento.payload)}::jsonb,
        ${evento.canal}, ${evento.actor}, ${evento.nivelAuth}, ${evento.version}, ${evento.correlationId},
        ${evento.idempotencyKey}, ${evento.ts})`.execute(db);
    await sql`INSERT INTO outbox (id, evento_id, particion, creado_en)
      VALUES (${ids.nuevo()}, ${id}, ${particion}, clock_timestamp())`.execute(db);
  }
}
