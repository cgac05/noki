import { expect, it, vi } from 'vitest';
import { AceptarOfertaHueco } from '../../packages/application/src/index.ts';
import {
  Hueco, Tramite, crearRegistroTiposTramite, type ContextoOperacion, type HiloId, type RecursoId,
  type ReservaId, type SedeId, type ServicioId, type TramiteId,
} from '../../packages/domain/src/index.ts';
import { RelojFalso } from '../../packages/adapters/memory/src/index.ts';

const ts = '2026-11-25T15:00:00.000Z';
const contexto: ContextoOperacion = { ts, canal: 'whatsapp', actor: 'paciente', nivelAuth: 1,
  idempotencyKey: 'clave', correlationId: 'correlacion' };
const origen = {
  id: 'hueco', tramiteId: 'ana' as TramiteId, hiloId: 'hilo-ana' as HiloId,
  sedeId: 'tepic' as SedeId, recursoId: 'sala' as RecursoId, servicioId: 'ultrasonido' as ServicioId,
  origenReservaId: 'reserva-ana' as ReservaId, inicio: '2026-11-27T16:00:00.000Z',
};
const reservaAnterior = 'reserva-beto' as ReservaId;
const reservaNueva = 'reserva-nueva' as ReservaId;

function preparar() {
  const registro = crearRegistroTiposTramite();
  const borrador = Tramite.iniciar('beto' as TramiteId, 'hilo-beto' as HiloId, 'AGENDAR', registro, contexto).instantanea();
  const tramite = Tramite.rehidratar({ ...borrador, datos: { ...borrador.datos, fase: 'CONFIRMADA', folio: 'folio-anterior',
    horario: { reservaId: reservaAnterior, inicio: '2026-12-04T16:00:00.000Z', expiraEn: ts },
  } }, registro);
  const hueco = Hueco.detectar(origen, contexto);
  hueco.ofrecer({ id: 'oferta', interesId: 'interes', tokenJti: 'jti', contactoId: 'contacto-beto', tramiteId: tramite.id, hiloId: tramite.hiloId,
    expiraEn: '2026-11-25T15:15:00.000Z' }, contexto);
  const apartar = vi.fn().mockResolvedValue({ reservaId: reservaNueva, expiraEn: '2026-11-25T15:05:00.000Z' });
  const confirmar = vi.fn().mockResolvedValue(undefined);
  const liberar = vi.fn().mockResolvedValue(undefined);
  const registrarCita = vi.fn().mockResolvedValue('folio-nuevo');
  const cancelarCita = vi.fn().mockResolvedValue(undefined);
  const guardar = vi.fn().mockResolvedValue(true);
  const expirar = vi.fn().mockResolvedValue(undefined);
  const casos = new AceptarOfertaHueco({
    demo: true, ids: { nuevo: () => reservaNueva }, reloj: new RelojFalso(new Date(ts)),
    agenda: { apartar, confirmar, liberar }, agendaExterna: { registrarCita, cancelarCita },
    guardar, expirar, perder: async () => undefined, buscar: async () => ({ hueco, tramite, contactoId: 'contacto-beto' }),
  });
  return { casos, tramite, hueco, guardar, liberar, registrarCita, cancelarCita, expirar, apartar };
}

it('guarda el adelanto antes de liberar la reserva anterior de Beto', async () => {
  const { casos, tramite, hueco, guardar, liberar, cancelarCita } = preparar();
  expect(await casos.ejecutar('oferta', 'contacto-beto', contexto)).toBe('ACEPTADA');
  expect(hueco.estado).toBe('ASIGNADO');
  expect(tramite.horario?.reservaId).toBe(reservaNueva);
  expect(guardar).toHaveBeenCalledWith(hueco, tramite);
  expect(liberar).toHaveBeenCalledWith(reservaAnterior);
  expect(cancelarCita).toHaveBeenCalledWith('folio-anterior', contexto.correlationId);
  expect(guardar.mock.invocationCallOrder[0]).toBeLessThan(liberar.mock.invocationCallOrder[0] ?? 0);
});

it('compensa el fallo externo y conserva la cita original', async () => {
  const { casos, tramite, guardar, liberar, registrarCita, expirar } = preparar();
  registrarCita.mockRejectedValueOnce(new Error('Fallo sintético'));
  expect(await casos.ejecutar('oferta', 'contacto-beto', contexto)).toBe('EXPIRADA');
  expect(liberar).toHaveBeenCalledExactlyOnceWith(reservaNueva);
  expect(guardar).not.toHaveBeenCalled();
  expect(expirar).toHaveBeenCalledOnce();
  expect(tramite.horario?.reservaId).toBe(reservaAnterior);
  expect(tramite.folio).toBe('folio-anterior');
});

it('rechaza una oferta de otro contacto antes de apartar', async () => {
  const { casos, apartar } = preparar();
  expect(await casos.ejecutar('oferta', 'otro-contacto', contexto)).toBeNull();
  expect(apartar).not.toHaveBeenCalled();
});
