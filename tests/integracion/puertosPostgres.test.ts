import { afterAll, expectTypeOf, it } from 'vitest';
import { Pool } from 'pg';
import { abrirPostgres, CatalogoPostgres, ContactosPostgres, HiloRepoPostgres, migrar, PacientesPostgres } from '../../packages/adapters/out-postgres/src/index.ts';
import type { PacienteId } from '../../packages/domain/src/index.ts';
import { contacto, datos, hilo, paciente, probarPuertos, sede, servicio } from '../unit/persistencia/bateriaPuertos.ts';

const url = process.env['TEST_DATABASE_URL'] ?? '';
if (new URL(url).pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const db = abrirPostgres(url);
const pool = new Pool({ connectionString: url });

afterAll(async () => {
  try {
    await pool.query('DELETE FROM vinculo WHERE contacto_id = $1', [contacto]);
    await pool.query('UPDATE contacto_canal SET hilo_id = NULL WHERE id = $1', [contacto]);
    await pool.query('DELETE FROM hilo_atencion WHERE id = $1', [hilo]);
    await pool.query('DELETE FROM contacto_canal WHERE id = $1', [contacto]);
    await pool.query('DELETE FROM paciente WHERE id = $1', [paciente]);
    await pool.query('DELETE FROM oferta_sede WHERE sede_id = $1', [sede]);
    await pool.query('DELETE FROM sede WHERE id = $1', [sede]);
    await pool.query('DELETE FROM servicio WHERE id = $1', [servicio]);
  } finally {
    await db.destroy();
    await pool.end();
  }
});

it('cumple la misma batería de los puertos en Postgres sin devolver datos personales en búsquedas', async () => {
  await migrar(url);
  await pool.query('INSERT INTO paciente (id,nombre,ap_paterno,fecha_nac,sexo) VALUES ($1,$2,$3,$4,$5)',
    [paciente, datos.nombre, datos.apellidoPaterno, datos.fechaNac, datos.sexo]);
  await pool.query("INSERT INTO servicio (id,codigo,nombre,categoria,perfil) VALUES ($1,$2,'Prueba','ESTUDIO',$3)",
    [servicio, servicio, { tipo: 'ESTUDIO' }]);
  await pool.query("INSERT INTO sede (id,nombre,ciudad,lat,lng,zona_horaria,horario) VALUES ($1,'Prueba','Prueba',0,0,'America/Mazatlan','{}')", [sede]);
  await pool.query("INSERT INTO oferta_sede (sede_id,servicio_id,precio_centavos,modo_agenda) VALUES ($1,$2,6200,'HORARIO')", [sede, servicio]);
  const pacientes = new PacientesPostgres(db);
  expectTypeOf(pacientes.coincideFechaNac).returns.toEqualTypeOf<Promise<boolean>>();
  expectTypeOf(pacientes.buscarPorDatos).returns.toEqualTypeOf<Promise<PacienteId[]>>();
  await probarPuertos({ pacientes, catalogo: new CatalogoPostgres(db), hilos: new HiloRepoPostgres(db), contactos: new ContactosPostgres(db) });
});
