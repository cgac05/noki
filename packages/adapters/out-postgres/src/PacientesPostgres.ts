import { sql, type Kysely } from 'kysely';
import type { DatosDeclarados, PacientesPort } from '@noki/application';
import type { DatosElegibilidad, PacienteId } from '@noki/domain';

export class PacientesPostgres implements PacientesPort {
  constructor(private readonly db: Kysely<unknown>) {}

  async datosElegibilidad(id: PacienteId): Promise<DatosElegibilidad | undefined> {
    const { rows } = await sql<DatosElegibilidad>`SELECT sexo, to_char(fecha_nac, 'YYYY-MM-DD') AS "fechaNac"
      FROM paciente WHERE id = ${id} AND sexo IN ('F', 'M')`.execute(this.db);
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
