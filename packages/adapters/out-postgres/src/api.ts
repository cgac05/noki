import { sql, type Kysely } from 'kysely';
import type {
  BandejaPort, ConversacionesWa, MensajeBandejaInterno, RegistroComandos, RegistroTokensUsados,
  ResultadoReservaComando,
} from '@noki/application';
import { VIGENCIA_COMANDO_MS } from '@noki/application';

export class RegistroComandosPostgres implements RegistroComandos {
  constructor(private readonly db: Kysely<unknown>) {}

  async reservar(clave: string, huella: string, ts: string): Promise<ResultadoReservaComando> {
    return this.db.transaction().execute(async tx => {
      const nueva = await sql`INSERT INTO comando_idempotente (clave, huella, estado, creado_en)
        VALUES (${clave}, ${huella}, 'EN_CURSO', ${ts})
        ON CONFLICT (clave) DO NOTHING RETURNING clave`.execute(tx);
      if (nueva.rows.length) return { estado: 'NUEVA' };
      const { rows: [actual] } = await sql<{
        huella: string; estado: string; codigo_http: number | null; respuesta: unknown; creado_en: Date;
      }>`SELECT huella, estado, codigo_http, respuesta, creado_en FROM comando_idempotente
        WHERE clave = ${clave} FOR UPDATE`.execute(tx);
      if (!actual) {
        await sql`INSERT INTO comando_idempotente (clave, huella, estado, creado_en)
          VALUES (${clave}, ${huella}, 'EN_CURSO', ${ts})`.execute(tx);
        return { estado: 'NUEVA' };
      }
      if (actual.huella !== huella) return { estado: 'HUELLA_DISTINTA' };
      if (actual.estado === 'COMPLETADA' && actual.codigo_http !== null) {
        return { estado: 'COMPLETADA', codigo: actual.codigo_http, respuesta: actual.respuesta };
      }
      if (Date.parse(ts) - actual.creado_en.getTime() <= VIGENCIA_COMANDO_MS) return { estado: 'EN_CURSO' };
      await sql`UPDATE comando_idempotente SET creado_en = ${ts} WHERE clave = ${clave}`.execute(tx);
      return { estado: 'NUEVA' };
    });
  }

  async completar(clave: string, codigo: number, respuesta: unknown): Promise<void> {
    await sql`UPDATE comando_idempotente SET estado = 'COMPLETADA', codigo_http = ${codigo},
      respuesta = ${JSON.stringify(respuesta)}::jsonb WHERE clave = ${clave} AND estado = 'EN_CURSO'`.execute(this.db);
  }

  async soltar(clave: string): Promise<void> {
    await sql`DELETE FROM comando_idempotente WHERE clave = ${clave} AND estado = 'EN_CURSO'`.execute(this.db);
  }
}

export class ConversacionesWaPostgres implements ConversacionesWa {
  constructor(private readonly db: Kysely<unknown>) {}

  async obtener(contactoId: string): Promise<unknown> {
    const { rows } = await sql<{ estado: unknown }>`SELECT estado FROM conversacion_wa
      WHERE contacto_id = ${contactoId}`.execute(this.db);
    return rows[0]?.estado ?? null;
  }

  async guardar(contactoId: string, estado: object, ts: string): Promise<void> {
    await sql`INSERT INTO conversacion_wa (contacto_id, estado, actualizado_en)
      VALUES (${contactoId}, ${JSON.stringify(estado)}::jsonb, ${ts})
      ON CONFLICT (contacto_id) DO UPDATE SET estado = EXCLUDED.estado,
      actualizado_en = EXCLUDED.actualizado_en`.execute(this.db);
  }
}

export class BandejaPostgres implements BandejaPort {
  constructor(private readonly db: Kysely<unknown>) {}

  async agregar({ id, canal, asunto, cuerpo, ts }: MensajeBandejaInterno): Promise<void> {
    await sql`INSERT INTO mensaje_bandeja (id, canal, asunto, cuerpo, creado_en)
      VALUES (${id}, ${canal}, ${asunto}, ${cuerpo}, ${ts}) ON CONFLICT (id) DO NOTHING`.execute(this.db);
  }

  async listar(): Promise<MensajeBandejaInterno[]> {
    const { rows } = await sql<Omit<MensajeBandejaInterno, 'ts'> & { creado_en: Date }>`
      SELECT id, canal, asunto, cuerpo, creado_en FROM mensaje_bandeja ORDER BY creado_en DESC, id`.execute(this.db);
    return rows.map(({ creado_en, ...mensaje }) => ({ ...mensaje, ts: creado_en.toISOString() }));
  }
}

export class RegistroTokensUsadosPostgres implements RegistroTokensUsados {
  constructor(private readonly db: Kysely<unknown>) {}

  async consumir(jti: string, expiraEn: string): Promise<boolean> {
    const { rows } = await sql`INSERT INTO token_usado (jti, expira_en) VALUES (${jti}, ${expiraEn})
      ON CONFLICT (jti) DO NOTHING RETURNING jti`.execute(this.db);
    return rows.length === 1;
  }

  async usado(jti: string): Promise<boolean> {
    const { rows } = await sql`SELECT 1 FROM token_usado WHERE jti = ${jti}`.execute(this.db);
    return rows.length === 1;
  }
}
