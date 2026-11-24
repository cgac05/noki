import { sql, type Kysely } from 'kysely';
import type { CatalogoPort } from '@noki/application';
import type { PerfilServicio, SedeId, ServicioId } from '@noki/domain';

export class CatalogoPostgres implements CatalogoPort {
  constructor(private readonly db: Kysely<unknown>) {}

  async oferta(servicioId: ServicioId, sedeId: SedeId): Promise<number | null> {
    const { rows } = await sql<{ precio_centavos: number }>`SELECT precio_centavos FROM oferta_sede
      WHERE servicio_id = ${servicioId} AND sede_id = ${sedeId} AND disponible`.execute(this.db);
    return rows[0]?.precio_centavos ?? null;
  }

  async sedesQueOfrecen(servicioId: ServicioId): Promise<SedeId[]> {
    const { rows } = await sql<{ sede_id: SedeId }>`SELECT sede_id FROM oferta_sede
      WHERE servicio_id = ${servicioId} AND disponible ORDER BY sede_id`.execute(this.db);
    return rows.map(({ sede_id }) => sede_id);
  }

  async perfil(servicioId: ServicioId): Promise<PerfilServicio | null> {
    const { rows } = await sql<{ perfil: PerfilServicio }>`SELECT perfil FROM servicio WHERE id = ${servicioId}`.execute(this.db);
    return rows[0]?.perfil ?? null;
  }
}
