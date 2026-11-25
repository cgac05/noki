import { it } from 'vitest';
import { Pool } from 'pg';
import { componerComandos } from '../../apps/api/src/componerComandos.ts';
import { crearApi } from '../../apps/api/src/crearApi.ts';
import { idDemo, PACIENTES_DEMO } from '../../apps/api/src/semilla/datosDemo.ts';
import { sembrar } from '../../apps/api/src/semilla/sembrar.ts';
import { crearSdMock } from '../../apps/sd-mock/src/index.ts';
import { migrar } from '../../packages/adapters/out-postgres/src/index.ts';
import { RUTAS_CONSULTAS } from '../../packages/contracts/src/index.ts';
import { comprobarIdempotenciaWa } from '../unit/api/bateriaIdempotenciaWa.ts';

it('reserva y reproduce la respuesta de WhatsApp con eventos únicos en Postgres', async () => {
  const url = new URL(process.env['TEST_DATABASE_URL'] ?? '');
  if (url.pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
  const esquema = 'idempotencia_wa';
  const admin = new Pool({ connectionString: url.toString() });
  url.searchParams.set('options', '-c search_path=' + esquema + ',public');
  const databaseUrl = url.toString();
  const pool = new Pool({ connectionString: databaseUrl });
  const sd = crearSdMock(false);
  const sdMockUrl = await sd.listen({ host: '127.0.0.1', port: 0 });
  const deps = componerComandos({
    databaseUrl, sdMockUrl, tokenSecret: 'secreto-sintetico-de-integracion-de-32-bytes', demo: true,
  }, () => {});
  const app = crearApi({
    databaseUrl, redisUrl: process.env['REDIS_URL']!, logger: false,
    comandos: deps, consultas: deps.consultas, whatsapp: deps.whatsapp,
  });
  try {
    await admin.query('CREATE SCHEMA idempotencia_wa');
    await migrar(databaseUrl, undefined, esquema);
    await sembrar(databaseUrl);
    const fecha = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mazatlan', dateStyle: 'short' })
      .format(new Date(deps.reloj.ahora().getTime() + 86_400_000));
    const ana = PACIENTES_DEMO[0];
    await comprobarIdempotenciaWa({ app, ids: deps.ids }, {
      waId: ana.wa, pacienteId: ana.id, sedeId: idDemo(1), servicioId: idDemo(10), inicio: fecha + 'T16:00:00.000Z',
      codigoContinuacion: async hiloId => {
        const respuesta = await app.inject({ url: '/api/hilos/' + hiloId + '/ficha' });
        return RUTAS_CONSULTAS.fichaHilo.respuesta.parse(respuesta.json()).codigoContinuacion;
      },
      eventos: async tramiteId => {
        const { rows } = await pool.query<{ tipo: string; idempotencyKey: string; correlationId: string }>(
          'SELECT tipo, idempotency_key AS "idempotencyKey", correlation_id AS "correlationId" FROM evento WHERE tramite_id = $1 ORDER BY id',
          [tramiteId],
        );
        return rows;
      },
    });
  } finally {
    await app.close();
    await deps.cerrar();
    await sd.close();
    await pool.end();
    await admin.query('DROP SCHEMA IF EXISTS idempotencia_wa CASCADE');
    await admin.end();
  }
});
