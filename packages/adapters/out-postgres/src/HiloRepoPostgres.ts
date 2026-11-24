import { sql, type Kysely } from 'kysely';
import type { HiloRepo } from '@noki/application';
import { HiloAtencion, type Canal, type HiloId } from '@noki/domain';

interface FilaHilo { id: HiloId; contacto_id: string; ultimo_canal: Canal }

export class HiloRepoPostgres implements HiloRepo {
  constructor(private readonly db: Kysely<unknown>) {}

  async obtener(id: HiloId): Promise<HiloAtencion | null> {
    const { rows } = await sql<FilaHilo>`SELECT id, contacto_id, ultimo_canal FROM hilo_atencion WHERE id = ${id}`.execute(this.db);
    return this.entidad(rows[0]);
  }

  async porContacto(id: string): Promise<HiloAtencion | null> {
    const { rows } = await sql<FilaHilo>`SELECT id, contacto_id, ultimo_canal FROM hilo_atencion
      WHERE contacto_id = ${id} ORDER BY abierto_en, id LIMIT 1`.execute(this.db);
    return this.entidad(rows[0]);
  }

  async guardar(hilo: HiloAtencion): Promise<void> {
    await sql`INSERT INTO hilo_atencion (id, contacto_id, ultimo_canal)
      VALUES (${hilo.id}, ${hilo.contactoId}, ${hilo.ultimoCanal})
      ON CONFLICT (id) DO UPDATE SET ultimo_canal = EXCLUDED.ultimo_canal`.execute(this.db);
  }

  private entidad(fila: FilaHilo | undefined): HiloAtencion | null {
    return fila ? new HiloAtencion(fila.id, fila.contacto_id, fila.ultimo_canal) : null;
  }
}
