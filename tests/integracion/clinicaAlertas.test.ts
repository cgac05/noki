import { it } from 'vitest';
import { Pool } from 'pg';
import { comprobarClinica } from '../unit/api/bateriaClinica.ts';
import { abrirPostgres, EventosSinTramitePostgres, migrar } from '../../packages/adapters/out-postgres/src/index.ts';
import { componerComandos } from '../../apps/api/src/componerComandos.ts';
import { crearSdMock } from '../../apps/sd-mock/src/index.ts';
import { sembrar } from '../../apps/api/src/semilla/sembrar.ts';
import { idDemo, PACIENTES_DEMO } from '../../apps/api/src/semilla/datosDemo.ts';
import type { PacienteId, SedeId, ServicioId } from '../../packages/domain/src/index.ts';

it('calcula posiciones por orden de llegada y limita alertas en Postgres', async () => {
  const url = new URL(process.env['TEST_DATABASE_URL'] ?? '');
  if (url.pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
  const esquema = 'clinica_alertas';
  const admin = new Pool({ connectionString: url.toString() });
  url.searchParams.set('options', '-c search_path=' + esquema + ',public');
  const databaseUrl = url.toString();
  const sd = crearSdMock(false);
  const sdMockUrl = await sd.listen({ host: '127.0.0.1', port: 0 });
  const deps = componerComandos({
    databaseUrl, sdMockUrl, tokenSecret: 'secreto-sintetico-de-integracion-de-32-bytes', demo: true,
  }, () => {});
  const db = abrirPostgres(databaseUrl);
  try {
    await admin.query('CREATE SCHEMA clinica_alertas');
    await migrar(databaseUrl, undefined, esquema);
    await sembrar(databaseUrl);
    await comprobarClinica(deps, new EventosSinTramitePostgres(db, deps.ids), {
      sedeId: idDemo(1) as SedeId, servicioId: idDemo(10) as ServicioId, pacienteId: PACIENTES_DEMO[0].id as PacienteId,
    });
  } finally {
    await db.destroy();
    await deps.cerrar();
    await sd.close();
    await admin.query('DROP SCHEMA IF EXISTS clinica_alertas CASCADE');
    await admin.end();
  }
});
