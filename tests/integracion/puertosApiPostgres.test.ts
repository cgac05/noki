import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Pool } from 'pg';
import { RelojFalso } from '../../packages/adapters/memory/src/index.ts';
import { TokensJose } from '../../packages/adapters/out-security/src/index.ts';
import { crearRegistroTiposTramite, Tramite, type HiloId, type TramiteId } from '../../packages/domain/src/index.ts';
import {
  abrirPostgres, BandejaPostgres, ConversacionesWaPostgres, migrar, RegistroComandosPostgres,
  LecturasComandosPostgres, RegistroTokensUsadosPostgres, TramiteRepoPostgres,
} from '../../packages/adapters/out-postgres/src/index.ts';
import { probarPuertosApi } from '../unit/api/bateriaPuertosApi.ts';

const url = new URL(process.env['TEST_DATABASE_URL'] ?? '');
if (url.pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const admin = new Pool({ connectionString: url.toString() });
const esquema = 'puertos_api';
url.searchParams.set('options', '-c search_path=' + esquema + ',public');
const db = abrirPostgres(url.toString());
const pool = new Pool({ connectionString: url.toString() });

beforeAll(async () => {
  await admin.query('CREATE SCHEMA puertos_api');
  await migrar(url.toString(), undefined, esquema);
});

afterAll(async () => {
  await db.destroy();
  await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS puertos_api CASCADE');
  await admin.end();
});

it('Concurrencia con la misma clave, dos usos simultáneos y almacenamiento de API en Postgres', async () => {
  const contacto = '01937954-6c40-7000-8000-000000000052';
  await pool.query("INSERT INTO contacto_canal (id, canal, valor_externo) VALUES ($1, 'whatsapp', '5210000000009')", [contacto]);
  await probarPuertosApi(new RegistroComandosPostgres(db), new ConversacionesWaPostgres(db),
    new BandejaPostgres(db), new RegistroTokensUsadosPostgres(db), contacto);
  const reloj = new RelojFalso(new Date('2026-11-24T12:00:00Z'));
  const firmador = new TokensJose('secreto-sintetico-compartido-de-prueba', reloj, new RegistroTokensUsadosPostgres(db));
  const token = await firmador.emitir({
    jti: '01937954-6c40-7000-8000-000000000053', uso: 'CONTINUIDAD',
    tramiteId: '01937954-6c40-7000-8000-000000000054' as TramiteId,
    hiloId: '01937954-6c40-7000-8000-000000000055' as HiloId,
    metodo: 'TOKEN_CC', canalOrigen: 'callcenter', nivel: 1,
    emitidoEn: '2026-11-24T12:00:00Z', expiraEn: '2026-11-25T12:00:00Z',
  });
  const usos = await Promise.all([firmador.verificar(token), firmador.verificar(token)]);
  expect(usos.filter(Boolean)).toHaveLength(1);
});

it.each([
  { canal: 'web', actor: 'paciente', nivel: 0, metodo: 'TOKEN_WEB' },
  { canal: 'callcenter', actor: 'asesor:demo', nivel: 1, metodo: 'TOKEN_CC' },
] as const)('lee el origen y método de continuidad para $canal', async ({ canal, actor, nivel, metodo }) => {
  const hiloId = randomUUID() as HiloId;
  const contacto = randomUUID();
  const tramiteId = randomUUID() as TramiteId;
  const jti = randomUUID();
  const ts = '2026-11-24T12:00:00.000Z';
  const registro = crearRegistroTiposTramite();
  const repo = new TramiteRepoPostgres(db, registro, { nuevo: randomUUID });
  const lecturas = new LecturasComandosPostgres(db, repo);
  await pool.query('INSERT INTO contacto_canal (id, canal, valor_externo) VALUES ($1, $2, $3)', [contacto, canal, contacto]);
  await pool.query('INSERT INTO hilo_atencion (id, contacto_id, ultimo_canal) VALUES ($1, $2, $3)', [hiloId, contacto, canal]);
  const contexto = { canal, actor, nivelAuth: nivel, ts, correlationId: randomUUID(), idempotencyKey: randomUUID() };
  const tramite = Tramite.iniciar(tramiteId, hiloId, 'AGENDAR', registro, contexto);
  await repo.guardar(tramite);
  tramite.consentirContactoWa(jti, { ...contexto, idempotencyKey: randomUUID() });
  await repo.guardar(tramite);
  expect(await lecturas.datosContinuacion(hiloId, ts)).toMatchObject({ jti, tramiteId, hiloId, nivel, canalOrigen: canal, metodo });
});
