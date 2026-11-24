import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { ProveedorCliente, useContextoConsulta, useRespuestaComando } from './ProveedorCliente.tsx';
import { ClienteReal } from './real/ClienteReal.ts';
import { ClienteMock } from './mock/ClienteMock.ts';
import { GUION_FLUJO_A, IDS } from './mock/guionFlujoA.ts';
import { SocketFalso } from '../pruebas/socketFalso.ts';
import { App } from '../vistas/App.tsx';

vi.mock('qrcode', () => ({ default: { toString: vi.fn(async () => '<svg></svg>') } }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const otro = '019aff00-0000-7000-8000-000000000099';
function Contexto() {
  const contexto = useContextoConsulta(); const { recordar } = useRespuestaComando();
  return <><p>{contexto.hiloId ?? 'Sin hilo'} / {contexto.pacienteId ?? 'Sin paciente'} / {contexto.sedeId ?? 'Sin sede'}</p>
    <button onClick={() => recordar({ ...GUION_FLUJO_A[1]!.respuesta, tramite: { ...GUION_FLUJO_A[1]!.respuesta.tramite, hiloId: otro, sedeId: otro } })}>Recordar</button>
    <button onClick={contexto.actualizar}>Actualizar</button></>;
}
function preparar(dato: unknown = { hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede }, demo = true) {
  const socket = new SocketFalso();
  const peticion = vi.fn<typeof fetch>().mockImplementation(async url => Response.json(String(url).endsWith('/contexto') ? dato : GUION_FLUJO_A.find(p => p.paso.id === 'CONFIRMADA')!.lecturas.citasPaciente));
  const cliente = new ClienteReal({ fetch: peticion, demo, fabricaSocket: () => socket });
  return { cliente, peticion, socket };
}
it('comparte contextoDemo entre consumidores reales y da prioridad a la última respuesta por valor', async () => {
  const { cliente, peticion } = preparar();
  render(<ProveedorCliente cliente={cliente}><Contexto /><Contexto /></ProveedorCliente>);
  expect(await screen.findAllByText(`${IDS.hilo} / ${IDS.paciente} / ${IDS.sede}`)).toHaveLength(2);
  expect(peticion).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getAllByRole('button', { name: 'Recordar' })[0]!);
  expect(screen.getAllByText(`${otro} / ${IDS.paciente} / ${otro}`)).toHaveLength(2);
});
it.each([null, 'no disponible'])('trata %s como sin contexto y Actualizar vuelve a consultar', async caso => {
  const { cliente, peticion } = preparar({ hiloId: null, pacienteId: null, sedeId: null }, caso !== 'no disponible');
  render(<ProveedorCliente cliente={cliente}><Contexto /></ProveedorCliente>);
  await waitFor(() => expect(screen.getByText('Sin hilo / Sin paciente / Sin sede')).toBeDefined());
  if (caso === 'no disponible') expect(peticion).not.toHaveBeenCalled();
  else {
    await waitFor(() => expect(peticion).toHaveBeenCalledTimes(1));
    peticion.mockResolvedValue(Response.json({ hiloId: IDS.hilo, pacienteId: IDS.paciente, sedeId: IDS.sede }));
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByText(`${IDS.hilo} / ${IDS.paciente} / ${IDS.sede}`)).toBeDefined();
    expect(peticion).toHaveBeenCalledTimes(2);
  }
});
it('en simulado manda el guion sobre una respuesta recordada y no consulta contextoDemo', async () => {
  const cliente = new ClienteMock({ latenciaMs: 0 }); const consultar = vi.spyOn(cliente, 'consultar');
  render(<ProveedorCliente cliente={cliente}><Contexto /></ProveedorCliente>);
  await userEvent.click(screen.getByRole('button', { name: 'Recordar' }));
  expect(screen.getByText(`${IDS.hilo} / ${IDS.paciente} / ${IDS.sede}`)).toBeDefined();
  expect(consultar).not.toHaveBeenCalled();
});
it('app nueva consulta las citas del paciente de contextoDemo y un evento refresca el contexto', async () => {
  const { cliente, peticion, socket } = preparar();
  render(<ProveedorCliente cliente={cliente}><MemoryRouter><App /></MemoryRouter></ProveedorCliente>);
  expect(await screen.findByText('CONFIRMADA')).toBeDefined();
  expect(peticion.mock.calls.map(([url]) => url)).toContain(`http://localhost:4000/api/pacientes/${IDS.paciente}/citas`);
  const antes = peticion.mock.calls.filter(([url]) => String(url).endsWith('/contexto')).length;
  await act(async () => socket.recibir('admin:metricas', { citasConfirmadas: 2 }));
  await waitFor(() => expect(peticion.mock.calls.filter(([url]) => String(url).endsWith('/contexto'))).toHaveLength(antes + 1));
});
