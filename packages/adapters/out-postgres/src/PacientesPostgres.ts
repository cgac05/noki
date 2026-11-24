import { sql, type Kysely } from 'kysely';
import type { DatosDeclarados, DatosRegistroPaciente, PacientesPort } from '@noki/application';
import type { DatosElegibilidad, PacienteId } from '@noki/domain';

export class PacientesPostgres implements PacientesPort {
  constructor(private readonly db: Kysely<unknown>) {}

  async buscarPorCurp(curp: string): Promise<PacienteId | undefined> {
    const { rows } = await sql<{ id: PacienteId }>`SELECT id FROM paciente WHERE curp = ${curp}`.execute(this.db);
    return rows[0]?.id;
  }

  async buscarPorCurpBase(base: string): Promise<PacienteId[]> {
    const { rows } = await sql<{ id: PacienteId }>`SELECT id FROM paciente
      WHERE curp IS NULL AND curp_base = ${base} ORDER BY id`.execute(this.db);
    return rows.map(({ id }) => id);
  }

  async baseDe(id: PacienteId): Promise<string | undefined> {
    const { rows } = await sql<{ base: string | null }>`SELECT curp_base AS base FROM paciente WHERE id = ${id}`.execute(this.db);
    return rows[0]?.base ?? undefined;
  }

  async registrar(id: PacienteId, datos: DatosRegistroPaciente): Promise<boolean> {
    const { nombre, apellidoPaterno, apellidoMaterno, fechaNac, sexo, entidadNacimiento, curp, curpBase } = datos;
    const { rows } = await sql`INSERT INTO paciente (id, nombre, ap_paterno, ap_materno, fecha_nac, sexo, entidad_nac, curp, curp_base)
      VALUES (${id}, ${nombre}, ${apellidoPaterno}, ${apellidoMaterno ?? null}, ${fechaNac}, ${sexo},
        ${entidadNacimiento ?? null}, ${curp ?? null}, ${curpBase ?? null})
      ON CONFLICT (curp) WHERE curp IS NOT NULL DO NOTHING RETURNING id`.execute(this.db);
    return rows.length === 1;
  }

  async completarCurp(id: PacienteId, curp: string): Promise<boolean> {
    try {
      const { rows } = await sql`UPDATE paciente SET curp = ${curp}
        WHERE id = ${id} AND (curp IS NULL OR curp = ${curp}) RETURNING id`.execute(this.db);
      return rows.length === 1;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return false;
      throw error;
    }
  }

  async datosElegibilidad(id: PacienteId): Promise<DatosElegibilidad | undefined> {
    const { rows } = await sql<DatosElegibilidad>`SELECT sexo, to_char(fecha_nac, 'YYYY-MM-DD') AS "fechaNac"
      FROM paciente WHERE id = ${id}`.execute(this.db);
    return rows[0];
  }

  async coincideFechaNac(id: PacienteId, fechaNac: string): Promise<boolean> {
    const { rows } = await sql<{ coincide: boolean }>`SELECT EXISTS (SELECT 1 FROM paciente
      WHERE id = ${id} AND to_char(fecha_nac, 'YYYY-MM-DD') = ${fechaNac}) AS coincide`.execute(this.db);
    return rows[0]?.coincide ?? false;
  }

  async buscarPorDatos(datos: DatosDeclarados): Promise<PacienteId[]> {
    const { nombre, apellidoPaterno, apellidoMaterno, fechaNac } = datos;
    const { rows } = await sql<{ id: PacienteId }>`SELECT id FROM paciente
      WHERE lower(btrim(nombre)) = lower(btrim(${nombre}::text))
        AND lower(btrim(ap_paterno)) = lower(btrim(${apellidoPaterno}::text))
        AND lower(btrim(coalesce(ap_materno, ''))) = lower(btrim(${apellidoMaterno ?? ''}::text))
        AND to_char(fecha_nac, 'YYYY-MM-DD') = ${fechaNac}
      ORDER BY id`.execute(this.db);
    return rows.map(({ id }) => id);
  }
}
