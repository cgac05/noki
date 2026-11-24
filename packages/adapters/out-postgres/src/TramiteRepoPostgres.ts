import { sql, type Kysely, type RawBuilder } from 'kysely';
import type { GeneradorId, TramiteRepo } from '@noki/application';
import {
  ConflictoVersion, Tramite,
  type HiloId, type PacienteId, type RegistroTiposTramite, type TramiteId, type TramiteInstantanea,
} from '@noki/domain';
import { insertarEventos } from './eventStore.ts';

const noFinalizado = sql`estado NOT IN ('ATENDIDA','CANCELADA','NO_ASISTIO','EXPIRADO')`;

export class TramiteRepoPostgres implements TramiteRepo {
  constructor(
    private readonly db: Kysely<unknown>,
    private readonly registro: RegistroTiposTramite,
    private readonly ids: GeneradorId,
  ) {}

  async obtener(id: TramiteId): Promise<Tramite | null> {
    return (await this.buscar(sql`id = ${id}`))[0] ?? null;
  }

  async abiertosPorPaciente(id: PacienteId): Promise<Tramite[]> {
    return this.buscar(sql`paciente_id = ${id} AND ${noFinalizado}`);
  }

  async abiertosPorHilo(id: HiloId): Promise<Tramite[]> {
    return this.buscar(sql`hilo_id = ${id} AND ${noFinalizado}`);
  }

  async porFolio(folio: string): Promise<Tramite | null> {
    return (await this.buscar(sql`folio_externo = ${folio}`))[0] ?? null;
  }

  async guardar(tramite: Tramite): Promise<void> {
    const instantanea = tramite.instantanea();
    const eventos = tramite.eventosPendientes();
    const esperada = tramite.versionCargada;
    await this.db.transaction().execute(async (tx) => {
      const { id, hiloId, tipo, canalOrigen } = instantanea;
      const { servicioId, sedeId, pacienteId, version, folio, ultimoCanal } = instantanea.datos;
      const ultimaActividad = eventos.at(-1)?.ts ?? null;
      const datos = JSON.stringify(instantanea);
      const estado = tramite.estado;
      const modificada = esperada === 0
        ? await sql`INSERT INTO tramite (id, hilo_id, tipo, canal_origen, datos, estado, servicio_id,
            sede_id, paciente_id, folio_externo, version, ultimo_canal, ultima_actividad)
          VALUES (${id}, ${hiloId}, ${tipo}, ${canalOrigen}, ${datos}::jsonb, ${estado}, ${servicioId ?? null},
            ${sedeId ?? null}, ${pacienteId ?? null}, ${folio ?? null}, ${version}, ${ultimoCanal},
            COALESCE(${ultimaActividad}::timestamptz, now())) ON CONFLICT (id) DO NOTHING RETURNING id`.execute(tx)
        : await sql`UPDATE tramite SET datos = ${datos}::jsonb, estado = ${estado}, canal_origen = ${canalOrigen},
            servicio_id = ${servicioId ?? null}, sede_id = ${sedeId ?? null}, paciente_id = ${pacienteId ?? null},
            folio_externo = ${folio ?? null}, version = ${version}, ultimo_canal = ${ultimoCanal},
            ultima_actividad = COALESCE(${ultimaActividad}::timestamptz, ultima_actividad)
          WHERE id = ${id} AND version = ${esperada} RETURNING id`.execute(tx);
      if (!modificada.rows.length) {
        const actual = await sql<{ version: number }>`SELECT version FROM tramite WHERE id = ${id}`.execute(tx);
        throw new ConflictoVersion(esperada, actual.rows[0]?.version ?? 0);
      }
      await insertarEventos(tx, this.ids, eventos, pacienteId);
    });
    tramite.marcarGuardado();
  }

  private async buscar(filtro: RawBuilder<unknown>): Promise<Tramite[]> {
    const { rows } = await sql<{ datos: TramiteInstantanea }>`
      SELECT datos FROM tramite WHERE ${filtro} AND datos <> '{}'::jsonb ORDER BY id
    `.execute(this.db);
    return rows.map(({ datos }) => Tramite.rehidratar(datos, this.registro));
  }
}
