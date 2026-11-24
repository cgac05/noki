import { CasosTramite, ResolvedorContinuidad, type ContextoComando } from '../../packages/application/src/index.ts';
import { Tramite, PoliticaIdentidad, crearRegistroTiposTramite, type HiloId, type PacienteId, type PerfilServicio } from '../../packages/domain/src/index.ts';
import { CatalogoMemoria, ContactosMemoria, EventosSinTramiteMemoria, HiloRepoMemoria, PacientesMemoria, RegistroIntentosMemoria, RelojFalso, VerificadorTokensMemoria } from '../../packages/adapters/memory/src/index.ts';
import { AgendaExternaSd } from '../../packages/adapters/out-sd/src/index.ts';
import { crearSdMock } from '../../apps/sd-mock/src/index.ts';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { abrirPostgres, AgendaPostgres, migrar, TramiteRepoPostgres } from '../../packages/adapters/out-postgres/src/index.ts';
import type { ReservaId, RecursoId, SedeId, ServicioId, TramiteId } from '../../packages/domain/src/index.ts';

const url = process.env['TEST_DATABASE_URL'] ?? '';
if (new URL(url).pathname !== '/noki_test') throw new Error('La prueba requiere noki_test.');
const pool = new Pool({ connectionString: url, max: 10 });
const db = abrirPostgres(url);
const agenda = new AgendaPostgres(db);
const sedeId = randomUUID() as SedeId;
const recursoId = randomUUID() as RecursoId;
const servicioId = randomUUID() as ServicioId;
const contacto = randomUUID();
const hilo = randomUUID() as HiloId;
const paciente = randomUUID() as PacienteId;

afterAll(async () => {
  try {
    await pool.query('DELETE FROM reserva WHERE sede_id = $1', [sedeId]);
    await pool.query('DELETE FROM outbox WHERE evento_id IN (SELECT id FROM evento WHERE hilo_id = $1)', [hilo]);
    await pool.query('DELETE FROM evento WHERE hilo_id = $1', [hilo]);
    await pool.query('DELETE FROM tramite WHERE hilo_id = $1', [hilo]);
    await pool.query('DELETE FROM paciente WHERE id = $1', [paciente]);
    await pool.query('DELETE FROM servicio WHERE id = $1', [servicioId]);
    await pool.query('DELETE FROM hilo_atencion WHERE id = $1', [hilo]);
    await pool.query('DELETE FROM contacto_canal WHERE id = $1', [contacto]);
    await pool.query('DELETE FROM recurso WHERE id = $1', [recursoId]);
    await pool.query('DELETE FROM sede WHERE id = $1', [sedeId]);
  } finally { await db.destroy(); await pool.end(); }
});

beforeAll(async () => {
  await migrar(url);
  await pool.query("INSERT INTO sede VALUES ($1, 'Prueba', 'Prueba', 0, 0, 'America/Mazatlan', '{}')", [sedeId]);
  await pool.query("INSERT INTO recurso VALUES ($1, $2, 'SALA', ARRAY[$3]::uuid[])", [recursoId, sedeId, servicioId]);
  await pool.query("INSERT INTO contacto_canal (id, canal, valor_externo) VALUES ($1, 'web', $2)", [contacto, contacto]);
  await pool.query("INSERT INTO hilo_atencion (id, contacto_id, ultimo_canal) VALUES ($1, $2, 'web')", [hilo, contacto]);
  await pool.query("INSERT INTO servicio (id, codigo, nombre, categoria, perfil) VALUES ($1, $2, 'Prueba', 'ESTUDIO', '{}')", [servicioId, servicioId]);
  await pool.query("INSERT INTO paciente (id, nombre, ap_paterno, fecha_nac, sexo) VALUES ($1, 'Prueba', 'Ficticio', '2000-01-01', 'F')", [paciente]);
});

it('acepta uno de 50 intentos concurrentes por el mismo horario y recupera el hold vencido', async () => {
  const ids = Array.from({ length: 50 }, () => randomUUID() as TramiteId);
  await pool.query("INSERT INTO tramite (id, hilo_id, tipo, estado, ultimo_canal) SELECT unnest($1::uuid[]), $2, 'AGENDAR', 'BORRADOR', 'web'", [ids, hilo]);
  const campos = { sedeId, servicioId, inicio: '2026-12-01T16:00:00Z', ts: '2026-12-01T15:00:00Z', ttlReservaMin: 10 };
  const resultados = await Promise.allSettled(ids.map((tramiteId) => agenda.apartar({ ...campos, tramiteId, reservaId: randomUUID() as ReservaId })));
  const ganadores = resultados.filter((resultado) => resultado.status === 'fulfilled');
  expect(ganadores).toHaveLength(1);
  for (const resultado of resultados) if (resultado.status === 'rejected') {
    expect(resultado.reason).toMatchObject({ regla: 'HORARIO_NO_DISPONIBLE' });
  }
  const original = ganadores[0]?.value;
  if (!original || !ids[0]) throw new Error('Falta la reserva.');
  const activos = await pool.query("SELECT id FROM reserva WHERE sede_id = $1 AND estado = 'APARTADA'", [sedeId]);
  expect(activos.rows).toEqual([{ id: original.reservaId }]);
  const nueva = await agenda.apartar({
    ...campos, recursoId, ts: original.expiraEn, tramiteId: ids[0], reservaId: randomUUID() as ReservaId,
  });
  expect((await pool.query('SELECT estado FROM reserva WHERE id = $1', [original.reservaId])).rows).toEqual([{ estado: 'EXPIRADA' }]);
  await expect(agenda.confirmar(original.reservaId, '80000000', original.expiraEn)).rejects.toMatchObject({ regla: 'HORARIO_NO_DISPONIBLE' });
  await agenda.confirmar(nueva.reservaId, '80000000', original.expiraEn);
  await agenda.confirmar(nueva.reservaId, '80000000', original.expiraEn);
  expect((await pool.query('SELECT estado, folio FROM reserva WHERE id = $1', [nueva.reservaId])).rows).toEqual([{ estado: 'CONFIRMADA', folio: '80000000' }]);
});

