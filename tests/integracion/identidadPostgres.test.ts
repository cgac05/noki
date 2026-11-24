import { afterAll, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { TramiteVistaSchema } from '../../packages/contracts/src/index.ts';
import { CasosTramite, ResolvedorContinuidad } from '../../packages/application/src/index.ts';
import {
  AgendaExternaMemoria, AgendaMemoria, CatalogoMemoria, GeneradorIdSecuencial, RelojFalso, VerificadorTokensMemoria,
} from '../../packages/adapters/memory/src/index.ts';
import {
  abrirPostgres, ContactosPostgres, EventosSinTramitePostgres, HiloRepoPostgres, migrar, PacientesPostgres,
  RegistroIntentosPostgres, TramiteRepoPostgres,
} from '../../packages/adapters/out-postgres/src/index.ts';
import { crearRegistroTiposTramite, PoliticaIdentidad } from '../../packages/domain/src/index.ts';

const url = new URL(process.env['TEST_DATABASE_URL'] ?? '');
if (url.pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const admin = new Pool({ connectionString: url.toString() });
const esquema = 'identidad_concurrente';
url.searchParams.set('options', '-c search_path=' + esquema + ',public');
const pool = new Pool({ connectionString: url.toString() });
const db = abrirPostgres(url.toString());

afterAll(async () => {
  await db.destroy();
  await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS identidad_concurrente CASCADE');
  await admin.end();
});

it('Registro concurrente y CURP con sexo X', async () => {
  await admin.query('CREATE SCHEMA identidad_concurrente');
  await migrar(url.toString(), undefined, esquema);
  const registro = crearRegistroTiposTramite();
  const ids = new GeneradorIdSecuencial();
  const tramites = new TramiteRepoPostgres(db, registro, ids);
  const contactos = new ContactosPostgres(db);
  const pacientes = new PacientesPostgres(db);
  const intentos = new RegistroIntentosPostgres(db);
  const tokens = new VerificadorTokensMemoria();
  const resolvedor = new ResolvedorContinuidad(tramites, contactos, tokens, pacientes,
    intentos, new EventosSinTramitePostgres(db, ids));
  const casos = new CasosTramite({
    tramites, contactos, pacientes, tokens, intentos, resolvedor, registro, ids,
    hilos: new HiloRepoPostgres(db), catalogo: new CatalogoMemoria(), agenda: new AgendaMemoria(),
    agendaExterna: new AgendaExternaMemoria(), politica: new PoliticaIdentidad(),
    reloj: new RelojFalso(new Date('2026-11-24T12:00:00Z')),
  });
  const comando = () => ({
    canal: 'callcenter', actor: 'asesor:demo', nivel: 1, vinculado: false,
    factores: new Set<never>(), idempotencyKey: ids.nuevo(), correlationId: ids.nuevo(),
  } as const);
  const curp = 'PELA900228XNTRNN04';
  const solicitudes = [];
  for (const numero of ['5210000000081', '5210000000082']) {
    const { tramite } = await casos.iniciar('AGENDAR', numero, comando());
    await casos.identificarPaciente(tramite.id, { paso: 'DESTINATARIO', para: 'OTRA_PERSONA' }, numero, comando());
    const pendiente = await casos.identificarPaciente(tramite.id, { paso: 'CURP', curp }, numero, comando());
    const vista = TramiteVistaSchema.parse(pendiente.tramite);
    expect(vista).not.toHaveProperty('identificacion');
    expect(JSON.stringify(vista)).not.toContain(curp);
    solicitudes.push({ id: tramite.id, numero });
  }
  const registrar = pacientes.registrar.bind(pacientes);
  let intentosRegistro = 0;
  let liberar: () => void = () => {};
  const ambos = new Promise<void>(resolver => { liberar = resolver; });
  vi.spyOn(pacientes, 'registrar').mockImplementation(async (...args) => {
    intentosRegistro++;
    if (intentosRegistro === 2) liberar();
    await ambos;
    return registrar(...args);
  });
  const resultados = await Promise.all(solicitudes.map(({ id, numero }) =>
    casos.identificarPaciente(id, { paso: 'DATOS', nombre: 'Ana', apellidoPaterno: 'Pérez', apellidoMaterno: 'Luna' },
      numero, comando())));
  expect(intentosRegistro).toBe(2);
  const existentes = await pool.query('SELECT id, sexo, curp_base FROM paciente WHERE curp = $1', [curp]);
  expect(existentes.rows).toEqual([{ id: resultados[0]?.tramite.pacienteId, sexo: 'X', curp_base: null }]);
  expect(resultados[1]?.tramite.pacienteId).toBe(resultados[0]?.tramite.pacienteId);
  expect(resultados.flatMap(({ eventos }) => eventos).filter(({ tipo }) => tipo === 'PacienteRegistrado')).toHaveLength(1);
  const vinculados = await pool.query('SELECT nivel, relacion, metodo FROM vinculo');
  expect(vinculados.rows).toEqual(Array.from({ length: 2 }, () => ({
    nivel: 0, relacion: 'FAMILIAR', metodo: 'FLOW_DECLARADO',
  })));
});
