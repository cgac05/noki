import { expect, it } from 'vitest';
import { ClienteMock } from './mock/ClienteMock.ts';
import { GUION_FLUJO_A } from './mock/guionFlujoA.ts';
import { CONTACTO_DEMO } from './ClienteApi.ts';

async function verificar() {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  for (const paso of GUION_FLUJO_A.slice(1)) {
    if (paso.espera?.tipo === 'comando') await cliente.enviarComando(paso.espera.comando);
    else if (paso.espera?.tipo === 'comandos') for (const comando of paso.espera.comandos) await cliente.enviarComando(comando);
    else if (paso.espera?.tipo === 'wa') await cliente.enviarMensajeWa(paso.espera.mensaje);
    if (paso.paso.id === 'VERIFICACION') break;
  }
  return cliente;
}
it('rechaza la llamada sin ANI o con otro número y conserva el paso', async () => {
  const cliente = new ClienteMock({ latenciaMs: 0 });
  for (const payload of [{ tipoTramite: 'AGENDAR' as const }, { tipoTramite: 'AGENDAR' as const, contacto: '5210000000002' }]) {
    await expect(cliente.enviarComando({ canal: 'callcenter', actor: 'asesor:asesor1', tipo: 'IniciarTramite', payload })).rejects.toMatchObject({ tipo: 'NO_DISPONIBLE', mensaje: GUION_FLUJO_A[0]!.ayuda });
    expect(cliente.demo.paso().id).toBe('INICIO');
  }
});
it('mantiene versiones, números y consentimiento coherentes al insertar la continuación', () => {
  const solicitud = GUION_FLUJO_A.find(p => p.paso.id === 'CONTINUACION_SOLICITADA')!;
  expect(solicitud.respuesta.tramite.estado).toBe('COTIZADO');
  expect(solicitud.respuesta.eventos).toContainEqual(expect.objectContaining({ tipo: 'ConsentimientoContactoWA', canal: 'callcenter' }));
  for (const [indice, paso] of GUION_FLUJO_A.entries()) {
    expect(paso.paso.numero).toBe(indice + 1); expect(paso.paso.total).toBe(GUION_FLUJO_A.length);
    if (indice > 0) expect(paso.respuesta.tramite.version).toBeGreaterThan(GUION_FLUJO_A[indice - 1]!.respuesta.tramite.version);
  }
});
it('Verificación con Flow: pide fecha protegida y habilita confirmar sin repetir los valores', async () => {
  const cliente = await verificar(); const paso = GUION_FLUJO_A.find(p => p.paso.id === 'VERIFICACION')!;
  expect(paso.mensajes).toContainEqual(expect.objectContaining({ tipo: 'flow', campos: [{ id: 'fechaNac', etiqueta: 'Fecha de nacimiento', captura: 'sensitive', requerido: true }] }));
  const respuesta = await cliente.enviarMensajeWa({ waId: CONTACTO_DEMO, flowResponse: { fechaNac: '2000-01-02' } });
  expect(respuesta.mensajes).toContainEqual(expect.objectContaining({ tipo: 'botones', botones: [expect.objectContaining({ titulo: 'Confirmar cita' })] }));
  expect(JSON.stringify(respuesta)).not.toContain('2000-01-02'); expect(cliente.demo.paso().id).not.toBe('VERIFICACION');
});
it('Flow incompleto: responde con ayuda y no avanza con el requerido vacío', async () => {
  const cliente = await verificar();
  const respuesta = await cliente.enviarMensajeWa({ waId: CONTACTO_DEMO, flowResponse: { fechaNac: '  ' } });
  expect(respuesta.mensajes[0]?.tipo).toBe('texto'); expect(cliente.demo.paso().id).toBe('VERIFICACION');
});
