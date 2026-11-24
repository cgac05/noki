import { expect, expectTypeOf, it } from 'vitest';
import { RelojFalso } from '../../../packages/adapters/memory/src/index.ts';
import type { PayloadsEvento } from '../../../packages/domain/src/index.ts';
import { Tramite, crearRegistroTiposTramite, type ContextoOperacion, type HiloId, type TramiteId, type PacienteId, type ServicioId, type SedeId, type PerfilServicio, type ReservaId } from '../../../packages/domain/src/index.ts';

const contexto: ContextoOperacion = {
  canal: 'callcenter', actor: 'asesor:demo', nivelAuth: 1,
  correlationId: 'demo', idempotencyKey: 'inicio', ts: '2026-11-24T12:00:00Z',
};
const perfil: PerfilServicio = {
  tipo: 'ESTUDIO', modoAgenda: 'HORARIO', requiereProfesional: false,
  requisitos: [], duracionMin: 30, ttlReservaMin: 10, toleranciaMin: 5,
  limiteCambiosHoras: 24, anticipacionMinimaHoras: 0, recordatorios: [],
};
const pacienteId = 'paciente' as PacienteId;
const servicioId = 'servicio' as ServicioId;
const sedeId = 'sede' as SedeId;
const cotizacion = { precioCentavos: 5500, vigenteHasta: '2026-11-25T12:00:00Z' };
const reserva = { reservaId: 'reserva' as ReservaId, inicio: '2026-11-25T18:00:00Z', expiraEn: '2026-11-24T12:10:00Z' };
const iniciar = () => Tramite.iniciar('tramite' as TramiteId, 'hilo' as HiloId, 'AGENDAR', crearRegistroTiposTramite(), contexto);

it('acepta paciente antes que servicio y cotiza con una versión por operación', () => {
  const tramite = iniciar();
  tramite.asignarPaciente(pacienteId, contexto);
  tramite.seleccionarServicio(servicioId, perfil, null, contexto);
  const anterior = tramite.version;
  tramite.seleccionarSede(sedeId, cotizacion, { ...contexto, idempotencyKey: 'sede' });
  expect(tramite.estado).toBe('LISTO_PARA_RESERVAR');
  expect(tramite.version).toBe(anterior + 1);
  expect(tramite.eventosPendientes().slice(-2)).toMatchObject([
    { tipo: 'SedeSeleccionada', version: anterior + 1, idempotencyKey: 'sede:1' },
    { tipo: 'CotizacionGenerada', version: anterior + 1, idempotencyKey: 'sede:2' },
  ]);
});

it('queda cotizado sin paciente y elimina la sede al cambiar a un servicio que no ofrece', () => {
  const tramite = iniciar();
  tramite.seleccionarSede(sedeId, null, contexto);
  tramite.seleccionarServicio(servicioId, perfil, cotizacion, contexto);
  expect(tramite.estado).toBe('COTIZADO');
  tramite.seleccionarServicio('otro' as ServicioId, perfil, null, contexto);
  expect(tramite.estado).toBe('BORRADOR');
  expect(tramite.casillaLlena('sede')).toBe(false);
});

it('queda listo con advertencia de elegibilidad y los eventos no contienen datos sensibles', () => {
  const tramite = iniciar();
  tramite.seleccionarServicio(servicioId, { ...perfil, elegibilidad: { edadMin: 30 } }, null, contexto);
  tramite.seleccionarSede(sedeId, cotizacion, contexto);
  tramite.asignarPaciente(pacienteId, contexto, { sexo: 'F', fechaNac: '2010-03-07' });
  expect(tramite.estado).toBe('LISTO_PARA_RESERVAR');
  expect(tramite.casillaLlena('elegibilidad')).toBe(false);
  tramite.reconocerElegibilidad(contexto);
  expect(tramite.casillaLlena('elegibilidad')).toBe(true);
  expect(JSON.stringify(tramite.eventosPendientes())).not.toMatch(/fechaNac|sexo|2010-03-07/);
  expectTypeOf<keyof PayloadsEvento['PacienteAsignado']>().toEqualTypeOf<'pacienteId'>();
  expectTypeOf<keyof PayloadsEvento['RequisitoCumplido']>().toEqualTypeOf<'requisitoId'>();
});

it('rechaza apartar con casillas pendientes y permite el flujo completo', () => {
  const tramite = iniciar();
  tramite.seleccionarServicio(servicioId, perfil, null, contexto);
  tramite.seleccionarSede(sedeId, cotizacion, contexto);
  const anterior = tramite.version;
  expect(() => tramite.apartar(reserva, contexto)).toThrow(expect.objectContaining({
    regla: 'CASILLAS_PENDIENTES',
  }));
  expect(() => tramite.registrarLlegada(contexto)).toThrow(expect.objectContaining({ de: 'COTIZADO' }));
  expect(tramite.version).toBe(anterior);
  tramite.asignarPaciente(pacienteId, contexto);
  tramite.apartar(reserva, contexto);
  tramite.expirarHold({ ...contexto, ts: reserva.expiraEn });
  expect(tramite.estado).toBe('LISTO_PARA_RESERVAR');
  expect(tramite.casillaLlena('horario')).toBe(false);
  tramite.apartar(reserva, contexto);
  tramite.confirmar('12345678', contexto);
  expect(() => tramite.expirarPorInactividad(contexto)).toThrow(expect.objectContaining({ de: 'CONFIRMADA' }));
  tramite.registrarLlegada(contexto);
  tramite.cerrarAtencion(contexto);
  expect(tramite.estado).toBe('ATENDIDA');
  expect(tramite.eventosPendientes().slice(-4).map(({ tipo }) => tipo)).toEqual([
    'HorarioReservado', 'CitaConfirmada', 'PacienteLlego', 'AtencionCerrada',
  ]);
});

it('registra 30 horas de anticipación al cancelar y rechaza confirmar un hold vencido', () => {
  const reloj = new RelojFalso(new Date(contexto.ts));
  const tramite = iniciar();
  tramite.seleccionarServicio(servicioId, perfil, null, contexto);
  tramite.seleccionarSede(sedeId, cotizacion, contexto);
  tramite.asignarPaciente(pacienteId, contexto);
  tramite.apartar(reserva, contexto);
  reloj.adelantar(600_000);
  expect(() => tramite.confirmar('12345678', { ...contexto, ts: reloj.ahora().toISOString() })).toThrow();
  reloj.fijar(new Date(contexto.ts));
  const operacion = { ...contexto, ts: reloj.ahora().toISOString() };
  tramite.confirmar('12345678', operacion);
  tramite.cancelar(operacion);
  expect(tramite.eventosPendientes().at(-1)).toMatchObject({
    tipo: 'CitaCancelada', payload: { anticipacionHoras: 30 },
  });
});

it('expira por inactividad antes de confirmar', () => {
  const tramite = iniciar();
  tramite.expirarPorInactividad(contexto);
  expect(tramite.estado).toBe('EXPIRADO');
  expect(tramite.eventosPendientes().at(-1)?.tipo).toBe('TramiteExpirado');
});
