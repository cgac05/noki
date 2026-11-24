import { sql, type Kysely } from 'kysely';
import type { Contacto, ContactosPort, Vinculo } from '@noki/application';
import type { Canal, HiloId } from '@noki/domain';

export class ContactosPostgres implements ContactosPort {
  constructor(private readonly db: Kysely<unknown>) {}

  async buscar(canal: Canal, valor: string): Promise<Contacto | null> {
    const { rows } = await sql<Contacto>`SELECT id, canal, valor_externo AS valor, hilo_id AS "hiloId" FROM contacto_canal
      WHERE canal = ${canal} AND valor_externo = ${valor} AND hilo_id IS NOT NULL`.execute(this.db);
    return rows[0] ?? null;
  }

  async crear(contacto: Contacto): Promise<Contacto> {
    const { id, canal, valor, hiloId } = contacto;
    return this.db.transaction().execute(async (tx) => {
      await sql`INSERT INTO contacto_canal (id, canal, valor_externo) VALUES (${id}, ${canal}, ${valor})
        ON CONFLICT (canal, valor_externo) DO NOTHING`.execute(tx);
      const { rows } = await sql<Omit<Contacto, 'hiloId'> & { hiloId: HiloId | null }>`
        SELECT id, canal, valor_externo AS valor, hilo_id AS "hiloId" FROM contacto_canal
        WHERE canal = ${canal} AND valor_externo = ${valor} FOR UPDATE`.execute(tx);
      const actual = rows[0];
      if (!actual) throw new Error('No se pudo cargar el contacto.');
      if (actual.hiloId) return { ...actual, hiloId: actual.hiloId };
      const legado = await sql<{ id: HiloId }>`SELECT id FROM hilo_atencion WHERE contacto_id = ${actual.id}
        ORDER BY abierto_en, id LIMIT 1`.execute(tx);
      const hilo = legado.rows[0]?.id ?? hiloId;
      if (!legado.rows.length) {
        await sql`INSERT INTO hilo_atencion (id, contacto_id, ultimo_canal)
          VALUES (${hilo}, ${actual.id}, ${canal})`.execute(tx);
      }
      await sql`UPDATE contacto_canal SET hilo_id = ${hilo} WHERE id = ${actual.id}`.execute(tx);
      return { ...actual, hiloId: hilo };
    });
  }

  async vinculosDe(id: string): Promise<Vinculo[]> {
    const { rows } = await sql<Vinculo>`SELECT paciente_id AS "pacienteId", metodo, relacion, nivel FROM vinculo
      WHERE contacto_id = ${id} ORDER BY paciente_id`.execute(this.db);
    return rows;
  }

  async vincular(id: string, vinculo: Vinculo): Promise<void> {
    const { pacienteId, metodo, relacion, nivel } = vinculo;
    await sql`INSERT INTO vinculo (contacto_id, paciente_id, metodo, relacion, nivel)
      VALUES (${id}, ${pacienteId}, ${metodo}, ${relacion}, ${nivel})
      ON CONFLICT (contacto_id, paciente_id) DO UPDATE
      SET metodo = EXCLUDED.metodo, relacion = EXCLUDED.relacion, nivel = EXCLUDED.nivel`.execute(this.db);
  }

  async buscarTelefonoCapturado(numero: string): Promise<HiloId[]> {
    const normalizado = numero.replace(/\D/g, '');
    if (!normalizado) return [];
    const { rows } = await sql<{ id: HiloId }>`SELECT DISTINCT h.id FROM hilo_atencion h
      JOIN contacto_canal c ON c.id = h.contacto_id
      WHERE c.canal = 'callcenter' AND regexp_replace(c.valor_externo, '[^0-9]', '', 'g') = ${normalizado}
      ORDER BY h.id`.execute(this.db);
    return rows.map(({ id }) => id);
  }
}
