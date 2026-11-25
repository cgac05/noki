import { expect, it, vi } from 'vitest';
import { EstimarRiesgoInasistencia, type ModeloRiesgo } from '../../../packages/application/src/index.ts';
import { crearRegistroTiposTramite, FACTORES_RIESGO, Tramite, type TramiteInstantanea, type TramiteId, type HiloId, type SedeId, type PacienteId, type ReservaId } from '../../../packages/domain/src/index.ts';
import {
  CalendarioSedeMemoria, LecturasPrediccionMemoria, ModeloRiesgoMemoria, RelojFalso, TramiteRepoMemoria,
} from '../../../packages/adapters/memory/src/index.ts';

const inicio = '2026-12-11T19:30:00.000Z';
const ahora = '2026-12-01T12:00:00.000Z';
const datos: TramiteInstantanea = {
  id: 'cita' as TramiteId, hiloId: 'hilo' as HiloId, tipo: 'AGENDAR', canalOrigen: 'web',
  datos: {
    version: 0, ultimaActividad: ahora, fase: 'CONFIRMADA', sedeId: 'sede' as SedeId, pacienteId: 'paciente' as PacienteId,
    horario: { inicio, reservaId: 'reserva' as ReservaId, expiraEn: inicio }, requisitos: [], ultimoCanal: 'web',
    perfil: {
      tipo: 'CONSULTA', requisitos: [], modoAgenda: 'HORARIO', requiereProfesional: false,
      duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 10, limiteCambiosHoras: 24,
      anticipacionMinimaHoras: 0, recordatorios: [],
    },
  },
};

async function preparar(
  modelo: ModeloRiesgo = new ModeloRiesgoMemoria(0.43),
  fase: NonNullable<TramiteInstantanea['datos']['fase']> = 'CONFIRMADA',
  zona: string | null = 'America/Mazatlan',
) {
  const tramite = Tramite.rehidratar({ ...datos, datos: { ...datos.datos, fase } }, crearRegistroTiposTramite());
  const repo = new TramiteRepoMemoria();
  await repo.guardar(tramite);
  const cargado = (await repo.obtener(tramite.id))!;
  vi.spyOn(repo, 'obtener').mockResolvedValue(cargado);
  const guardar = vi.spyOn(repo, 'guardar');
  const lecturas = new LecturasPrediccionMemoria();
  if (zona) lecturas.registrarZona(datos.datos.sedeId!, zona);
  const registrarError = vi.fn();
  const caso = new EstimarRiesgoInasistencia({
    tramites: repo, reloj: new RelojFalso(new Date(ahora)), modelo, lecturas,
    calendario: new CalendarioSedeMemoria(), registrarError,
  });
  return { cargado, guardar, registrarError, ejecutar: () => caso.ejecutar(tramite.id, 'correlacion') };
}

it('estima la cita confirmada sin escribir ni cambiar su versión o eventos', async () => {
  const { cargado, guardar, ejecutar } = await preparar();
  const { version } = cargado;
  const eventos = cargado.eventosPendientes();
  const resultado = await ejecutar();
  expect(resultado).toEqual({
    tramiteId: datos.id, probabilidad: 0.43, nivel: 'ALTO', origen: 'MODELO',
    versionModelo: 'memoria@1', estimadoEn: ahora,
  });
  expect(await ejecutar()).toEqual(resultado);
  expect(guardar).not.toHaveBeenCalled();
  expect(cargado.version).toBe(version);
  expect(cargado.eventosPendientes()).toEqual(eventos);
});

it('rechaza la cita sin confirmar', async () => {
  const { ejecutar } = await preparar(undefined, 'HORARIO_RESERVADO');
  await expect(ejecutar()).rejects.toMatchObject({ regla: 'RIESGO_SOLO_CITA_CONFIRMADA' });
});

it('rechaza la sede sin zona', async () => {
  const { ejecutar } = await preparar(undefined, undefined, null);
  await expect(ejecutar()).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO', entidad: 'sede' });
});

it.each([new Error('dato que no se debe registrar'), NaN])('respalda un resultado fallido del modelo', async (valor) => {
  const { ejecutar, registrarError } = await preparar(new ModeloRiesgoMemoria(valor));
  await expect(ejecutar()).resolves.toMatchObject({ origen: 'REGLAS', versionModelo: 'reglas@1', nivel: 'BAJO' });
  expect(registrarError).toHaveBeenCalledExactlyOnceWith({
    correlation_id: 'correlacion', codigo: 'MODELO_RIESGO_FALLIDO',
  });
});

it.each(['America/Mazatlan', 'America/Bahia_Banderas'])('envía al modelo la hora local de %s', async (zona) => {
  const estimar = vi.fn<ModeloRiesgo['estimar']>(async () => ({ probabilidad: 0.427, versionModelo: 'prueba' }));
  const { ejecutar } = await preparar({ estimar }, undefined, zona);
  await expect(ejecutar()).resolves.toMatchObject({ probabilidad: 0.43 });
  const vector = estimar.mock.calls[0]![0];
  expect(vector[FACTORES_RIESGO.indexOf('franjaTarde')]).toBe(1);
  expect(vector[FACTORES_RIESGO.indexOf('finDeSemana')]).toBe(0);
  const local = new CalendarioSedeMemoria().local(inicio, zona);
  expect(local).toEqual({ fecha: '2026-12-11', hora: zona === 'America/Mazatlan' ? 12 : 13, minuto: 30, diaSemana: 5 });
});
