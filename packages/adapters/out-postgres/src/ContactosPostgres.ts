import { sql, type Kysely } from 'kysely';
import type { Contacto, ContactosPort, PacientePorTelefono, Vinculo } from '@noki/application';
import type { Canal, HiloId, PacienteId } from '@noki/domain';

import { normalizarTelefono, VIGENCIA_VINCULO_DIAS } from '@noki/domain';

export class ContactosPostgres implements ContactosPort {
  constructor(private readonly db: Kysely<unknown>) {}

  async buscar(canal: Canal, valor: string): Promise<Contacto | null> {
    const { rows } = await sql<Contacto>`SELECT id, canal, valor_externo AS valor, hilo_id AS "hiloId" FROM contacto_canal
      WHERE canal = ${canal} AND valor_externo = ${valor} AND hilo_id IS NOT NULL`.execute(this.db);
    return rows[0] ?? null;
  }

  async whatsappPorId(id: string): Promise<Contacto | null> {
    const { rows } = await sql<Contacto>`SELECT id, canal, valor_externo AS valor, hilo_id AS "hiloId"
      FROM contacto_canal WHERE id = ${id} AND canal = 'whatsapp' AND hilo_id IS NOT NULL`.execute(this.db);
    return rows[0] ?? null;
  }

  async whatsappVigente(pacienteId: PacienteId, ts: string): Promise<Contacto | null> {
    const desde = Date.parse(ts) - VIGENCIA_VINCULO_DIAS * 86_400_000;
    const { rows } = await sql<Contacto>`
      SELECT c.id, c.canal, c.valor_externo AS valor, c.hilo_id AS "hiloId"
      FROM contacto_canal c JOIN vinculo v ON v.contacto_id = c.id
      WHERE c.canal = 'whatsapp' AND c.hilo_id IS NOT NULL AND v.paciente_id = ${pacienteId}
        AND v.nivel >= 1 AND v.ultimo_uso >= to_timestamp(${desde}::double precision / 1000)
      ORDER BY (v.relacion = 'TITULAR') DESC, v.ultimo_uso DESC, c.id LIMIT 1
    `.execute(this.db);
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
    const { rows } = await sql<Vinculo>`SELECT paciente_id AS "pacienteId", metodo, relacion, nivel,
      to_char(ultimo_uso AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "ultimoUso" FROM vinculo
      WHERE contacto_id = ${id} ORDER BY paciente_id`.execute(this.db);
    return rows;
  }

  async vincular(id: string, vinculo: Vinculo): Promise<void> {
    const { pacienteId, metodo, relacion, nivel, ultimoUso } = vinculo;
    await sql`INSERT INTO vinculo (contacto_id, paciente_id, metodo, relacion, nivel, ultimo_uso)
      VALUES (${id}, ${pacienteId}, ${metodo}, ${relacion}, ${nivel}, ${ultimoUso})
      ON CONFLICT (contacto_id, paciente_id) DO UPDATE
      SET metodo = EXCLUDED.metodo, relacion = EXCLUDED.relacion, nivel = EXCLUDED.nivel, ultimo_uso = EXCLUDED.ultimo_uso
      WHERE EXCLUDED.nivel >= vinculo.nivel`.execute(this.db);
  }

  async pacientesPorTelefono(numero: string, desde: number): Promise<PacientePorTelefono[]> {
    const { rows } = await sql<PacientePorTelefono>`SELECT DISTINCT p.id AS "pacienteId", p.nombre, p.ap_paterno AS "apellidoPaterno"
      FROM contacto_canal c JOIN vinculo v ON v.contacto_id = c.id JOIN paciente p ON p.id = v.paciente_id
      WHERE v.ultimo_uso >= to_timestamp(${desde}::double precision / 1000)
        AND right(regexp_replace(c.valor_externo, '[^0-9]', '', 'g'), 10) = ${numero}
      ORDER BY p.id`.execute(this.db);
    return rows;
  }

  async buscarTelefonoCapturado(numero: string): Promise<HiloId[]> {
    const normalizado = normalizarTelefono(numero);
    if (!normalizado) return [];
    const { rows } = await sql<{ id: HiloId }>`SELECT DISTINCT h.id FROM hilo_atencion h
      JOIN contacto_canal c ON c.id = h.contacto_id
      WHERE c.canal = 'callcenter' AND right(regexp_replace(c.valor_externo, '[^0-9]', '', 'g'), 10) = ${normalizado}
      ORDER BY h.id`.execute(this.db);
    return rows.map(({ id }) => id);
  }

  async hilosPorTelefono(numero: string): Promise<HiloId[]> {
    const { rows } = await sql<{ id: HiloId }>`SELECT DISTINCT h.id FROM contacto_canal c
      JOIN hilo_atencion h ON h.contacto_id = c.id
      WHERE c.canal IN ('whatsapp', 'callcenter') AND right(c.valor_externo, 10) = ${numero}
        AND c.valor_externo ~ '^[+]?[0-9]{10,15}$'`.execute(this.db);
    return rows.map(({ id }) => id);
  }
}
