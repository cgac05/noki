import { afterAll, expect, it } from 'vitest';
import { Pool } from 'pg';
import { migrar } from '../../packages/adapters/out-postgres/src/index.ts';
import { sembrar } from '../../apps/api/src/semilla/sembrar.ts';

const url = new URL(process.env['TEST_DATABASE_URL'] ?? '');
if (url.pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const admin = new Pool({ connectionString: url.toString() });
url.searchParams.set('options', '-c search_path=persistencia_incremental,public');
const pool = new Pool({ connectionString: url.toString() });

afterAll(async () => {
  await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS persistencia_incremental CASCADE');
  await admin.end();
});

it('migra una base con semilla y conserva las claves anteriores y las claves con sufijo', async () => {
  await admin.query('CREATE SCHEMA persistencia_incremental');
  expect(await migrar(url.toString(), '001_nucleo', 'persistencia_incremental')).toEqual(['001_nucleo']);
  await sembrar(url.toString());
  const base = '01234567-89ab-7def-8123-456789abcdef';
  const hiloId = '01234567-89ab-7def-8123-456789abcde0';
  await pool.query(`INSERT INTO hilo_atencion (id, contacto_id, ultimo_canal)
    SELECT $1, id, canal FROM contacto_canal ORDER BY id LIMIT 1`, [hiloId]);
  const insertarEvento = (id: string, clave: string) => pool.query(
    `INSERT INTO evento (id, hilo_id, tipo, canal, actor, nivel_auth, version, correlation_id, idempotency_key, ts)
     VALUES ($1, $2, 'TramiteIniciado', 'web', 'sistema', 0, 0, $2, $3, now())`, [id, hiloId, clave],
  );
  await insertarEvento(base, base);
  await pool.query("INSERT INTO evento_procesado (consumidor, idempotency_key) VALUES ('prueba', $1)", [base]);
  expect(await migrar(url.toString(), '002_persistencia', 'persistencia_incremental')).toEqual(['002_persistencia']);
  expect(await migrar(url.toString(), undefined, 'persistencia_incremental')).toEqual(['003_identidad']);
  expect(await migrar(url.toString(), undefined, 'persistencia_incremental')).toEqual([]);
  expect((await pool.query('SELECT count(*)::int AS total FROM paciente')).rows[0]?.total).toBeGreaterThan(0);

  const registrar = (clave: string) => pool.query(
    "INSERT INTO evento_procesado (consumidor, idempotency_key) VALUES ('prueba', $1)", [clave],
  );
  await expect(registrar(base)).rejects.toMatchObject({ code: '23505' });
  await registrar(base + ':1');
  await registrar(base + ':2');
  await expect(registrar(base + ':1')).rejects.toMatchObject({ code: '23505' });
  await expect(registrar('invalida')).rejects.toMatchObject({ code: '23514' });
  await insertarEvento('01234567-89ab-7def-8123-456789abcde1', base + ':1');
  await insertarEvento('01234567-89ab-7def-8123-456789abcde2', base + ':2');
  await expect(insertarEvento('01234567-89ab-7def-8123-456789abcde3', base))
    .rejects.toMatchObject({ code: '23505' });
});

it('acepta varias CURP nulas y rechaza una CURP duplicada', async () => {
  const insertar = (id: string, curp: string | null) => pool.query(
    'INSERT INTO paciente (id, nombre, ap_paterno, fecha_nac, sexo, curp) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, 'Ana', 'Demo', '1990-02-28', 'X', curp],
  );
  const id = (sufijo: number) => '01234567-89ab-7def-8123-456789abcd' + sufijo;
  await insertar(id(10), 'PELA900228XNTRNN04');
  await expect(insertar(id(11), 'PELA900228XNTRNN04')).rejects.toMatchObject({ code: '23505' });
  await insertar(id(12), null);
  await insertar(id(13), null);
});
