import { expect, it, vi } from 'vitest';
import { AprobacionCancelacion } from '../../../packages/application/src/index.ts';
import { RegistroTokensUsadosMemoria, RelojFalso, TokensBotonWaMemoria } from '../../../packages/adapters/memory/src/index.ts';
import { crearRegistroTiposTramite, Tramite, type HiloId, type PacienteId, type TramiteId } from '../../../packages/domain/src/index.ts';

const waId = '5210000000001';
const otroWaId = '5210000000002';
const contacto = { id: 'contacto-ana', valor: waId, canal: 'whatsapp' as const, hiloId: 'hilo' as HiloId };
const ts = '2026-11-25T15:00:00.000Z';

function preparar(demo = true) {
  const reloj = new RelojFalso(new Date(ts));
  const tokens = new TokensBotonWaMemoria(reloj, new RegistroTokensUsadosMemoria(), demo);
  const pacienteId = 'ana' as PacienteId;
  const inicio = Tramite.iniciar('tramite' as TramiteId, contacto.hiloId, 'AGENDAR', crearRegistroTiposTramite(), {
    ts, canal: 'app', actor: 'paciente', nivelAuth: 0, idempotencyKey: 'clave', correlationId: 'correlacion',
  });
  const datos = inicio.instantanea();
  const tramite = Tramite.rehidratar({ ...datos, datos: { ...datos.datos, fase: 'CONFIRMADA', pacienteId } }, crearRegistroTiposTramite());
  const cita = { tramite, servicio: 'Ultrasonido', sede: 'Tepic', zonaHoraria: 'America/Mazatlan', inicio: ts };
  const enviar = vi.fn();
  const cancelar = vi.fn();
  const caso = new AprobacionCancelacion({
    demo, reloj, tokens, ids: { nuevo: () => 'jti' },
    contactoVigente: async id => id === pacienteId ? contacto : null,
    buscarContacto: async numero => numero === waId ? contacto : { ...contacto, id: 'otro-contacto', valor: numero },
    leerCita: async () => cita, cancelar, notificador: { enviar },
    mensaje: () => '¿Confirmas que quieres cancelar tu cita de Ultrasonido en Tepic del miércoles a las 08:00?',
  });
  return { caso, tramite, enviar, cancelar };
}

it('envía la aprobación al WhatsApp del dueño de la cita y solo ese número puede aprobar una vez', async () => {
  const { caso, tramite, enviar, cancelar } = preparar();
  await caso.solicitar(tramite);
  expect(enviar).toHaveBeenCalledWith(waId, [{ texto: expect.stringContaining('Ultrasonido'),
    botones: [{ titulo: 'Sí, cancelar', payload: expect.any(String) }, { titulo: 'No, conservarla', payload: expect.any(String) }] }]);
  const payload = enviar.mock.calls[0]?.[1][0].botones[0].payload as string;
  expect(await caso.responder(otroWaId, payload, 'clave', 'correlacion')).toBeNull();
  expect(cancelar).not.toHaveBeenCalled();
  expect(await caso.responder(waId, payload, 'clave', 'correlacion')).toBe('CANCELADA');
  expect(cancelar).toHaveBeenCalledWith(tramite.id, expect.objectContaining({ vinculado: true, factores: new Set(['BOTON_APROBACION']) }));
  expect(await caso.responder(waId, payload, 'clave', 'correlacion')).toBeNull();
});

it('conserva la cita e invalida la opción de cancelar del mismo mensaje', async () => {
  const { caso, tramite, enviar, cancelar } = preparar();
  await caso.solicitar(tramite);
  const botones = enviar.mock.calls[0]?.[1][0].botones as [{ payload: string }, { payload: string }];
  expect(await caso.responder(waId, botones[1].payload, 'clave', 'correlacion')).toBe('CONSERVADA');
  expect(await caso.responder(waId, botones[0].payload, 'clave', 'correlacion')).toBeNull();
  expect(cancelar).not.toHaveBeenCalled();
});

it('fuera de demo no envía ni acepta una aprobación', async () => {
  const { caso, tramite, enviar, cancelar } = preparar(false);
  await caso.solicitar(tramite);
  expect(await caso.responder(waId, 'boton', 'clave', 'correlacion')).toBeNull();
  expect(enviar).not.toHaveBeenCalled();
  expect(cancelar).not.toHaveBeenCalled();
});
