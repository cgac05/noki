import { expect, it } from 'vitest';
import {
  Hueco, Tramite, candidatoCompatible, elegirEstrategia, ordenarCandidatos,
  crearRegistroTiposTramite, TransicionInvalida,
  type ContextoOperacion, type HiloId, type RecursoId, type ReservaId, type SedeId,
  type ServicioId, type TramiteId,
} from '../../packages/domain/src/index.ts';

const ts = '2026-11-25T15:00:00.000Z';
const inicio = '2026-11-25T20:00:00.000Z';
const siguiente = '2026-11-26T15:00:00.000Z';
const citaActualInicio = '2026-12-02T20:00:00.000Z';
const contexto: ContextoOperacion = {
  ts, canal: 'whatsapp', actor: 'sistema', nivelAuth: 0, correlationId: 'correlacion', idempotencyKey: 'operacion',
};
const origen = { tramiteId: 'tramite' as TramiteId, hiloId: 'hilo' as HiloId };
const hueco = { id: 'hueco', ...origen, sedeId: 'sede' as SedeId, recursoId: 'recurso' as RecursoId,
  servicioId: 'servicio' as ServicioId, origenReservaId: 'anterior' as ReservaId, inicio };
const interes = { estado: 'ACTIVO' as const, servicioId: hueco.servicioId, sedesAceptadas: [hueco.sedeId],
  ventanaDesde: ts, ventanaHasta: citaActualInicio, citaActualInicio, requisitosCubiertos: true,
  recursoCompatible: true, registradoEn: ts };
const historial = { horaLocal: 9, enviadasEn: [] as string[] };

it('filtra el ayuno y las citas que no se adelantarían', () => {
  expect(candidatoCompatible(hueco, interes, { anticipacionMinimaHoras: 5 }, ts, historial)).toBe(true);
  expect(candidatoCompatible(hueco, interes, { anticipacionMinimaHoras: 8 }, ts, historial)).toBe(false);
  expect(candidatoCompatible(hueco, { ...interes, citaActualInicio: inicio }, { anticipacionMinimaHoras: 5 }, ts, historial)).toBe(false);
});

it('aplica el silencio de la sede y el límite de tres ofertas en siete días', () => {
  const compatible = (horaLocal: number, enviadasEn: string[] = []) =>
    candidatoCompatible(hueco, interes, { anticipacionMinimaHoras: 5 }, ts, { horaLocal, enviadasEn });
  expect(compatible(23)).toBe(false);
  expect(compatible(6)).toBe(false);
  expect(compatible(7)).toBe(true);
  expect(compatible(22)).toBe(false);
  expect(compatible(9, [ts, ts, ts])).toBe(false);
  expect(compatible(9, [ts, ts, '2026-11-17T15:00:00.000Z'])).toBe(true);
});

it('ordena por registro y utiliza el umbral de 24 horas', () => {
  const posterior = { ...interes, registradoEn: inicio };
  expect(ordenarCandidatos([posterior, interes])).toEqual([interes, posterior]);
  expect(elegirEstrategia(inicio, ts)).toBe('OLEADA');
  expect(elegirEstrategia(siguiente, ts)).toBe('SECUENCIAL');
});

it('asigna un único ganador y emite eventos en el hilo que corresponde', () => {
  const agregado = Hueco.detectar(hueco, contexto);
  const oferta = { interesId: 'interes', tokenJti: 'jti', contactoId: 'contacto-beto', expiraEn: inicio,
    tramiteId: 'candidato' as TramiteId, hiloId: 'otro-hilo' as HiloId };
  agregado.ofrecer({ ...oferta, id: 'primera' }, contexto);
  agregado.ofrecer({ ...oferta, id: 'segunda', interesId: 'otro-interes' }, contexto);
  agregado.asignar('primera', contexto);
  expect(agregado.estado).toBe('ASIGNADO');
  expect(agregado.ofertas.map(o => o.estado)).toEqual(['ACEPTADA', 'PERDIDA']);
  expect(agregado.eventosPendientes()).toContainEqual(expect.objectContaining({ tipo: 'HuecoAsignado', ...origen }));
  expect(agregado.eventosPendientes()).toContainEqual(expect.objectContaining({ tipo: 'OfertaPerdida', hiloId: oferta.hiloId }));
  expect(() => agregado.asignar('segunda', contexto)).toThrow();
});

it('permite rechazar, expirar y declarar desierto sin asignación', () => {
  const agregado = Hueco.detectar(hueco, contexto);
  const oferta = { ...origen, interesId: 'interes', tokenJti: 'jti', contactoId: 'contacto-beto', expiraEn: inicio };
  agregado.ofrecer({ ...oferta, id: 'rechazo' }, contexto);
  agregado.ofrecer({ ...oferta, id: 'expiracion', interesId: 'otro-interes' }, contexto);
  agregado.cerrarOferta('rechazo', 'RECHAZADA', contexto);
  agregado.cerrarOferta('expiracion', 'EXPIRADA', { ...contexto, ts: inicio });
  agregado.declararDesierto(contexto);
  expect(agregado.estado).toBe('DESIERTO');
  expect(agregado.ofertas.map(o => o.estado)).toEqual(['RECHAZADA', 'EXPIRADA']);
});

it('adelanta una cita confirmada sin cambiar su estado público', () => {
  const registro = crearRegistroTiposTramite();
  const borrador = Tramite.iniciar(origen.tramiteId, origen.hiloId, 'AGENDAR', registro, contexto);
  const horario = { reservaId: 'nueva' as ReservaId, inicio, expiraEn: siguiente };
  expect(() => borrador.adelantar(horario, 'nuevo', contexto)).toThrow(TransicionInvalida);
  const instantanea = borrador.instantanea();
  const tramite = Tramite.rehidratar({ ...instantanea, datos: { ...instantanea.datos, fase: 'CONFIRMADA',
    horario: { ...horario, reservaId: hueco.origenReservaId, inicio: citaActualInicio }, folio: 'anterior' } }, registro);
  tramite.adelantar(horario, 'nuevo', contexto);
  expect(tramite.estado).toBe('CONFIRMADA');
  expect(tramite.version).toBe(instantanea.datos.version + 1);
  expect(tramite.horario).toEqual(horario);
  expect(tramite.folio).toBe('nuevo');
  expect(tramite.eventosPendientes()).toEqual([expect.objectContaining({ tipo: 'CitaAdelantada', payload: {
    reservaAnteriorId: hueco.origenReservaId, reservaId: horario.reservaId, diasAdelantados: 7,
  } })]);
});
