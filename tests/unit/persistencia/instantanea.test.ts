import { expect, it } from 'vitest';
import {
  CANALES, CASILLAS, Tramite, crearRegistroTiposTramite, siguientePregunta,
  type ContextoOperacion, type HiloId, type PacienteId, type PerfilServicio,
  type ReservaId, type SedeId, type ServicioId, type TramiteId, type TramiteInstantanea,
} from '../../../packages/domain/src/index.ts';

it('rehidrata una instantánea JSON sin modificar casillas, estado ni versión', () => {
  const registro = crearRegistroTiposTramite();
  const contexto: ContextoOperacion = {
    canal: 'callcenter', actor: 'asesor:prueba', nivelAuth: 1,
    correlationId: 'prueba', idempotencyKey: 'prueba', ts: '2026-11-24T12:00:00Z',
  };
  const perfil: PerfilServicio = {
    tipo: 'ESTUDIO', requisitos: [], modoAgenda: 'HORARIO', requiereProfesional: false,
    duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 10,
    limiteCambiosHoras: 24, anticipacionMinimaHoras: 0, recordatorios: [],
  };
  const tramite = Tramite.iniciar('tramite' as TramiteId, 'hilo' as HiloId, 'AGENDAR', registro, contexto);
  tramite.asignarPaciente('paciente' as PacienteId, contexto);
  tramite.seleccionarServicio('servicio' as ServicioId, perfil, null, contexto);
  tramite.seleccionarSede('sede' as SedeId, { precioCentavos: 5000, vigenteHasta: '2026-11-25T12:00:00Z' }, contexto);
  tramite.apartar({
    reservaId: 'reserva' as ReservaId, inicio: '2026-11-25T13:00:00Z', expiraEn: '2026-11-24T12:10:00Z',
  }, contexto);
  tramite.confirmar('12345678', contexto);
  const ultimaActividad = '2026-11-24T12:03:00Z';
  tramite.retomar({ ...contexto, canal: 'whatsapp', ts: ultimaActividad }, 'TOKEN_CC');
  const datos = JSON.parse(JSON.stringify(tramite.instantanea())) as TramiteInstantanea;
  const recuperado = Tramite.rehidratar(datos, registro);
  expect(recuperado.instantanea()).toEqual(tramite.instantanea());
  expect(recuperado.estado).toBe('CONFIRMADA');
  expect(recuperado.versionCargada).toBe(tramite.version);
  expect(recuperado.horario).toEqual(tramite.horario);
  expect(recuperado.folio).toBe('12345678');
  expect(recuperado.canalOrigen).toBe('callcenter');
  expect(recuperado.ultimoCanal).toBe('whatsapp');
  expect(recuperado.ultimaActividad).toBe(ultimaActividad);
  expect(datos.datos.ultimaActividad).toBe(ultimaActividad);
  expect(recuperado.eventosPendientes()).toEqual([]);
  expect(tramite.eventosPendientes().length).toBeGreaterThan(0);
  for (const casilla of CASILLAS) expect(recuperado.casillaLlena(casilla)).toBe(tramite.casillaLlena(casilla));
  for (const canal of CANALES) expect(siguientePregunta(recuperado, canal, registro)).toEqual(siguientePregunta(tramite, canal, registro));
});
