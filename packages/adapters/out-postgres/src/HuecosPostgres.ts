import { sql, type Kysely, type RawBuilder } from 'kysely';
import type { GeneradorId, HuecosRepo } from '@noki/application';
import { ConflictoVersion, Hueco, type HuecoInstantanea, type OfertaHueco, type ReservaId, type Tramite } from '@noki/domain';
import { insertarEventos } from './eventStore.ts';
import type { TramiteRepoPostgres } from './TramiteRepoPostgres.ts';

type FilaHueco = Omit<HuecoInstantanea, 'ofertas' | 'inicio' | 'creadoEn'> & { inicio: Date; creadoEn: Date };
type FilaOferta = Omit<OfertaHueco, 'enviadaEn' | 'expiraEn'> & { enviadaEn: Date; expiraEn: Date };

export class HuecosPostgres implements HuecosRepo {
  constructor(private readonly db: Kysely<unknown>, private readonly ids: GeneradorId,
    private readonly tramites: TramiteRepoPostgres) {}

  porOrigen(id: ReservaId): Promise<Hueco | null> { return this.buscar(sql`h.origen_reserva_id = ${id}`); }
  porOferta(id: string): Promise<Hueco | null> {
    return this.buscar(sql`h.id = (SELECT hueco_id FROM oferta_hueco WHERE id = ${id})`);
  }

  async conOferta<T>(id: string, ejecutar: () => Promise<T>): Promise<T> {
    return this.db.transaction().execute(async tx => {
      await sql`SELECT pg_advisory_xact_lock(hashtextextended(hueco_id::text, 0))
        FROM oferta_hueco WHERE id = ${id}`.execute(tx);
      return ejecutar();
    });
  }

  guardar(hueco: Hueco): Promise<boolean> {
    return this.db.transaction().execute(tx => this.guardarEn(tx, hueco));
  }

  async guardarAdelanto(hueco: Hueco, tramite: Tramite): Promise<boolean> {
    try {
      const guardado = await this.db.transaction().execute(async tx => {
        if (!await this.guardarEn(tx, hueco)) return false;
        await this.tramites.guardarEn(tx, tramite);
        await sql`UPDATE interes_adelanto SET estado = 'CUMPLIDO' WHERE tramite_id = ${tramite.id}`.execute(tx);
        return true;
      });
      if (guardado) tramite.marcarGuardado();
      return guardado;
    } catch (error) {
      if (error instanceof ConflictoVersion) return false;
      throw error;
    }
  }

  private async guardarEn(tx: Kysely<unknown>, agregado: Hueco): Promise<boolean> {
    const { id, origenReservaId, servicioId, estado, estrategia, creadoEn, version, ofertas } = agregado.instantanea();
    const anterior = agregado.versionCargada;
    const cambio = anterior === 0
      ? await sql`INSERT INTO hueco (id, origen_reserva_id, servicio_id, estado, estrategia, creado_en, version)
          VALUES (${id}, ${origenReservaId}, ${servicioId}, ${estado}, ${estrategia}, ${creadoEn}, ${version})
          ON CONFLICT (origen_reserva_id) DO NOTHING RETURNING id`.execute(tx)
      : await sql`UPDATE hueco SET estado = ${estado}, version = ${version}
          WHERE id = ${id} AND version = ${anterior} RETURNING id`.execute(tx);
    if (!cambio.rows.length) return false;
    for (const o of ofertas) {
      await sql`INSERT INTO oferta_hueco (id, hueco_id, interes_id, estado, enviada_en, expira_en, token_jti, contacto_id)
        VALUES (${o.id}, ${id}, ${o.interesId}, ${o.estado}, ${o.enviadaEn}, ${o.expiraEn}, ${o.tokenJti}, ${o.contactoId})
        ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado`.execute(tx);
    }
    for (const evento of agregado.eventosPendientes()) {
      const { rows } = await sql<{ paciente_id: string | null }>`SELECT paciente_id FROM tramite WHERE id = ${evento.tramiteId}`.execute(tx);
      await insertarEventos(tx, this.ids, [evento], rows[0]?.paciente_id ?? undefined);
    }
    return true;
  }

  private async buscar(filtro: RawBuilder<unknown>): Promise<Hueco | null> {
    return this.db.transaction().setIsolationLevel('repeatable read').execute(async tx => {
      const { rows: [hueco] } = await sql<FilaHueco>`
        SELECT h.id, h.origen_reserva_id AS "origenReservaId", h.servicio_id AS "servicioId", h.estado,
          h.estrategia, h.creado_en AS "creadoEn", h.version, r.inicio, r.sede_id AS "sedeId",
          r.recurso_id AS "recursoId", t.id AS "tramiteId", t.hilo_id AS "hiloId"
        FROM hueco h JOIN reserva r ON r.id = h.origen_reserva_id JOIN tramite t ON t.id = r.tramite_id
        WHERE ${filtro}`.execute(tx);
      if (!hueco) return null;
      const { rows } = await sql<FilaOferta>`
        SELECT o.id, o.interes_id AS "interesId", o.estado, o.enviada_en AS "enviadaEn", o.expira_en AS "expiraEn",
          o.token_jti AS "tokenJti", o.contacto_id AS "contactoId", i.tramite_id AS "tramiteId", t.hilo_id AS "hiloId"
        FROM oferta_hueco o JOIN interes_adelanto i ON i.id = o.interes_id JOIN tramite t ON t.id = i.tramite_id
        WHERE o.hueco_id = ${hueco.id} ORDER BY o.enviada_en, o.id`.execute(tx);
      return Hueco.rehidratar({ ...hueco, inicio: hueco.inicio.toISOString(), creadoEn: hueco.creadoEn.toISOString(),
        ofertas: rows.map(o => ({ ...o, enviadaEn: o.enviadaEn.toISOString(), expiraEn: o.expiraEn.toISOString() })) });
    });
  }
}