it('confirma la saga con Postgres y sd-mock y libera la reserva tras un conflicto', async () => {
  const sd = crearSdMock(false);
  try {
    const endpoint = await sd.listen({ host: '127.0.0.1', port: 0 });
    const agendaExterna = new AgendaExternaSd(endpoint);
    const registro = crearRegistroTiposTramite();
    const generador = { nuevo: randomUUID };
    const tramites = new TramiteRepoPostgres(db, registro, generador);
    const contactos = new ContactosMemoria();
    const pacientes = new PacientesMemoria();
    const tokens = new VerificadorTokensMemoria();
    const intentos = new RegistroIntentosMemoria();
    const resolvedor = new ResolvedorContinuidad(tramites, contactos, tokens, pacientes,
      intentos, new EventosSinTramiteMemoria());
    const reloj = new RelojFalso(new Date('2026-11-24T12:00:00Z'));
    const casos = new CasosTramite({
      tramites, hilos: new HiloRepoMemoria(), contactos, tokens, pacientes, catalogo: new CatalogoMemoria(),
      agenda, agendaExterna, reloj, ids: generador, politica: new PoliticaIdentidad(), registro, resolvedor, intentos,
    });
    const comando = (): ContextoComando => ({
      actor: 'asesor:demo', canal: 'callcenter', nivel: 1, vinculado: false, factores: new Set(),
      correlationId: randomUUID(), idempotencyKey: randomUUID(),
    });
    const contexto = () => ({
      actor: 'asesor:demo', canal: 'callcenter', nivelAuth: 1, ts: reloj.ahora().toISOString(),
      correlationId: randomUUID(), idempotencyKey: randomUUID(),
    } as const);
    const perfil: PerfilServicio = {
      tipo: 'ESTUDIO', requisitos: [], modoAgenda: 'HORARIO', requiereProfesional: false,
      duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 10, limiteCambiosHoras: 24,
      anticipacionMinimaHoras: 0, recordatorios: [],
    };
    const listo = async (inicio: string) => {
      const id = randomUUID() as TramiteId;
      const tramite = Tramite.iniciar(id, hilo, 'AGENDAR', registro, contexto());
      tramite.asignarPaciente(paciente, contexto());
      tramite.seleccionarServicio(servicioId, perfil, null, contexto());
      tramite.seleccionarSede(sedeId, { precioCentavos: 5000, vigenteHasta: '2026-12-02T00:00:00Z' }, contexto());
      await tramites.guardar(tramite);
      return casos.reservar(id, inicio, comando(), recursoId);
    };
    const primero = await listo('2026-11-25T13:00:00Z');
    const confirmado = await casos.confirmar(primero.tramite.id, comando());
    expect(confirmado.tramite.folio).toMatch(/^\d{8,9}$/);
    expect((await tramites.obtener(primero.tramite.id))?.estado).toBe('CONFIRMADA');
    const segundo = await listo('2026-11-25T14:00:00Z');
    const cancelar = vi.spyOn(agendaExterna, 'cancelarCita');
    const registrar = agendaExterna.registrarCita.bind(agendaExterna);
    vi.spyOn(agendaExterna, 'registrarCita').mockImplementationOnce(async (...args) => {
      const folio = await registrar(...args);
      const actual = await tramites.obtener(segundo.tramite.id);
      if (!actual) throw new Error('Falta el trámite.');
      actual.retomar({ ...contexto(), canal: 'whatsapp' }, 'TOKEN_CC');
      await tramites.guardar(actual);
      return folio;
    });
    await expect(casos.confirmar(segundo.tramite.id, comando())).rejects.toMatchObject({ codigo: 'CONFLICTO_VERSION' });
    expect(cancelar).toHaveBeenCalledOnce();
    const fila = await pool.query('SELECT estado FROM reserva WHERE id = $1', [segundo.tramite.horario?.reservaId]);
    expect(fila.rows).toEqual([{ estado: 'CANCELADA' }]);
  } finally { await sd.close(); }
});
