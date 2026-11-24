import { afterAll, beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migrar, abrirPostgres, particionEvento, TramiteRepoPostgres } from '../../packages/adapters/out-postgres/src/index.ts';
import {
  CANALES, Tramite, crearRegistroTiposTramite, siguientePregunta,
  type ContextoOperacion, type HiloId, type PacienteId,
  type PerfilServicio, type SedeId, type ServicioId, type TramiteId,
} from '../../packages/domain/src/index.ts';

const url = process.env['TEST_DATABASE_URL'] ?? '';
if (new URL(url).pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const pool = new Pool({ connectionString: url });
const db = abrirPostgres(url);
const registro = crearRegistroTiposTramite();
const repositorio = new TramiteRepoPostgres(db, registro, { nuevo: randomUUID });
const hilo = randomUUID() as HiloId;
const contacto = randomUUID();
const paciente = randomUUID() as PacienteId;
const servicio = randomUUID() as ServicioId;
const sede = randomUUID() as SedeId;
const perfil: PerfilServicio = {
  tipo: 'ESTUDIO', requisitos: [], modoAgenda: 'HORARIO', requiereProfesional: false,
  elegibilidad: { edadMin: 30 }, duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 10,
  limiteCambiosHoras: 24, anticipacionMinimaHoras: 0, recordatorios: [],
};
const contexto = (idempotencyKey = randomUUID() as string): ContextoOperacion => ({
  correlationId: randomUUID(), idempotencyKey,
  canal: 'callcenter', actor: 'asesor:prueba', nivelAuth: 1, ts: '2026-11-24T12:00:00Z',
});
const nuevo = (operacion = contexto()) => Tramite.iniciar(randomUUID() as TramiteId, hilo, 'AGENDAR', registro, operacion);
const cotizacion = { precioCentavos: 7800, vigenteHasta: '2026-11-25T12:00:00Z' };

beforeAll(async () => {
  await migrar(url);
  await pool.query("INSERT INTO contacto_canal (id,canal,valor_externo) VALUES ($1,'callcenter',$2)", [contacto, contacto]);
  await pool.query("INSERT INTO hilo_atencion (id,contacto_id,ultimo_canal) VALUES ($1,$2,'callcenter')", [hilo, contacto]);
  await pool.query("INSERT INTO paciente (id,nombre,ap_paterno,fecha_nac,sexo) VALUES ($1,'Prueba','Ficticia','2010-01-01','F')", [paciente]);
  await pool.query("INSERT INTO servicio (id,codigo,nombre,categoria,perfil) VALUES ($1,$2,'Prueba','ESTUDIO',$3)", [servicio, servicio, perfil]);
  await pool.query("INSERT INTO sede (id,nombre,ciudad,lat,lng,zona_horaria,horario) VALUES ($1,'Prueba','Prueba',0,0,'America/Mazatlan','{}')", [sede]);
});

afterAll(async () => {
  try {
    await pool.query('DELETE FROM outbox WHERE evento_id IN (SELECT id FROM evento WHERE hilo_id = $1)', [hilo]);
    await pool.query('DELETE FROM evento WHERE hilo_id = $1', [hilo]);
    await pool.query('DELETE FROM tramite WHERE hilo_id = $1', [hilo]);
    await pool.query('DELETE FROM hilo_atencion WHERE id = $1', [hilo]);
    await pool.query('DELETE FROM contacto_canal WHERE id = $1', [contacto]);
    await pool.query('DELETE FROM paciente WHERE id = $1', [paciente]);
    await pool.query('DELETE FROM servicio WHERE id = $1', [servicio]);
    await pool.query('DELETE FROM sede WHERE id = $1', [sede]);
  } finally {
    await pool.end();
    await db.destroy();
  }
});

const filas = async (id: TramiteId) => (await pool.query(
  'SELECT tipo, idempotency_key, particion, publicado_en FROM evento JOIN outbox ON evento.id = evento_id WHERE tramite_id = $1 ORDER BY idempotency_key', [id],
)).rows;

it('guarda instantánea, eventos y outbox, y conserva la partición por paciente o hilo', async () => {
  const tramite = nuevo();
  await repositorio.guardar(tramite);
  expect(await filas(tramite.id)).toMatchObject([{ particion: particionEvento(undefined, hilo) }]);
  tramite.seleccionarServicio(servicio, perfil, null, contexto());
  tramite.asignarPaciente(paciente, contexto(), { fechaNac: '2010-01-01', sexo: 'F' });
  const sedeClave = randomUUID();
  tramite.seleccionarSede(sede, cotizacion, contexto(sedeClave));
  await repositorio.guardar(tramite);
  expect(tramite.eventosPendientes()).toEqual([]);
  const recuperado = await repositorio.obtener(tramite.id);
  if (!recuperado) throw new Error('Falta el trámite guardado.');
  expect(recuperado.instantanea()).toEqual(tramite.instantanea());
  expect(recuperado.advertenciaElegibilidad).toBeDefined();
  for (const canal of CANALES) expect(siguientePregunta(recuperado, canal, registro)).toEqual(siguientePregunta(tramite, canal, registro));
  const eventos = (await filas(tramite.id)).filter((fila) => String(fila.idempotency_key).startsWith(sedeClave));
  expect(eventos).toEqual([
    { tipo: 'SedeSeleccionada', idempotency_key: sedeClave + ':1', particion: particionEvento(paciente, hilo), publicado_en: null },
    { tipo: 'CotizacionGenerada', idempotency_key: sedeClave + ':2', particion: particionEvento(paciente, hilo), publicado_en: null },
  ]);
});

it('revierte toda la operación al encontrar una clave de evento repetida', async () => {
  const tramite = nuevo();
  await repositorio.guardar(tramite);
  const version = tramite.version;
  const clave = randomUUID();
  tramite.seleccionarServicio(servicio, perfil, null, contexto(clave));
  tramite.asignarPaciente(paciente, contexto(clave), { fechaNac: '2010-01-01', sexo: 'F' });
  await expect(repositorio.guardar(tramite)).rejects.toBeDefined();
  expect((await repositorio.obtener(tramite.id))?.version).toBe(version);
  expect(await filas(tramite.id)).toHaveLength(1);
  expect(tramite.eventosPendientes()).toHaveLength(2);
});

it('acepta una sola escritura concurrente de la misma versión', async () => {
  const tramite = nuevo();
  await repositorio.guardar(tramite);
  const [primero, segundo] = await Promise.all([repositorio.obtener(tramite.id), repositorio.obtener(tramite.id)]);
  if (!primero || !segundo) throw new Error('Falta el trámite guardado.');
  primero.seleccionarSede(sede, null, contexto());
  segundo.expirarPorInactividad(contexto());
  const resultados = await Promise.allSettled([repositorio.guardar(primero), repositorio.guardar(segundo)]);
  expect(resultados.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
  expect(resultados.find(({ status }) => status === 'rejected')).toMatchObject({
    reason: { codigo: 'CONFLICTO_VERSION', esperada: 1, actual: 2 },
  });
  expect(await filas(tramite.id)).toHaveLength(2);
});
